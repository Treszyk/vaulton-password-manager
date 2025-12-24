namespace Application.Services.Vault.Commands;

public sealed record DeleteEntryCommand(Guid AccountId, Guid EntryId);
