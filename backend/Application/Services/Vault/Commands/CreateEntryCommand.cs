using Core.Crypto;

namespace Application.Services.Vault.Commands;

public sealed record CreateEntryCommand(
	Guid AccountId,
	byte[] DomainTag,
	EncryptedValue Payload
);
