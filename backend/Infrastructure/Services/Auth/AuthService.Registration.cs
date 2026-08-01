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
	public sealed partial class AuthService
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
