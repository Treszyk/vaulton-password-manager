using Api.DTOs.Auth;
using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
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
		var cmd = new RegisterCommand(
			request.AccountId,
			request.Verifier,
			request.S_Pwd,
			request.ArgonMem,
			request.ArgonTime,
			request.ArgonLanes,
			request.ArgonVersion,
			request.MK_Wrap_Pwd,
			request.MK_Wrap_Rk,
			request.CryptoSchemaVer
		);

		var result = await _auth.RegisterAsync(cmd);

		if (!result.Success)
		{
			return result.Error switch
			{
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
