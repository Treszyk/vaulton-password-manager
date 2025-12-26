using Application.Services.Auth.Errors;
using Core.Crypto;

namespace Application.Services.Auth.Results;

public sealed record LoginResult(
	bool Success,
	string? Token,
	string? RefreshToken,
	DateTime? RefreshExpiresAt,
	EncryptedValue? MkWrapPwd,
	EncryptedValue? MkWrapRk,
	LoginError? Error
)
{
	public static LoginResult Ok(string token, string refreshToken, DateTime refreshExpiresAt, EncryptedValue mkWrapPwd, EncryptedValue? mkWrapRk)
		=> new(true, token, refreshToken, refreshExpiresAt, mkWrapPwd, mkWrapRk, null);

	public static LoginResult Fail(LoginError error)
		=> new(false, null, null, null, null, null, error);
}
