using Api.DTOs.Auth;
using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Core.Crypto;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
	private readonly IAuthService _auth = auth;

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
				RegisterError.AccountExists => Conflict(new { message = "Account cannot be created." }),
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

		return Ok(new LoginResponse(result.Token!));
	}
}
