namespace Application.Services.Vault.Commands;

public sealed record GetEntryCommand(Guid AccountId, Guid EntryId);
