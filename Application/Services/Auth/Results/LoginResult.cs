using Application.Services.Auth.Errors;

namespace Application.Services.Auth.Results;

public sealed record LoginResult(
	bool Success,
	string? Token,
	LoginError? Error
)
{
	public static LoginResult Ok(string token) => new(true, token, null);
	public static LoginResult Fail(LoginError error) => new(false, null, error);
}
