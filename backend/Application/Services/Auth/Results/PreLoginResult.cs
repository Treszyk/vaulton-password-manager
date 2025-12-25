using Application.Services.Auth.Errors;
using Core.Crypto;

namespace Application.Services.Auth.Results;

public record PreLoginResult(
    bool Success,
    byte[]? S_Pwd = null,
    KdfMode? KdfMode = null,
    int? CryptoSchemaVer = null,
    PreLoginError? Error = null
)
{
    public static PreLoginResult Ok(byte[] sPwd, KdfMode kdfMode, int cryptoSchemaVer)
        => new(true, sPwd, kdfMode, cryptoSchemaVer);
    public static PreLoginResult Fail(PreLoginError error)
        => new(false, Error: error);
}
