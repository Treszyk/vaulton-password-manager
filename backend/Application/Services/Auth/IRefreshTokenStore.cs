using Application.Services.Auth.Results;

namespace Application.Services.Auth;

public interface IRefreshTokenStore
{
	Task<RefreshTokenIssueResult> MintAsync(Guid userId, byte[] jtiHash, DateTime now);
	Task<RefreshTokenRotationResult> RotateAsync(string refreshToken, byte[] jtiHash, DateTime now);
	Task RevokeAsync(string refreshToken, DateTime now);
	Task RevokeAllAsync(Guid accountId, DateTime now);
	Task<Guid?> GetUserIdByTokenAsync(string refreshToken);
}
