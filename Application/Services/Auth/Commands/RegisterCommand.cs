using Core.Crypto;

namespace Application.Services.Auth.Commands;

public sealed record RegisterCommand(
	Guid AccountId,
	byte[] Verifier,
	byte[] S_Pwd,
	int ArgonMem,
	int ArgonTime,
	int ArgonLanes,
	int ArgonVersion,
	EncryptedValue MkWrapPwd,
	EncryptedValue? MkWrapRk,
	int CryptoSchemaVer
);
