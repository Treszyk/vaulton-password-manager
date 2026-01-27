using Core.Crypto;

namespace Application.Services.Auth.Commands;

public sealed record RegisterCommand(
	Guid AccountId,
	byte[] Verifier,
	byte[] AdminVerifier,
	byte[] RkVerifier,
	byte[] S_Pwd,
	KdfMode KdfMode,
	EncryptedValue MkWrapPwd,
	EncryptedValue MkWrapRk,
	int CryptoSchemaVer
);
