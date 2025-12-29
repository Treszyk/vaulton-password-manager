using Application.Services.Auth.Errors;
using Core.Crypto;

namespace Application.Services.Auth.Results;

public sealed class WrapsResult
{
	public bool Success { get; }
	public WrapsError? Error { get; }
	public EncryptedValue? MkWrapPwd { get; }
	public EncryptedValue? MkWrapRk { get; }

	private WrapsResult(bool success, WrapsError? error, EncryptedValue? mkWrapPwd, EncryptedValue? mkWrapRk)
	{
		Success = success;
		Error = error;
		MkWrapPwd = mkWrapPwd;
		MkWrapRk = mkWrapRk;
	}

	public static WrapsResult Ok(EncryptedValue mkWrapPwd, EncryptedValue? mkWrapRk) => new(true, null, mkWrapPwd, mkWrapRk);
	public static WrapsResult Fail(WrapsError error) => new(false, error, null, null);
}
