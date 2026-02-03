using Core.Crypto;

namespace Application.Services.Vault.Results;

public sealed record EntryListItem(
	Guid Id,
	EncryptedValue Payload
);
