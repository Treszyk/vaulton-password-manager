using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Application.Services.Auth.Results;
using Core.Crypto;
using Core.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace Infrastructure.Services.Auth
{
	public sealed partial class AuthService
	{
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
	}
}
