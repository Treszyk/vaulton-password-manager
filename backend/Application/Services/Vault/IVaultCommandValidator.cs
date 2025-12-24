using Application.Services.Vault.Commands;
using Application.Services.Vault.Errors;

namespace Application.Services.Vault;

public interface IVaultCommandValidator
{
	VaultError? ValidateCreate(CreateEntryCommand cmd);
	VaultError? ValidateList(ListEntriesCommand cmd);
	VaultError? ValidateGet(GetEntryCommand cmd);
	VaultError? ValidateDelete(DeleteEntryCommand cmd);
	VaultError? ValidateUpdate(UpdateEntryCommand cmd);
}
