using Core.Crypto;

namespace Application.Services.Auth.Commands;

public sealed record RecoverCommand(
	Guid AccountId,
	byte[] RkVerifier,
	byte[] NewVerifier,
	byte[] NewAdminVerifier,
	byte[] NewRkVerifier,
	byte[] NewS_Pwd,
	KdfMode NewKdfMode,
	EncryptedValue NewMkWrapPwd,
	EncryptedValue NewMkWrapRk,
	int CryptoSchemaVer
);
