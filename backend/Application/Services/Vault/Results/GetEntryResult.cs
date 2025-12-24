using Application.Services.Vault.Errors;
using Core.Crypto;

namespace Application.Services.Vault.Results;

public sealed record GetEntryResult(
	bool Success,
	Guid? EntryId,
	byte[]? DomainTag,
	EncryptedValue? Payload,
	VaultError? Error
)
{
	public static GetEntryResult Ok(Guid entryId, byte[] domainTag, EncryptedValue payload)
		=> new(true, entryId, domainTag, payload, null);

	public static GetEntryResult Fail(VaultError error)
		=> new(false, null, null, null, error);
}
