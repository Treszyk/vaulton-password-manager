using Core.Crypto;

namespace Application.Services.Vault.Results;

public sealed record EntryListItem(
	Guid Id,
	byte[] DomainTag,
	EncryptedValue Payload
);
