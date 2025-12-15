namespace Application.Services.Auth.Commands;

public sealed record LoginCommand(
	Guid AccountId,
	byte[] Verifier
);
