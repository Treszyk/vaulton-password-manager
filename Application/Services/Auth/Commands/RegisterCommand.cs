namespace Application.Services.Auth.Commands;

public sealed record RegisterCommand(
	Guid AccountId,
	byte[] Verifier,
	byte[] S_Pwd,
	int ArgonMem,
	int ArgonTime,
	int ArgonLanes,
	int ArgonVersion,
	byte[] MK_Wrap_Pwd,
	byte[]? MK_Wrap_Rk,
	int CryptoSchemaVer
);
