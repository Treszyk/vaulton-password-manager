using Api.DTOs.Auth;
using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Core.Crypto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

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
		Path = "/auth"
	};

	[HttpPost("pre-register")]
	public async Task<ActionResult<PreRegisterResponse>> PreRegister()
	{
		var accountId = await _auth.PreRegisterAsync();
		return Ok(new PreRegisterResponse(accountId));
	}

	[HttpPost("register")]
	public async Task<ActionResult<RegisterResponse>> Register([FromBody] RegisterRequest request)
	{
		var mkWrapPwd = new EncryptedValue
		{
			Nonce = request.MkWrapPwd.Nonce,
			CipherText = request.MkWrapPwd.CipherText,
			Tag = request.MkWrapPwd.Tag
		};

		EncryptedValue? mkWrapRk = request.MkWrapRk is null
			? null
			: new EncryptedValue
			{
				Nonce = request.MkWrapRk.Nonce,
				CipherText = request.MkWrapRk.CipherText,
				Tag = request.MkWrapRk.Tag
			};

		var cmd = new RegisterCommand(
			request.AccountId,
			request.Verifier,
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


	[HttpPost("login")]
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

		return Ok(new LoginResponse(result.Token!));
	}

	[HttpPost("refresh")]
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

		return Ok(new LoginResponse(result.AccessToken!));
	}

	[HttpPost("logout")]
	public async Task<IActionResult> Logout()
	{
		if (Request.Cookies.TryGetValue(RefreshCookieName, out var rt) && !string.IsNullOrWhiteSpace(rt))
		{
			await _auth.LogoutAsync(rt);
		}

		Response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = "/auth" });
		return NoContent();
	}

	[Authorize]
	[HttpPost("logout-all")]
	public async Task<IActionResult> LogoutAll()
	{
		var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
		if (!Guid.TryParse(sub, out var accountId))
			return Unauthorized();

		await _auth.LogoutAllAsync(accountId);

		Response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = "/auth" });
		return NoContent();
	}


	[Authorize]
	[HttpGet("me")]
	public ActionResult Me()
	{
		var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
		if (!Guid.TryParse(sub, out var accountId))
			return Unauthorized();

		return Ok(new { AccountId = accountId });
	}

}
