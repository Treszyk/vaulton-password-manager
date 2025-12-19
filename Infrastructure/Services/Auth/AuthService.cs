using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Application.Services.Auth.Results;
using Core.Crypto;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;


namespace Infrastructure.Services.Auth
{
	public sealed class AuthService : IAuthService
	{
		private readonly VaultonDbContext _db;
		private readonly ITokenIssuer _tokenIssuer;
		private readonly int _verifierPbkdf2Iterations;
		private readonly byte[] _verifierPepperBytes;

		public AuthService(VaultonDbContext db, ITokenIssuer tokenIssuer, IConfiguration config)
		{
			_db = db;
			_tokenIssuer = tokenIssuer;

			var iterValue = config["Auth:VerifierPbkdf2Iterations"];
			if (!int.TryParse(iterValue, out _verifierPbkdf2Iterations) || _verifierPbkdf2Iterations <= 0)
			{
				_verifierPbkdf2Iterations = 600_000; // fallback
			}

			var pepperB64 = config["Auth:VerifierPepper"];
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

			if (_verifierPepperBytes.Length != CryptoSizes.PepperLen)
				throw new InvalidOperationException("Auth:VerifierPepper must decode to 32 bytes.");
		}

		public async Task<Guid> PreRegisterAsync()
		{
			var accountId = Guid.NewGuid();

			// checking just in case, tho in case of Guids it's most likely never gonna happen
			var exists = await _db.Users.AnyAsync(u => u.Id == accountId);
			if (exists)
			{
				throw new InvalidOperationException("Failed to generate unique AccountId.");
			}

			return accountId;
		}

		public async Task<RegisterResult> RegisterAsync(RegisterCommand cmd)
		{
			if (cmd.CryptoSchemaVer != 1)
				return RegisterResult.Fail(RegisterError.UnsupportedCryptoSchema);

			var exists = await _db.Users.AnyAsync(u => u.Id == cmd.AccountId);
			if (exists)
				return RegisterResult.Fail(RegisterError.AccountExists);

			var sVerifier = new byte[CryptoSizes.SaltLen];
			RandomNumberGenerator.Fill(sVerifier);

			var storedVerifier = ComputeStoredVerifier(cmd.Verifier, sVerifier, _verifierPepperBytes);

			var now = DateTime.UtcNow;

			var user = new User
			{
				Id = cmd.AccountId,
				Verifier = storedVerifier,
				S_Verifier = sVerifier,
				S_Pwd = cmd.S_Pwd,

				ArgonMem = cmd.ArgonMem,
				ArgonTime = cmd.ArgonTime,
				ArgonLanes = cmd.ArgonLanes,
				ArgonVersion = cmd.ArgonVersion,

				MkWrapPwd = cmd.MkWrapPwd,
				MkWrapRk = cmd.MkWrapRk,

				CryptoSchemaVer = cmd.CryptoSchemaVer,

				CreatedAt = now,
				UpdatedAt = now,
				LastLoginAt = null
			};

			_db.Users.Add(user);
			await _db.SaveChangesAsync();

			return RegisterResult.Ok(user.Id);
		}

		public async Task<LoginResult> LoginAsync(LoginCommand cmd)
		{
			var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == cmd.AccountId);
			if (user is null)
			{
				DoDummyVerifierWork();
				return LoginResult.Fail(LoginError.InvalidCredentials);
			}

			var computed = ComputeStoredVerifier(cmd.Verifier, user.S_Verifier, _verifierPepperBytes);

			// constant-time comparison helps against timing attacks
			var ok =
				user.Verifier.Length == computed.Length &&
				CryptographicOperations.FixedTimeEquals(user.Verifier, computed);

			if (!ok)
			{
				return LoginResult.Fail(LoginError.InvalidCredentials);
			}

			// metadata update
			var now = DateTime.UtcNow;
			user.LastLoginAt = now;
			user.UpdatedAt = now;
			await _db.SaveChangesAsync();

			var token = _tokenIssuer.IssueToken(user.Id);
			return LoginResult.Ok(token);
		}

		// helps with attackers trying to guess if an AccountId exists
		private void DoDummyVerifierWork()
		{
			var dummyVerifier = new byte[CryptoSizes.VerifierLen];
			var dummySalt = new byte[CryptoSizes.SaltLen];

			_ = ComputeStoredVerifier(dummyVerifier, dummySalt, _verifierPepperBytes);
		}

		private byte[] ComputeStoredVerifier(byte[] verifierRaw, byte[] salt, byte[] pepperBytes)
		{
			var input = new byte[verifierRaw.Length + pepperBytes.Length];
			Buffer.BlockCopy(verifierRaw, 0, input, 0, verifierRaw.Length);
			Buffer.BlockCopy(pepperBytes, 0, input, verifierRaw.Length, pepperBytes.Length);

			using var pbkdf2 = new Rfc2898DeriveBytes(input, salt, _verifierPbkdf2Iterations, HashAlgorithmName.SHA256);
			return pbkdf2.GetBytes(CryptoSizes.VerifierLen);
		}
	}
}
