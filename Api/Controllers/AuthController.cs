using Api.DTOs.Auth;
using Application.Services.Auth;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;

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
