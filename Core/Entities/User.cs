namespace Core.Entities;

public class User
{
	public Guid Id { get; set; }

	// Auth
	public required byte[] Verifier { get; set; }    // PBKDF2+pepper hash of K_vrf (password-derived verifier)
	public required byte[] S_Verifier { get; set; }

	// Initial KDF salt
	public required byte[] S_Pwd { get; set; }

	// Argon2id parameters (v1 will likely use global defaults, but these are stored for future-proofing)
	public int ArgonMem { get; set; }
	public int ArgonTime { get; set; }
	public int ArgonLanes { get; set; }
	public int ArgonVersion { get; set; }

	// Master Key wraps
	public required byte[] MK_Wrap_Pwd { get; set; } // MK wrapped with password-derived KEK

	// Recovery Key - user can opt in for recovery, might change it to forced
	public byte[]? MK_Wrap_Rk { get; set; } // MK wrapped with random recovery key

	// Crypto schema version (always 1 in this prototype)
	public int CryptoSchemaVer { get; set; }

	// metadata
	public DateTime CreatedAt { get; set; }
	public DateTime UpdatedAt { get; set; }
	public DateTime? LastLoginAt { get; set; }
}
