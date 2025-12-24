using Application.Services.Auth.Errors;

namespace Application.Services.Auth.Results;

public sealed record LoginResult(
	bool Success,
	string? Token,
	string? RefreshToken,
	DateTime? RefreshExpiresAt,
	LoginError? Error
)
{
	public static LoginResult Ok(string token, string refreshToken, DateTime refreshExpiresAt)
		=> new(true, token, refreshToken, refreshExpiresAt, null);

	public static LoginResult Fail(LoginError error)
		=> new(false, null, null, null, error);
}
