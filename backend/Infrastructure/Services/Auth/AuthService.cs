using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Application.Services.Auth.Results;
using Core.Crypto;
using Core.Entities;
using Core.Enums;
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

			var sVerifier = new byte[CryptoSizes.SaltLen];
			var sAdminVerifier = new byte[CryptoSizes.SaltLen];
			var sRk = new byte[CryptoSizes.SaltLen];

			RandomNumberGenerator.Fill(sVerifier);
			RandomNumberGenerator.Fill(sAdminVerifier);
			RandomNumberGenerator.Fill(sRk);

			var storedVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.Verifier, sVerifier);
			var storedAdminVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.AdminVerifier, sAdminVerifier);
			var storedRkVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.RkVerifier, sRk);

			try
			{
				if (exists)
					return RegisterResult.Fail(RegisterError.AccountExists);

				var user = CreateUserFromRegisterCommand(
					cmd, 
					sVerifier, storedVerifier, 
					sAdminVerifier, storedAdminVerifier,
					sRk, storedRkVerifier);

				db.Users.Add(user);
				await db.SaveChangesAsync();

				return RegisterResult.Ok(user.Id);
			}
			finally
			{
				CryptographicOperations.ZeroMemory(cmd.Verifier);
				CryptographicOperations.ZeroMemory(cmd.AdminVerifier);
				CryptographicOperations.ZeroMemory(cmd.RkVerifier);
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

				var issued = tokenIssuer.IssueToken(user.Id);
				var jtiHash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(issued.Jti));
				
				var refreshIssue = await refreshTokenStore.MintAsync(user.Id, jtiHash, now);
				return LoginResult.Ok(issued.Token, refreshIssue.Token, refreshIssue.ExpiresAt, user.MkWrapPwd, user.MkWrapRk);
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
			
			var userId = await refreshTokenStore.GetUserIdByTokenAsync(cmd.RefreshToken);
			if (userId == null)
				return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

			var issued = tokenIssuer.IssueToken(userId.Value);
			var jtiHash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(issued.Jti));

			var rotation = await refreshTokenStore.RotateAsync(cmd.RefreshToken, jtiHash, now);

			switch (rotation.Status)
			{
				case RefreshTokenRotationStatus.Invalid:
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);
				case RefreshTokenRotationStatus.Revoked:
					if (rotation.UserId is not null && rotation.Reason == RevocationReason.Regular)
					{
						await refreshTokenStore.RevokeAllAsync(rotation.UserId.Value, now);
					}
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);
				case RefreshTokenRotationStatus.RecentlyRevoked:
					if (rotation.Reason == RevocationReason.Regular)
					{
						return RefreshResult.Fail(RefreshError.RecentlyRevoked);
					}
					return RefreshResult.Fail(RefreshError.InvalidRefreshToken);
				case RefreshTokenRotationStatus.Rotated:
					if (rotation.UserId is null || rotation.Token is null || rotation.ExpiresAt is null)
						return RefreshResult.Fail(RefreshError.InvalidRefreshToken);

					return RefreshResult.Ok(issued.Token, rotation.Token, rotation.ExpiresAt.Value);
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

		public async Task<WrapsResult> GetWrapsAsync(WrapsCommand cmd)
		{
			var validationError = validator.ValidateWraps(cmd);
			if (validationError is not null)
				return WrapsResult.Fail(validationError.Value);

			try
			{
				var now = DateTime.UtcNow;
				var user = await db.Users.SingleOrDefaultAsync(u => u.Id == cmd.AccountId);
				if (user is null)
				{
					DoDummyVerifierWork();
					return WrapsResult.Fail(WrapsError.AccountNotFound);
				}

				if (lockoutPolicy.IsLockedOut(user, now))
				{
					return WrapsResult.Fail(WrapsError.InvalidAdminVerifier);
				}

				var computed = cryptoHelpers.ComputeStoredVerifier(cmd.AdminVerifier, user.S_AdminVerifier);
				var ok = false;

				try
				{
					ok = user.AdminVerifier.Length == computed.Length &&
						 CryptographicOperations.FixedTimeEquals(user.AdminVerifier, computed);
				}
				finally
				{
					CryptographicOperations.ZeroMemory(computed);
				}

				if (!ok)
				{
					lockoutPolicy.RegisterFailedLogin(user, now);
					await db.SaveChangesAsync();
					return WrapsResult.Fail(WrapsError.InvalidAdminVerifier);
				}

				lockoutPolicy.RegisterSuccessfulLogin(user, now);
				await db.SaveChangesAsync();

				return WrapsResult.Ok(user.MkWrapPwd, user.MkWrapRk, (int)user.KdfMode, user.CryptoSchemaVer);
			}
			finally
			{
				CryptographicOperations.ZeroMemory(cmd.AdminVerifier);
			}
		}

		public async Task<ChangePasswordResult> ChangePasswordAsync(ChangePasswordCommand cmd)
		{
			var validationError = validator.ValidateChangePassword(cmd);
			if (validationError is not null)
				return ChangePasswordResult.Fail(validationError.Value);

			try
			{
				var now = DateTime.UtcNow;
				var user = await db.Users.SingleOrDefaultAsync(u => u.Id == cmd.AccountId);
				if (user is null)
				{
					DoDummyVerifierWork();
					return ChangePasswordResult.Fail(ChangePasswordError.AccountNotFound);
				}

				if (lockoutPolicy.IsLockedOut(user, now))
				{
					return ChangePasswordResult.Fail(ChangePasswordError.InvalidAdminVerifier);
				}

				var computed = cryptoHelpers.ComputeStoredVerifier(cmd.AdminVerifier, user.S_AdminVerifier);
				var ok = false;

				try
				{
					ok = user.AdminVerifier.Length == computed.Length &&
						 CryptographicOperations.FixedTimeEquals(user.AdminVerifier, computed);
				}
				finally
				{
					CryptographicOperations.ZeroMemory(computed);
				}

				if (!ok)
				{
					lockoutPolicy.RegisterFailedLogin(user, now);
					await db.SaveChangesAsync();
					return ChangePasswordResult.Fail(ChangePasswordError.InvalidAdminVerifier);
				}

				lockoutPolicy.RegisterSuccessfulLogin(user, now);

				var sVerifier = new byte[CryptoSizes.SaltLen];
				var sAdminVerifier = new byte[CryptoSizes.SaltLen];
				RandomNumberGenerator.Fill(sVerifier);
				RandomNumberGenerator.Fill(sAdminVerifier);

				var storedVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.NewVerifier, sVerifier);
				var storedAdminVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.NewAdminVerifier, sAdminVerifier);

				user.Verifier = storedVerifier;
				user.S_Verifier = sVerifier;
				user.AdminVerifier = storedAdminVerifier;
				user.S_AdminVerifier = sAdminVerifier;

				user.S_Pwd = cmd.NewS_Pwd;
				user.KdfMode = cmd.NewKdfMode;
				user.MkWrapPwd = cmd.NewMkWrapPwd;
				if (cmd.NewMkWrapRk != null && cmd.NewRkVerifier != null)
				{
					user.MkWrapRk = cmd.NewMkWrapRk;
					
					var sRk = new byte[CryptoSizes.SaltLen];
					RandomNumberGenerator.Fill(sRk);
					var storedRkVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.NewRkVerifier, sRk);
					
					user.RkVerifier = storedRkVerifier;
					user.S_Rk = sRk;
				}
				user.CryptoSchemaVer = cmd.CryptoSchemaVer;
				user.UpdatedAt = DateTime.UtcNow;

				await db.SaveChangesAsync();
				
				await refreshTokenStore.RevokeAllAsync(user.Id, now);

				return ChangePasswordResult.Ok();
			}
			finally
			{
				CryptographicOperations.ZeroMemory(cmd.AdminVerifier);
				CryptographicOperations.ZeroMemory(cmd.NewVerifier);
				CryptographicOperations.ZeroMemory(cmd.NewAdminVerifier);
				if (cmd.NewRkVerifier != null)
				{
					CryptographicOperations.ZeroMemory(cmd.NewRkVerifier);
				}
			}
		}

		public async Task<WrapsResult> GetRecoveryWrapsAsync(Guid accountId, byte[] rkVerifier)
		{
			var now = DateTime.UtcNow;
			var user = await db.Users.SingleOrDefaultAsync(u => u.Id == accountId);

			var verificationSalt = user?.S_Rk ?? cryptoHelpers.ComputeFakeSalt(accountId);
			var expectedVerifier = user?.RkVerifier ?? new byte[CryptoSizes.VerifierLen];

			var computed = cryptoHelpers.ComputeStoredVerifier(rkVerifier, verificationSalt);
			
			var proofValid = user != null && CryptographicOperations.FixedTimeEquals(expectedVerifier, computed);

			CryptographicOperations.ZeroMemory(computed);

			if (user != null && lockoutPolicy.IsLockedOut(user, now))
			{
				proofValid = false;
			}

			if (!proofValid)
			{
				if (user != null)
				{
					lockoutPolicy.RegisterFailedLogin(user, now);
					await db.SaveChangesAsync();
				}

				var (pwdNonce, pwdCt, pwdTag) = cryptoHelpers.ComputeFakeWraps(accountId, "mk-wrap-pwd", rkVerifier);
				var (rkNonce, rkCt, rkTag) = cryptoHelpers.ComputeFakeWraps(accountId, "mk-wrap-rk", rkVerifier);

				return WrapsResult.Ok(
					new EncryptedValue { Nonce = pwdNonce, CipherText = pwdCt, Tag = pwdTag },
					new EncryptedValue { Nonce = rkNonce, CipherText = rkCt, Tag = rkTag },
					(int)KdfMode.Default, 
					1);
			}

			lockoutPolicy.RegisterSuccessfulLogin(user!, now);
			await db.SaveChangesAsync();

			return WrapsResult.Ok(user!.MkWrapPwd, user.MkWrapRk, (int)user.KdfMode, user.CryptoSchemaVer);
		}

		public async Task<RecoverResult> RecoverAsync(RecoverCommand cmd)
		{
			var validationError = validator.ValidateRecover(cmd);
			if (validationError is not null)
				return RecoverResult.Fail(validationError.Value);

			try
			{
				var now = DateTime.UtcNow;
				var user = await db.Users.SingleOrDefaultAsync(u => u.Id == cmd.AccountId);

				var verificationSalt = user?.S_Rk ?? cryptoHelpers.ComputeFakeSalt(cmd.AccountId);
				var expectedVerifier = user?.RkVerifier ?? new byte[CryptoSizes.VerifierLen];

				var computed = cryptoHelpers.ComputeStoredVerifier(cmd.RkVerifier, verificationSalt);
				var proofValid = user != null && CryptographicOperations.FixedTimeEquals(expectedVerifier, computed);
				
				CryptographicOperations.ZeroMemory(computed);

				if (user != null && lockoutPolicy.IsLockedOut(user, now))
				{			
					proofValid = false;
				}

				// always rotate credentials to equalize timing
				var sVerifier = new byte[CryptoSizes.SaltLen];
				var sAdminVerifier = new byte[CryptoSizes.SaltLen];
				var sRk = new byte[CryptoSizes.SaltLen];

				RandomNumberGenerator.Fill(sVerifier);
				RandomNumberGenerator.Fill(sAdminVerifier);
				RandomNumberGenerator.Fill(sRk);

				var storedVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.NewVerifier, sVerifier);
				var storedAdminVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.NewAdminVerifier, sAdminVerifier);
				var storedRkVerifier = cryptoHelpers.ComputeStoredVerifier(cmd.NewRkVerifier, sRk);

				if (!proofValid)
				{
					if (user != null)
					{
						lockoutPolicy.RegisterFailedLogin(user, now);
						await db.SaveChangesAsync();
						return RecoverResult.Fail(RecoverError.InvalidRkVerifier);
					}

					return RecoverResult.Fail(RecoverError.AccountNotFound);
				}

				lockoutPolicy.RegisterSuccessfulLogin(user!, now);

				user!.Verifier = storedVerifier;
				user.S_Verifier = sVerifier;
				user.AdminVerifier = storedAdminVerifier;
				user.S_AdminVerifier = sAdminVerifier;
				user.RkVerifier = storedRkVerifier;
				user.S_Rk = sRk;

				user.S_Pwd = cmd.NewS_Pwd;
				user.KdfMode = cmd.NewKdfMode;
				user.MkWrapPwd = cmd.NewMkWrapPwd;
				user.MkWrapRk = cmd.NewMkWrapRk;
				user.CryptoSchemaVer = cmd.CryptoSchemaVer;
				user.UpdatedAt = DateTime.UtcNow;

				await db.SaveChangesAsync();

				await refreshTokenStore.RevokeAllAsync(user.Id, now);

				return RecoverResult.Ok();
			}
			finally
			{
				CryptographicOperations.ZeroMemory(cmd.RkVerifier);
				CryptographicOperations.ZeroMemory(cmd.NewVerifier);
				CryptographicOperations.ZeroMemory(cmd.NewAdminVerifier);
				CryptographicOperations.ZeroMemory(cmd.NewRkVerifier);
			}
		}

		// these methods were made purely to increase readability of the main async ones
		private static User CreateUserFromRegisterCommand(
			RegisterCommand cmd, 
			byte[] sVerifier, 
			byte[] verifier,
			byte[] sAdminVerifier,
			byte[] adminVerifier,
			byte[] sRk,
			byte[] rkVerifier)
		{
			var now = DateTime.UtcNow;

			return new User
			{
				Id = cmd.AccountId,
				Verifier = verifier,
				S_Verifier = sVerifier,
				AdminVerifier = adminVerifier,
				S_AdminVerifier = sAdminVerifier,
				RkVerifier = rkVerifier,
				S_Rk = sRk,
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
