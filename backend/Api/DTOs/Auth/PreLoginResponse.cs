namespace Api.DTOs.Auth;

public record PreLoginResponse(
    byte[] S_Pwd,
    int KdfMode,
    int CryptoSchemaVer
);
