namespace Application.Services.Auth.Results;

public sealed record RefreshTokenRotationResult(
	RefreshTokenRotationStatus Status,
	Guid? UserId,
	string? Token,
	DateTime? ExpiresAt);
