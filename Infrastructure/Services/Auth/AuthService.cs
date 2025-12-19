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
using Microsoft.AspNetCore.WebUtilities;


namespace Infrastructure.Services.Auth
{
	public sealed class AuthService : IAuthService
	{
		private readonly VaultonDbContext _db;
		private readonly ITokenIssuer _tokenIssuer;
		private readonly int _verifierPbkdf2Iterations;
		private readonly byte[] _verifierPepperBytes;
		private static readonly TimeSpan RefreshTtl = TimeSpan.FromDays(7);

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

			if (cmd.Verifier.Length != CryptoSizes.VerifierLen || cmd.S_Pwd.Length != CryptoSizes.SaltLen)
				return RegisterResult.Fail(RegisterError.InvalidCryptoBlob);

			if (!IsValidMkWrap(cmd.MkWrapPwd))
				return RegisterResult.Fail(RegisterError.InvalidCryptoBlob);

			if (cmd.MkWrapRk is not null && !IsValidMkWrap(cmd.MkWrapRk))
				return RegisterResult.Fail(RegisterError.InvalidCryptoBlob);

			if (cmd.KdfMode is not KdfMode.Default and not KdfMode.Strong)
				return RegisterResult.Fail(RegisterError.InvalidKdfMode);

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
				KdfMode = cmd.KdfMode,

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

			var (refreshToken, refreshHash) = MintRefreshToken();
			var refreshExpires = now.Add(RefreshTtl);

			_db.RefreshTokens.Add(new RefreshToken
			{
				Id = Guid.NewGuid(),
				UserId = user.Id,
				TokenHash = refreshHash,
				CreatedAt = now,
				ExpiresAt = refreshExpires,
				RevokedAt = null
			});

			await _db.SaveChangesAsync();

			var accessToken = _tokenIssuer.IssueToken(user.Id);
			return LoginResult.Ok(accessToken, refreshToken, refreshExpires);
		}

		public async Task<RefreshResult> RefreshAsync(RefreshCommand cmd)
		{
			if (string.IsNullOrWhiteSpace(cmd.RefreshToken))
				return RefreshResult.Fail(RefreshError.MissingRefreshToken);

			if (!TryHashRefreshToken(cmd.RefreshToken, out var hash))
				return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

			var now = DateTime.UtcNow;

			var tokenRow = await _db.RefreshTokens
				.SingleOrDefaultAsync(x => x.TokenHash == hash);

			if (tokenRow is null)
				return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

			if (tokenRow.ExpiresAt <= now)
				return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

			// reuse detection
			if (tokenRow.RevokedAt is not null)
			{
				await LogoutAllAsync(tokenRow.UserId);
				return RefreshResult.Fail(RefreshError.InvalidRefreshToken);
			}

			tokenRow.RevokedAt = now;

			var (newToken, newHash) = MintRefreshToken();
			var newExpires = now.Add(RefreshTtl);

			_db.RefreshTokens.Add(new RefreshToken
			{
				Id = Guid.NewGuid(),
				UserId = tokenRow.UserId,
				TokenHash = newHash,
				CreatedAt = now,
				ExpiresAt = newExpires,
				RevokedAt = null
			});

			await _db.SaveChangesAsync();

			var access = _tokenIssuer.IssueToken(tokenRow.UserId);
			return RefreshResult.Ok(access, newToken, newExpires);
		}

		public async Task LogoutAsync(string refreshToken)
		{
			if (string.IsNullOrWhiteSpace(refreshToken))
				return;

			if (!TryHashRefreshToken(refreshToken, out var hash))
				return;

			var now = DateTime.UtcNow;

			var rt = await _db.RefreshTokens
				.SingleOrDefaultAsync(x => x.TokenHash == hash && x.RevokedAt == null);

			if (rt is null)
				return;

			rt.RevokedAt = now;
			await _db.SaveChangesAsync();
		}
		public async Task LogoutAllAsync(Guid accountId)
		{
			var now = DateTime.UtcNow;

			await _db.RefreshTokens
				.Where(rt => rt.UserId == accountId && rt.RevokedAt == null)
				.ExecuteUpdateAsync(s => s.SetProperty(rt => rt.RevokedAt, now));
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

		private static bool IsValidMkWrap(EncryptedValue w)
		{
			return w.Nonce is { Length: CryptoSizes.GcmNonceLen }
				&& w.Tag is { Length: CryptoSizes.GcmTagLen }
				&& w.CipherText is { Length: CryptoSizes.MkLen };
		}
		private static (string token, byte[] tokenHash) MintRefreshToken()
		{
			var raw = RandomNumberGenerator.GetBytes(64);
			var token = WebEncoders.Base64UrlEncode(raw);
			var hash = SHA256.HashData(raw);
			return (token, hash);
		}
		private static bool TryHashRefreshToken(string token, out byte[] hash)
		{
			hash = Array.Empty<byte>();
			try
			{
				var raw = WebEncoders.Base64UrlDecode(token);
				hash = SHA256.HashData(raw);
				return true;
			}
			catch
			{
				return false;
			}
		}

	}
}
