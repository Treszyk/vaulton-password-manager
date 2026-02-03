using Core.Crypto;

namespace Core.Entities;

public class Entry
{
	public Guid Id { get; set; }
	public Guid UserId { get; set; }

	// Encrypted payload AES-GCM
	public EncryptedValue Payload { get; set; } = default!;

	// metadata
	public DateTime CreatedAt { get; set; }
	public DateTime UpdatedAt { get; set; }
}
