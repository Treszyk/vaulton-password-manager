using Api.DTOs.Auth;
using Application.Services.Auth;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
	private readonly VaultonDbContext _db;
	private readonly ITokenIssuer _tokenIssuer;

	public AuthController(VaultonDbContext db, ITokenIssuer tokenIssuer)
	{
		_db = db;
		_tokenIssuer = tokenIssuer;
	}

	[HttpPost("pre-register")]
	public async Task<ActionResult<PreRegisterResponse>> PreRegister()
	{
		var accountId = Guid.NewGuid();

		// checking just in case, tho in case of Guids it's most likely never gonna happen
		var exists = await _db.Users.AnyAsync(u => u.Id == accountId);
		if (exists)
		{
			return StatusCode(StatusCodes.Status500InternalServerError);
		}

		return Ok(new PreRegisterResponse(accountId));
	}

	[HttpPost("register")]
	public async Task<ActionResult<RegisterResponse>> Register([FromBody] RegisterRequest request)
	{
		throw new NotImplementedException();
	}

	[HttpPost("login")]
	public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
	{
		throw new NotImplementedException();
	}
}
