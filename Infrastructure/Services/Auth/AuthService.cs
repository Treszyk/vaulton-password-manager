using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Application.Services.Auth.Results;
using Core.Crypto;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
namespace Infrastructure.Services.Auth
{
	public sealed class AuthService(VaultonDbContext db, ITokenIssuer tokenIssuer, AuthCryptoHelpers cryptoHelpers) : IAuthService
	{
		private static readonly TimeSpan RefreshTtl = TimeSpan.FromDays(7);

		public async Task<Guid> PreRegisterAsync()
		{
			var accountId = Guid.NewGuid();

			// checking just in case, tho in case of Guids it's most likely never gonna happen
			var exists = await db.Users.AnyAsync(u => u.Id == accountId);
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

			var exists = await db.Users.AnyAsync(u => u.Id == cmd.AccountId);
			if (exists)
				return RegisterResult.Fail(RegisterError.AccountExists);

			if (cmd.Verifier.Length != CryptoSizes.VerifierLen || cmd.S_Pwd.Length != CryptoSizes.SaltLen)
				return RegisterResult.Fail(RegisterError.InvalidCryptoBlob);

			if (!cryptoHelpers.IsValidMkWrap(cmd.MkWrapPwd))
				return RegisterResult.Fail(RegisterError.InvalidCryptoBlob);

			if (cmd.MkWrapRk is not null && !cryptoHelpers.IsValidMkWrap(cmd.MkWrapRk))
				return RegisterResult.Fail(RegisterError.InvalidCryptoBlob);

			if (cmd.KdfMode is not KdfMode.Default and not KdfMode.Strong)
				return RegisterResult.Fail(RegisterError.InvalidKdfMode);

			var sVerifier = new byte[CryptoSizes.SaltLen];
			RandomNumberGenerator.Fill(sVerifier);

			var storedVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.Verifier, sVerifier);

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

			db.Users.Add(user);
			await db.SaveChangesAsync();

			return RegisterResult.Ok(user.Id);
		}

		public async Task<LoginResult> LoginAsync(LoginCommand cmd)
		{
			var user = await db.Users.SingleOrDefaultAsync(u => u.Id == cmd.AccountId);
			if (user is null)
			{
				DoDummyVerifierWork();
				return LoginResult.Fail(LoginError.InvalidCredentials);
			}

			var computed = cryptoHelpers.ComputeStoredVerifier(cmd.Verifier, user.S_Verifier);

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

			var (refreshToken, refreshHash) = cryptoHelpers.MintRefreshToken();
			var refreshExpires = now.Add(RefreshTtl);

			db.RefreshTokens.Add(new RefreshToken
			{
				Id = Guid.NewGuid(),
				UserId = user.Id,
				TokenHash = refreshHash,
				CreatedAt = now,
				ExpiresAt = refreshExpires,
				RevokedAt = null
			});

			await db.SaveChangesAsync();

			var accessToken = tokenIssuer.IssueToken(user.Id);
			return LoginResult.Ok(accessToken, refreshToken, refreshExpires);
		}

		public async Task<RefreshResult> RefreshAsync(RefreshCommand cmd)
		{
			if (string.IsNullOrWhiteSpace(cmd.RefreshToken))
				return RefreshResult.Fail(RefreshError.MissingRefreshToken);

			if (!cryptoHelpers.TryHashRefreshToken(cmd.RefreshToken, out var hash))
				return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

			var now = DateTime.UtcNow;

			var tokenRow = await db.RefreshTokens
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

			var (newToken, newHash) = cryptoHelpers.MintRefreshToken();
			var newExpires = now.Add(RefreshTtl);

			db.RefreshTokens.Add(new RefreshToken
			{
				Id = Guid.NewGuid(),
				UserId = tokenRow.UserId,
				TokenHash = newHash,
				CreatedAt = now,
				ExpiresAt = newExpires,
				RevokedAt = null
			});

			await db.SaveChangesAsync();

			var access = tokenIssuer.IssueToken(tokenRow.UserId);
			return RefreshResult.Ok(access, newToken, newExpires);
		}

		public async Task LogoutAsync(string refreshToken)
		{
			if (string.IsNullOrWhiteSpace(refreshToken))
				return;

			if (!cryptoHelpers.TryHashRefreshToken(refreshToken, out var hash))
				return;

			var now = DateTime.UtcNow;

			var rt = await db.RefreshTokens
				.SingleOrDefaultAsync(x => x.TokenHash == hash && x.RevokedAt == null);

			if (rt is null)
				return;

			rt.RevokedAt = now;
			await db.SaveChangesAsync();
		}
		public async Task LogoutAllAsync(Guid accountId)
		{
			var now = DateTime.UtcNow;

			await db.RefreshTokens
				.Where(rt => rt.UserId == accountId && rt.RevokedAt == null)
				.ExecuteUpdateAsync(s => s.SetProperty(rt => rt.RevokedAt, now));
		}

		// helps with attackers trying to guess if an AccountId exists
		private void DoDummyVerifierWork()
		{
			var dummyVerifier = new byte[CryptoSizes.VerifierLen];
			var dummySalt = new byte[CryptoSizes.SaltLen];

			_ = cryptoHelpers.ComputeStoredVerifier(dummyVerifier, dummySalt);
		}

	}
}
