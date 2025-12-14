namespace Core.Entities;

public class Entry
{
	public Guid Id { get; set; }
	public Guid UserId { get; set; }

	// Encryption fields
	public byte[] Nonce { get; set; } = default!;       // random value that makes each encryption unique
	public byte[] CipherText { get; set; } = default!;  // Encrypted payload, encrypt-all
	public byte[] Tag { get; set; } = default!;         // Auth tag, to make sure the payload wasnt tampered with since last encryption

	// Domain tag for extension-friendly lookup (HMAC(K_tag, normalizedDomain))
	public byte[] DomainTag { get; set; } = default!;

	// metadata
	public DateTime CreatedAt { get; set; }
	public DateTime UpdatedAt { get; set; }
}
