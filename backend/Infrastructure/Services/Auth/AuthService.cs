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
	public sealed class AuthService(
		VaultonDbContext db,
		ITokenIssuer tokenIssuer,
		AuthCryptoHelpers cryptoHelpers,
		IAuthCommandValidator validator,
		ILockoutPolicy lockoutPolicy,
		IRefreshTokenStore refreshTokenStore) : IAuthService
	{
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
			var validationError = validator.ValidateRegister(cmd);
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
			var validationError = validator.ValidateLogin(cmd);
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

				if (lockoutPolicy.IsLockedOut(user, now))
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
					lockoutPolicy.RegisterFailedLogin(user, now);
					await db.SaveChangesAsync();
					return LoginResult.Fail(LoginError.InvalidCredentials);
				}

				lockoutPolicy.RegisterSuccessfulLogin(user, now);
				user.LastLoginAt = now;

				var refreshIssue = await refreshTokenStore.MintAsync(user.Id, now);
				var accessToken = tokenIssuer.IssueToken(user.Id);
				return LoginResult.Ok(accessToken, refreshIssue.Token, refreshIssue.ExpiresAt);
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

			var now = DateTime.UtcNow;
			var rotation = await refreshTokenStore.RotateAsync(cmd.RefreshToken, now);

			switch (rotation.Status)
			{
				case RefreshTokenRotationStatus.Invalid:
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);
				case RefreshTokenRotationStatus.Revoked:
					if (rotation.UserId is not null)
					{
						await refreshTokenStore.RevokeAllAsync(rotation.UserId.Value, now);
					}
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);
				case RefreshTokenRotationStatus.Rotated:
					if (rotation.UserId is null || rotation.Token is null || rotation.ExpiresAt is null)
						return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

					var access = tokenIssuer.IssueToken(rotation.UserId.Value);
					return RefreshResult.Ok(access, rotation.Token, rotation.ExpiresAt.Value);
				default:
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);
			}
		}
		public async Task LogoutAsync(string refreshToken)
		{
			var now = DateTime.UtcNow;
			await refreshTokenStore.RevokeAsync(refreshToken, now);
		}
		public async Task LogoutAllAsync(Guid accountId)
		{
			var now = DateTime.UtcNow;
			await refreshTokenStore.RevokeAllAsync(accountId, now);
		}

		public async Task<PreLoginResult> PreLoginAsync(PreLoginCommand cmd)
		{
			var user = await db.Users
				.Where(u => u.Id == cmd.AccountId)
				.Select(u => new { u.S_Pwd, u.KdfMode, u.CryptoSchemaVer })
				.SingleOrDefaultAsync();

			// always compute the fake salt to prevent timing attacks
			var fakeSalt = cryptoHelpers.ComputeFakeSalt(cmd.AccountId);

			if (user is null)
			{
				// return deterministic fake data to prevent enumeration.
				// client will proceed to compute proof with this salt and fail at Login.
				return PreLoginResult.Ok(fakeSalt, KdfMode.Default, 1);
			}

			return PreLoginResult.Ok(user.S_Pwd, user.KdfMode, user.CryptoSchemaVer);
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
