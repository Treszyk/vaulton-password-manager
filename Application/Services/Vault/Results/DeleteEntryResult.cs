using Application.Services.Vault.Errors;

namespace Application.Services.Vault.Results;

public sealed record DeleteEntryResult(
	bool Success,
	VaultError? Error
)
{
	public static DeleteEntryResult Ok() => new(true, null);
	public static DeleteEntryResult Fail(VaultError error) => new(false, error);
}
