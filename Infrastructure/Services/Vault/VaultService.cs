using Application.Services.Vault;
using Application.Services.Vault.Commands;
using Application.Services.Vault.Errors;
using Application.Services.Vault.Results;
using Infrastructure.Data;

namespace Infrastructure.Services.Vault;

public sealed class VaultService(VaultonDbContext db) : IVaultService
{
	private readonly VaultonDbContext _db = db;

	public Task<CreateEntryResult> CreateEntryAsync(CreateEntryCommand cmd)
		=> Task.FromResult(CreateEntryResult.Fail(VaultError.NotImplemented));

	public Task<ListEntriesResult> ListEntriesAsync(ListEntriesCommand cmd)
		=> Task.FromResult(ListEntriesResult.Fail(VaultError.NotImplemented));

	public Task<GetEntryResult> GetEntryAsync(GetEntryCommand cmd)
		=> Task.FromResult(GetEntryResult.Fail(VaultError.NotImplemented));

	public Task<DeleteEntryResult> DeleteEntryAsync(DeleteEntryCommand cmd)
		=> Task.FromResult(DeleteEntryResult.Fail(VaultError.NotImplemented));
}
