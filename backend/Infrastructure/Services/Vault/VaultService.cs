using Application.Services.Vault;
using Application.Services.Vault.Commands;
using Application.Services.Vault.Errors;
using Application.Services.Vault.Results;
using Core.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Vault;

public sealed class VaultService(VaultonDbContext db, IVaultCommandValidator validator) : IVaultService
{
	private readonly VaultonDbContext _db = db;
	private readonly IVaultCommandValidator _validator = validator;

	public async Task<CreateEntryResult> CreateEntryAsync(CreateEntryCommand cmd)
	{
		var validationError = _validator.ValidateCreate(cmd);
		if (validationError is not null)
			return CreateEntryResult.Fail(validationError.Value);

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

	public async Task<ListEntriesResult> ListEntriesAsync(ListEntriesCommand cmd)
	{
		var validationError = _validator.ValidateList(cmd);
		if (validationError is not null)
			return ListEntriesResult.Fail(validationError.Value);

		var entries = await _db.Entries
			.AsNoTracking()
			.Where(e => e.UserId == cmd.AccountId)
			.OrderByDescending(e => e.UpdatedAt)
			.Skip(cmd.Skip)
			.Take(cmd.Take)
			.Select(e => new EntryListItem(e.Id, e.DomainTag, e.Payload))
			.ToListAsync();


		return ListEntriesResult.Ok(entries);
	}

	public async Task<GetEntryResult> GetEntryAsync(GetEntryCommand cmd)
	{
		var validationError = _validator.ValidateGet(cmd);
		if (validationError is not null)
			return GetEntryResult.Fail(validationError.Value);

		var e = await _db.Entries
			.AsNoTracking()
			.SingleOrDefaultAsync(x => x.Id == cmd.EntryId && x.UserId == cmd.AccountId);

		if (e is null)
			return GetEntryResult.Fail(VaultError.NotFound);

		return GetEntryResult.Ok(e.Id, e.DomainTag, e.Payload);
	}

	public async Task<DeleteEntryResult> DeleteEntryAsync(DeleteEntryCommand cmd)
	{
		var validationError = _validator.ValidateDelete(cmd);
		if (validationError is not null)
			return DeleteEntryResult.Fail(validationError.Value);

		var rows = await _db.Entries
			.Where(e => e.Id == cmd.EntryId && e.UserId == cmd.AccountId)
			.ExecuteDeleteAsync();

		return rows == 1
			? DeleteEntryResult.Ok()
			: DeleteEntryResult.Fail(VaultError.NotFound);
	}

	public async Task<UpdateEntryResult> UpdateEntryAsync(UpdateEntryCommand cmd)
	{
		var validationError = _validator.ValidateUpdate(cmd);
		if (validationError is not null)
			return UpdateEntryResult.Fail(validationError.Value);

		var e = await _db.Entries
			.SingleOrDefaultAsync(x => x.Id == cmd.EntryId && x.UserId == cmd.AccountId);

		if (e is null)
			return UpdateEntryResult.Fail(VaultError.NotFound);

		e.DomainTag = cmd.DomainTag;
		e.Payload = cmd.Payload;
		e.UpdatedAt = DateTime.UtcNow;

		await _db.SaveChangesAsync();
		return UpdateEntryResult.Ok();
	}
}
