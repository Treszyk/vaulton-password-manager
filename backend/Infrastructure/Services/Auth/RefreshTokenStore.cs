using Application.Services.Auth;
using Application.Services.Auth.Results;
using Core.Crypto;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace Infrastructure.Services.Auth
{
	public sealed class RefreshTokenStore(VaultonDbContext db) : IRefreshTokenStore
	{
		private static readonly TimeSpan RefreshTtl = TimeSpan.FromDays(7);

		public async Task<RefreshTokenIssueResult> MintAsync(Guid userId, byte[] jtiHash, DateTime now)
		{
			var (refreshToken, refreshHash) = AuthCryptoHelpers.MintRefreshToken();
			var refreshExpires = now.Add(RefreshTtl);

			db.RefreshTokens.Add(new RefreshToken
			{
				Id = Guid.NewGuid(),
				UserId = userId,
				TokenHash = refreshHash,
				AccessTokenJtiHash = jtiHash, // Link JTI hash
				CreatedAt = now,
				ExpiresAt = refreshExpires,
				RevokedAt = null
			});

			await db.SaveChangesAsync();

			return new RefreshTokenIssueResult(refreshToken, refreshExpires);
		}

		public async Task<RefreshTokenRotationResult> RotateAsync(string refreshToken, byte[] jtiHash, DateTime now)
		{
			if (string.IsNullOrWhiteSpace(refreshToken))
				return new RefreshTokenRotationResult(RefreshTokenRotationStatus.Invalid, null, null, null);

			if (!AuthCryptoHelpers.TryHashRefreshToken(refreshToken, out var hash))
				return new RefreshTokenRotationResult(RefreshTokenRotationStatus.Invalid, null, null, null);

			try
			{
				var tokenRow = await db.RefreshTokens
					.SingleOrDefaultAsync(x => x.TokenHash.SequenceEqual(hash));

				if (tokenRow is null)
					return new RefreshTokenRotationResult(RefreshTokenRotationStatus.Invalid, null, null, null);

				if (tokenRow.ExpiresAt <= now)
					return new RefreshTokenRotationResult(RefreshTokenRotationStatus.Invalid, null, null, null);

				if (tokenRow.RevokedAt is not null)
					return new RefreshTokenRotationResult(RefreshTokenRotationStatus.Revoked, tokenRow.UserId, null, null);

				tokenRow.RevokedAt = now;

				var (newToken, newHash) = AuthCryptoHelpers.MintRefreshToken();
				var newExpires = now.Add(RefreshTtl);

				db.RefreshTokens.Add(new RefreshToken
				{
					Id = Guid.NewGuid(),
					UserId = tokenRow.UserId,
					TokenHash = newHash,
					AccessTokenJtiHash = jtiHash,
					CreatedAt = now,
					ExpiresAt = newExpires,
					RevokedAt = null
				});

				await db.SaveChangesAsync();

				return new RefreshTokenRotationResult(RefreshTokenRotationStatus.Rotated, tokenRow.UserId, newToken, newExpires);
			}
			finally
			{
				CryptographicOperations.ZeroMemory(hash);
			}
		}

		public async Task RevokeAsync(string refreshToken, DateTime now)
		{
			if (string.IsNullOrWhiteSpace(refreshToken))
				return;

			if (!AuthCryptoHelpers.TryHashRefreshToken(refreshToken, out var hash))
				return;

			try
			{
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

		public async Task RevokeAllAsync(Guid accountId, DateTime now)
		{
			await db.RefreshTokens
				.Where(rt => rt.UserId == accountId && rt.RevokedAt == null)
				.ExecuteUpdateAsync(s => s.SetProperty(rt => rt.RevokedAt, now));
		}

		public async Task<Guid?> GetUserIdByTokenAsync(string refreshToken)
		{
			if (string.IsNullOrWhiteSpace(refreshToken)) return null;
			if (!AuthCryptoHelpers.TryHashRefreshToken(refreshToken, out var hash)) return null;

			try
			{
				var tokenRow = await db.RefreshTokens
					.SingleOrDefaultAsync(x => x.TokenHash.SequenceEqual(hash));

				return tokenRow?.UserId;
			}
			finally
			{
				CryptographicOperations.ZeroMemory(hash);
			}
		}
	}
}
