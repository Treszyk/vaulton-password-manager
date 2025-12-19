using Application.Services.Auth.Errors;

namespace Application.Services.Auth.Results;

public sealed record RefreshResult(
	bool Success,
	string? AccessToken,
	string? RefreshToken,
	DateTime? RefreshExpiresAt,
	RefreshError? Error
)
{
	public static RefreshResult Ok(string accessToken, string refreshToken, DateTime refreshExpiresAt)
		=> new(true, accessToken, refreshToken, refreshExpiresAt, null);

	public static RefreshResult Fail(RefreshError error)
		=> new(false, null, null, null, error);
}
