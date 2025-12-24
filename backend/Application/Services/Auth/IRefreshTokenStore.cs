using Application.Services.Auth.Results;

namespace Application.Services.Auth;

public interface IRefreshTokenStore
{
	Task<RefreshTokenIssueResult> MintAsync(Guid userId, DateTime now);
	Task<RefreshTokenRotationResult> RotateAsync(string refreshToken, DateTime now);
	Task RevokeAsync(string refreshToken, DateTime now);
	Task RevokeAllAsync(Guid accountId, DateTime now);
}
