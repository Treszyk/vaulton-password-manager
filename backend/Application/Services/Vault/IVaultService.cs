using Application.Services.Vault.Commands;
using Application.Services.Vault.Results;

namespace Application.Services.Vault;

public interface IVaultService
{
	Task<Guid> PreCreateEntryAsync();
	Task<CreateEntryResult> CreateEntryAsync(CreateEntryCommand cmd);
	Task<ListEntriesResult> ListEntriesAsync(ListEntriesCommand cmd);
	Task<GetEntryResult> GetEntryAsync(GetEntryCommand cmd);
	Task<DeleteEntryResult> DeleteEntryAsync(DeleteEntryCommand cmd);
	Task<UpdateEntryResult> UpdateEntryAsync(UpdateEntryCommand cmd);
}
