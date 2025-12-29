using Core.Crypto;

namespace Application.Services.Auth.Commands;

public sealed record ChangePasswordCommand(
	Guid AccountId,
	byte[] AdminVerifier,
	byte[] NewVerifier,
	byte[] NewAdminVerifier,
	byte[] NewS_Pwd,
	KdfMode NewKdfMode,
	EncryptedValue NewMkWrapPwd,
	EncryptedValue? NewMkWrapRk,
	int CryptoSchemaVer
);
