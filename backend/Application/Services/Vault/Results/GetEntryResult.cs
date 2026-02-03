using Application.Services.Vault.Errors;
using Core.Crypto;

namespace Application.Services.Vault.Results;

public sealed record GetEntryResult(
	bool Success,
	Guid? EntryId,
	EncryptedValue? Payload,
	VaultError? Error
)
{
	public static GetEntryResult Ok(Guid entryId, EncryptedValue payload)
		=> new(true, entryId, payload, null);

	public static GetEntryResult Fail(VaultError error)
		=> new(false, null, null, error);
}
