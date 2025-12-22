using Application.Services.Vault;
using Application.Services.Vault.Commands;
using Application.Services.Vault.Errors;
using Application.Services.Vault.Results;
using Core.Crypto;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Vault;

public sealed class VaultService(VaultonDbContext db) : IVaultService
{
	private readonly VaultonDbContext _db = db;

	public async Task<CreateEntryResult> CreateEntryAsync(CreateEntryCommand cmd)
	{
		if (cmd.AccountId == Guid.Empty)
			return CreateEntryResult.Fail(VaultError.InvalidCryptoBlob);

		if (!IsValidDomainTag(cmd.DomainTag) || !IsValidPayload(cmd.Payload))
			return CreateEntryResult.Fail(VaultError.InvalidCryptoBlob);

		var now = DateTime.UtcNow;

		var entry = new Entry
		{
			Id = Guid.NewGuid(),
			UserId = cmd.AccountId,
			DomainTag = cmd.DomainTag,
			Payload = cmd.Payload,
			CreatedAt = now,
			UpdatedAt = now
		};

		_db.Entries.Add(entry);
		await _db.SaveChangesAsync();

		return CreateEntryResult.Ok(entry.Id);
	}
	
	public Task<ListEntriesResult> ListEntriesAsync(ListEntriesCommand cmd)
		=> Task.FromResult(ListEntriesResult.Fail(VaultError.NotImplemented));
	
	public async Task<GetEntryResult> GetEntryAsync(GetEntryCommand cmd)
	{
		if (cmd.AccountId == Guid.Empty || cmd.EntryId == Guid.Empty)
			return GetEntryResult.Fail(VaultError.NotFound);

		var e = await _db.Entries
			.AsNoTracking()
			.SingleOrDefaultAsync(x => x.Id == cmd.EntryId && x.UserId == cmd.AccountId);

		if (e is null)
			return GetEntryResult.Fail(VaultError.NotFound);

		return GetEntryResult.Ok(e.Id, e.DomainTag, e.Payload);
	}
	
	public Task<DeleteEntryResult> DeleteEntryAsync(DeleteEntryCommand cmd)
		=> Task.FromResult(DeleteEntryResult.Fail(VaultError.NotImplemented));

	private static bool IsValidDomainTag(byte[] tag)
		=> tag is { Length: CryptoSizes.DomainTagLen };
	private static bool IsValidPayload(EncryptedValue p)
		=> p.Nonce is { Length: CryptoSizes.GcmNonceLen }
		&& p.Tag is { Length: CryptoSizes.GcmTagLen }
		&& p.CipherText is { Length: > 0 };
}
