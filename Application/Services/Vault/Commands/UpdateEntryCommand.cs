using Core.Crypto;

namespace Application.Services.Vault.Commands;

public sealed record UpdateEntryCommand(
	Guid AccountId,
	Guid EntryId,
	byte[] DomainTag,
	EncryptedValue Payload
);
