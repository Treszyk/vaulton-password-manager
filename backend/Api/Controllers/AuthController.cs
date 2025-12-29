using Api.DTOs.Auth;
using Api.DTOs.Crypto;
using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Core.Crypto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService auth, IWebHostEnvironment env) : ControllerBase
{
	private readonly IAuthService _auth = auth;
	private readonly IWebHostEnvironment _env = env;
	private const string RefreshCookieName = "Vaulton.Refresh";
	private CookieOptions RefreshCookieOptions(DateTime expiresUtc)
	=> new()
	{
		HttpOnly = true,
		Secure = !_env.IsDevelopment(),
		SameSite = SameSiteMode.Strict,
		Expires = new DateTimeOffset(expiresUtc),
		Path = "/" // Works for Swagger (/auth/...) and frontend (/api/auth/...) via proxy/Caddy
	};

	[HttpPost("pre-register")]
	[EnableRateLimiting("AuthPolicy")]
	public async Task<ActionResult<PreRegisterResponse>> PreRegister()
	{
		var accountId = await _auth.PreRegisterAsync();
		return Ok(new PreRegisterResponse(accountId, 1)); // hardcoded V1 CryptoSchemaVer
	}

	[HttpPost("register")]
	[EnableRateLimiting("AuthPolicy")]
	public async Task<ActionResult<RegisterResponse>> Register([FromBody] RegisterRequest request)
	{
		var mkWrapPwd = request.MkWrapPwd.ToDomain();

		EncryptedValue? mkWrapRk = request.MkWrapRk?.ToDomain();

		var cmd = new RegisterCommand(
			request.AccountId,
			request.Verifier,
			request.AdminVerifier,
			request.S_Pwd,
			(KdfMode)request.KdfMode,
			mkWrapPwd,
			mkWrapRk,
			request.CryptoSchemaVer
		);

		var result = await _auth.RegisterAsync(cmd);

		if (!result.Success)
		{
			return result.Error switch
			{
				RegisterError.InvalidCryptoBlob => BadRequest(new { message = "Invalid crypto blob sizes." }),
				RegisterError.InvalidKdfMode => BadRequest(new { message = "Invalid KDF mode." }),
				RegisterError.UnsupportedCryptoSchema => BadRequest(new { message = "Unsupported crypto schema version." }),
				RegisterError.AccountExists => BadRequest(new { message = "Account cannot be created." }),
				_ => StatusCode(StatusCodes.Status500InternalServerError)
			};
		}

		return StatusCode(StatusCodes.Status201Created, new RegisterResponse(result.AccountId!.Value));
	}

	[HttpPost("pre-login")]
	[EnableRateLimiting("AuthPolicy")]
	public async Task<ActionResult<PreLoginResponse>> PreLogin([FromBody] PreLoginRequest request)
	{
		var cmd = new PreLoginCommand(request.AccountId);
		var result = await _auth.PreLoginAsync(cmd);

		// we always return Ok to prevent accountId enumeration
		return Ok(new PreLoginResponse(
			result.S_Pwd!,
			(int)result.KdfMode!,
			result.CryptoSchemaVer!.Value
		));
	}
	[HttpPost("login")]
	[EnableRateLimiting("AuthPolicy")]
	public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
	{
		var cmd = new LoginCommand(request.AccountId, request.Verifier);
		var result = await _auth.LoginAsync(cmd);

		if (!result.Success)
		{
			return Unauthorized(new { message = "Invalid credentials." });
		}

		Response.Cookies.Append(
			RefreshCookieName,
			result.RefreshToken!,
			RefreshCookieOptions(result.RefreshExpiresAt!.Value)
		);

		return Ok(new LoginResponse(
			result.Token!,
			new EncryptedValueDto(result.MkWrapPwd!.Nonce, result.MkWrapPwd.CipherText, result.MkWrapPwd.Tag),
			result.MkWrapRk is not null 
				? new EncryptedValueDto(result.MkWrapRk.Nonce, result.MkWrapRk.CipherText, result.MkWrapRk.Tag) 
				: null
		));
	}

	[Authorize]
	[HttpPost("wraps")]
	public async Task<ActionResult<WrapsResponse>> GetWraps([FromBody] WrapsRequest request)
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();

		var cmd = new WrapsCommand(accountId, request.AdminVerifier);
		var result = await _auth.GetWrapsAsync(cmd);

		if (!result.Success)
		{
			if (result.Error == WrapsError.InvalidCryptoBlob)
				return BadRequest(new { message = "Invalid crypto blob sizes." });

			return Unauthorized();
		}

		return Ok(new WrapsResponse(new EncryptedValueDto(result.MkWrapPwd!.Nonce, result.MkWrapPwd.CipherText, result.MkWrapPwd.Tag)));
	}

	[Authorize]
	[HttpPost("change-password")]
	public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();

		var cmd = new ChangePasswordCommand(
			accountId,
			request.AdminVerifier,
			request.NewVerifier,
			request.NewAdminVerifier,
			request.NewS_Pwd,
			(KdfMode)request.NewKdfMode,
			request.NewMkWrapPwd.ToDomain(),
			request.NewMkWrapRk?.ToDomain(),
			request.CryptoSchemaVer
		);

		var result = await _auth.ChangePasswordAsync(cmd);

		if (!result.Success)
		{
			return result.Error switch
			{
				ChangePasswordError.InvalidKdfMode => BadRequest(new { message = "Invalid KDF mode." }),
				ChangePasswordError.UnsupportedCryptoSchema => BadRequest(new { message = "Unsupported crypto schema version." }),
				ChangePasswordError.InvalidCryptoBlob => BadRequest(new { message = "Invalid crypto blob sizes." }),
				_ => Unauthorized()
			};
		}

		return NoContent();
	}

	[HttpPost("refresh")]
	[EnableRateLimiting("AuthPolicy")]
	public async Task<ActionResult<LoginResponse>> Refresh()
	{
		if (!Request.Cookies.TryGetValue(RefreshCookieName, out var rt) || string.IsNullOrWhiteSpace(rt))
			return Unauthorized(new { message = "Missing refresh token." });

		var result = await _auth.RefreshAsync(new RefreshCommand(rt));

		if (!result.Success)
			return Unauthorized(new { message = "Invalid refresh token." });

		Response.Cookies.Append(
			RefreshCookieName,
			result.RefreshToken!,
			RefreshCookieOptions(result.RefreshExpiresAt!.Value)
		);

		return Ok(new LoginResponse(result.AccessToken!, null, null));
	}

	[HttpPost("logout")]
	public async Task<IActionResult> Logout()
	{
		if (Request.Cookies.TryGetValue(RefreshCookieName, out var rt) && !string.IsNullOrWhiteSpace(rt))
		{
			await _auth.LogoutAsync(rt);
		}

		Response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = "/" });
		return NoContent();
	}

	[Authorize]
	[HttpPost("logout-all")]
	public async Task<IActionResult> LogoutAll()
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();

		await _auth.LogoutAllAsync(accountId);

		Response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = "/" });
		return NoContent();
	}


	[Authorize]
	[HttpGet("me")]
	public ActionResult Me()
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();

		return Ok(new { AccountId = accountId });
	}

}
