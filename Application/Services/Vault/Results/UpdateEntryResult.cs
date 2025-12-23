using Application.Services.Vault.Errors;

namespace Application.Services.Vault.Results;

public sealed record UpdateEntryResult(
	bool Success,
	VaultError? Error
)
{
	public static UpdateEntryResult Ok() => new(true, null);
	public static UpdateEntryResult Fail(VaultError error) => new(false, error);
}
