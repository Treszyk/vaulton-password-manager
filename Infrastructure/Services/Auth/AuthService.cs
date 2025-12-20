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
		private const int MaxFailedLoginAttempts = 5;
		private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(15);

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
			var validationError = ValidateRegisterCommand(cmd);
			if (validationError is not null)
				return RegisterResult.Fail(validationError.Value);

			var exists = await db.Users.AnyAsync(u => u.Id == cmd.AccountId);
			if (exists)
				return RegisterResult.Fail(RegisterError.AccountExists);

			var sVerifier = new byte[CryptoSizes.SaltLen];
			RandomNumberGenerator.Fill(sVerifier);

			var storedVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.Verifier, sVerifier);

			try
			{
				var user = CreateUserFromRegisterCommand(cmd, sVerifier, storedVerifier);

				db.Users.Add(user);
				await db.SaveChangesAsync();

				return RegisterResult.Ok(user.Id);
			}
			finally
			{
				CryptographicOperations.ZeroMemory(cmd.Verifier);
			}
		}
		public async Task<LoginResult> LoginAsync(LoginCommand cmd)
		{
			var validationError = ValidateLoginCommand(cmd);
			if (validationError is not null)
				return LoginResult.Fail(validationError.Value);

			try
			{
				var now = DateTime.UtcNow;
				var user = await db.Users.SingleOrDefaultAsync(u => u.Id == cmd.AccountId);

				if (user is null)
				{
					DoDummyVerifierWork();
					return LoginResult.Fail(LoginError.InvalidCredentials);
				}

				if (user.LockedUntil is not null && user.LockedUntil > now)
				{
					return LoginResult.Fail(LoginError.InvalidCredentials);
				}

				var computed = cryptoHelpers.ComputeStoredVerifier(cmd.Verifier, user.S_Verifier);

				var ok = false;
				try
				{
					ok =
						user.Verifier.Length == computed.Length &&
						CryptographicOperations.FixedTimeEquals(user.Verifier, computed);
				}
				finally
				{
					CryptographicOperations.ZeroMemory(computed);
				}

				if (!ok)
				{
					user.FailedLoginCount = Math.Min(user.FailedLoginCount + 1, MaxFailedLoginAttempts);
					user.LastFailedLoginAt = now;
					user.UpdatedAt = now;

					if (user.FailedLoginCount >= MaxFailedLoginAttempts)
					{
						user.LockedUntil = now.Add(LockoutDuration);
						user.FailedLoginCount = 0;
					}

					await db.SaveChangesAsync();
					return LoginResult.Fail(LoginError.InvalidCredentials);
				}

				user.LastLoginAt = now;
				user.FailedLoginCount = 0;
				user.LastFailedLoginAt = null;
				user.LockedUntil = null;
				user.UpdatedAt = now;

				var (refreshToken, refreshHash) = AuthCryptoHelpers.MintRefreshToken();
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
			finally
			{
				CryptographicOperations.ZeroMemory(cmd.Verifier);
			}
		}
		public async Task<RefreshResult> RefreshAsync(RefreshCommand cmd)
		{
			if (string.IsNullOrWhiteSpace(cmd.RefreshToken))
				return RefreshResult.Fail(RefreshError.MissingRefreshToken);

			if (!AuthCryptoHelpers.TryHashRefreshToken(cmd.RefreshToken, out var hash))
				return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

			try
			{
				var now = DateTime.UtcNow;

				var tokenRow = await db.RefreshTokens
					.SingleOrDefaultAsync(x => x.TokenHash.SequenceEqual(hash));

				if (tokenRow is null)
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

				if (tokenRow.ExpiresAt <= now)
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

				if (tokenRow.RevokedAt is not null)
				{
					await LogoutAllAsync(tokenRow.UserId);
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);
				}

				tokenRow.RevokedAt = now;

				var (newToken, newHash) = AuthCryptoHelpers.MintRefreshToken();
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
			finally
			{
				CryptographicOperations.ZeroMemory(hash);
			}
		}
		public async Task LogoutAsync(string refreshToken)
		{
			if (string.IsNullOrWhiteSpace(refreshToken))
				return;

			if (!AuthCryptoHelpers.TryHashRefreshToken(refreshToken, out var hash))
				return;

			try
			{
				var now = DateTime.UtcNow;

				var rt = await db.RefreshTokens
					.SingleOrDefaultAsync(x => x.TokenHash.SequenceEqual(hash) && x.RevokedAt == null);

				if (rt is null)
					return;

				rt.RevokedAt = now;
				await db.SaveChangesAsync();
			}
			finally
			{
				CryptographicOperations.ZeroMemory(hash);
			}
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

			try
			{
				_ = cryptoHelpers.ComputeStoredVerifier(dummyVerifier, dummySalt);
			}
			finally
			{
				CryptographicOperations.ZeroMemory(dummyVerifier);
				CryptographicOperations.ZeroMemory(dummySalt);
			}
		}

		// these methods were made purely to increase readability of the main async ones
		private static RegisterError? ValidateRegisterCommand(RegisterCommand cmd)
		{
			if (cmd.CryptoSchemaVer != 1)
				return RegisterError.UnsupportedCryptoSchema;

			if (cmd.Verifier.Length != CryptoSizes.VerifierLen || cmd.S_Pwd.Length != CryptoSizes.SaltLen)
				return RegisterError.InvalidCryptoBlob;

			if (!AuthCryptoHelpers.IsValidMkWrap(cmd.MkWrapPwd))
				return RegisterError.InvalidCryptoBlob;

			if (cmd.MkWrapRk is not null && !AuthCryptoHelpers.IsValidMkWrap(cmd.MkWrapRk))
				return RegisterError.InvalidCryptoBlob;

			if (cmd.KdfMode is not KdfMode.Default and not KdfMode.Strong)
				return RegisterError.InvalidKdfMode;

			return null;
		}
		private static LoginError? ValidateLoginCommand(LoginCommand cmd)
		{
			if (cmd.Verifier.Length != CryptoSizes.VerifierLen)
				return LoginError.InvalidCredentials;

			return null;
		}
		private static User CreateUserFromRegisterCommand(RegisterCommand cmd, byte[] sVerifier, byte[] verifier)
		{
			var now = DateTime.UtcNow;

			return new User
			{
				Id = cmd.AccountId,
				Verifier = verifier,
				S_Verifier = sVerifier,
				S_Pwd = cmd.S_Pwd,
				KdfMode = cmd.KdfMode,

				MkWrapPwd = cmd.MkWrapPwd,
				MkWrapRk = cmd.MkWrapRk,

				CryptoSchemaVer = cmd.CryptoSchemaVer,

				CreatedAt = now,
				UpdatedAt = now,
				LastLoginAt = null,
				FailedLoginCount = 0,
				LastFailedLoginAt = null,
				LockedUntil = null
			};
		}
	}
}
