using Api.DTOs.Auth;
using Application.Services.Auth;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using Core.Entities;



namespace Api.Controllers;

[ApiController]
[Route("auth")]
public class AuthController : ControllerBase
{
	private readonly VaultonDbContext _db;
	private readonly ITokenIssuer _tokenIssuer;
	private readonly IConfiguration _config;
	private readonly int _verifierPbkdf2Iterations;
	private readonly byte[] _verifierPepperBytes;

	public AuthController(VaultonDbContext db, ITokenIssuer tokenIssuer, IConfiguration config)
	{
		_db = db;
		_tokenIssuer = tokenIssuer;
		_config = config;

		var iterValue = _config["Auth:VerifierPbkdf2Iterations"];
		if (!int.TryParse(iterValue, out _verifierPbkdf2Iterations) || _verifierPbkdf2Iterations <= 0)
		{
			_verifierPbkdf2Iterations = 600_000; // fallback
		}

		var pepperB64 = _config["Auth:VerifierPepper"];
		if (string.IsNullOrWhiteSpace(pepperB64))
			throw new InvalidOperationException("Missing Auth:VerifierPepper configuration.");

		try
		{
			_verifierPepperBytes = Convert.FromBase64String(pepperB64);
		}
		catch (FormatException)
		{
			throw new InvalidOperationException("Auth:VerifierPepper must be base64.");
		}

		if (_verifierPepperBytes.Length != 32)
			throw new InvalidOperationException("Auth:VerifierPepper must decode to 32 bytes.");
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
		if (request.CryptoSchemaVer != 1)
		{
			return BadRequest(new { message = "Unsupported crypto schema version." });
		}

		var exists = await _db.Users.AnyAsync(u => u.Id == request.AccountId);
		if (exists)
		{
			return Conflict(new { message = "Account cannot be created." });
		}

		var sVerifier = new byte[16];
		RandomNumberGenerator.Fill(sVerifier);

		var storedVerifier = ComputeStoredVerifier(request.Verifier, sVerifier, _verifierPepperBytes);

		var now = DateTime.UtcNow;

		var user = new User
		{
			Id = request.AccountId,
			Verifier = storedVerifier,
			S_Verifier = sVerifier,
			S_Pwd = request.S_Pwd,
			ArgonMem = request.ArgonMem,
			ArgonTime = request.ArgonTime,
			ArgonLanes = request.ArgonLanes,
			ArgonVersion = request.ArgonVersion,
			MK_Wrap_Pwd = request.MK_Wrap_Pwd,
			MK_Wrap_Rk = request.MK_Wrap_Rk,
			CryptoSchemaVer = request.CryptoSchemaVer,
			CreatedAt = now,
			UpdatedAt = now,
			LastLoginAt = null
		};

		_db.Users.Add(user);
		await _db.SaveChangesAsync();

		return CreatedAtAction(
			nameof(Register),
			new { accountId = user.Id },
			new RegisterResponse(user.Id)
		);
	}


	[HttpPost("login")]
	public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
	{
		throw new NotImplementedException();
	}

	private byte[] ComputeStoredVerifier(byte[] verifierRaw, byte[] salt, byte[] pepperBytes)
	{
		var input = new byte[verifierRaw.Length + pepperBytes.Length];
		Buffer.BlockCopy(verifierRaw, 0, input, 0, verifierRaw.Length);
		Buffer.BlockCopy(pepperBytes, 0, input, verifierRaw.Length, pepperBytes.Length);

		const int outputLength = 32; // 256-bit

		using var pbkdf2 = new Rfc2898DeriveBytes(input, salt, _verifierPbkdf2Iterations, HashAlgorithmName.SHA256);
		return pbkdf2.GetBytes(outputLength);
	}

}
