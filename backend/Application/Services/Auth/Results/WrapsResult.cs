using Application.Services.Auth.Errors;
using Core.Crypto;

namespace Application.Services.Auth.Results;

public sealed class WrapsResult
{
	public bool Success { get; }
	public WrapsError? Error { get; }
	public EncryptedValue? MkWrapPwd { get; }
	public EncryptedValue? MkWrapRk { get; }
	public int KdfMode { get; }
	public int CryptoSchemaVer { get; }

	private WrapsResult(bool success, WrapsError? error, EncryptedValue? mkWrapPwd, EncryptedValue? mkWrapRk, int kdfMode = 0, int schemaVer = 0)
	{
		Success = success;
		Error = error;
		MkWrapPwd = mkWrapPwd;
		MkWrapRk = mkWrapRk;
		KdfMode = kdfMode;
		CryptoSchemaVer = schemaVer;
	}

	public static WrapsResult Ok(EncryptedValue mkWrapPwd, EncryptedValue mkWrapRk, int kdfMode, int schemaVer) => new(true, null, mkWrapPwd, mkWrapRk, kdfMode, schemaVer);
	public static WrapsResult Fail(WrapsError error) => new(false, error, null, null);
}
