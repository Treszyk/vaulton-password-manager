namespace Application.Services.Auth.Results;

public enum RefreshTokenRotationStatus
{
	Invalid,
	Revoked,
	RecentlyRevoked,
	Rotated
}
