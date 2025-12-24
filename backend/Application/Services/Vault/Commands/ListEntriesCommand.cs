namespace Application.Services.Vault.Commands;

public sealed record ListEntriesCommand(Guid AccountId, int Skip, int Take);

