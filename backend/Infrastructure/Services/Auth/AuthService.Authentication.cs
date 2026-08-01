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
				Span<byte> jtiBytes = stackalloc byte[128];
				int jtiLen = System.Text.Encoding.UTF8.GetBytes(issued.Jti, jtiBytes);
				var jtiHash = SHA256.HashData(jtiBytes[..jtiLen]);
				
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
			if (cmd.AccountId == Guid.Empty)
			{
				return PreLoginResult.Fail(PreLoginError.InvalidAccountId);
			}

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
	}
}
