namespace Application.Services.Auth.Commands;

public sealed record WrapsCommand(
	Guid AccountId,
	byte[] AdminVerifier
);
