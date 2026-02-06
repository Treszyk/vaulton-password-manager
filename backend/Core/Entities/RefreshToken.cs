namespace Core.Entities;

public class RefreshToken
{
	public Guid Id { get; set; }
	public Guid UserId { get; set; }

	// Hash of the opaque refresh token
	public byte[] TokenHash { get; set; } = default!;

	public DateTime CreatedAt { get; set; }
	public DateTime ExpiresAt { get; set; }
	public DateTime? RevokedAt { get; set; }

	// Hash of the active access token's Jti
	public byte[]? AccessTokenJtiHash { get; set; }

	public User? User { get; set; }
}
