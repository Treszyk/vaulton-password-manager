using Application.Services.Vault.Errors;

namespace Application.Services.Vault.Results;

public sealed record ListEntriesResult(
	bool Success,
	IReadOnlyList<EntryListItem>? Entries,
	VaultError? Error
)
{
	public static ListEntriesResult Ok(IReadOnlyList<EntryListItem> entries) => new(true, entries, null);
	public static ListEntriesResult Fail(VaultError error) => new(false, null, error);
}
