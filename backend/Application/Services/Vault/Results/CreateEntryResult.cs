using Application.Services.Vault.Errors;

namespace Application.Services.Vault.Results;

public sealed record CreateEntryResult(
	bool Success,
	Guid? EntryId,
	VaultError? Error
)
{
	public static CreateEntryResult Ok(Guid entryId) => new(true, entryId, null);
	public static CreateEntryResult Fail(VaultError error) => new(false, null, error);
}
