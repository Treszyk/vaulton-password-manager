using Core.Crypto;

namespace Core.Entities;

public class User
{
	public Guid Id { get; set; }

	// Auth
	public required byte[] Verifier { get; set; }    // PBKDF2+pepper hash of K_vrf (password-derived verifier)
	public required byte[] S_Verifier { get; set; }

	// Initial KDF salt
	public required byte[] S_Pwd { get; set; }

	// Maps to libsodium defaults
	public KdfMode KdfMode { get; set; }

	// Master key wraps
	public required EncryptedValue MkWrapPwd { get; set; }
	public EncryptedValue? MkWrapRk { get; set; }

	// Crypto schema version (always 1 in this prototype)
	public int CryptoSchemaVer { get; set; }

	// metadata
	public DateTime CreatedAt { get; set; }
	public DateTime UpdatedAt { get; set; }
	public DateTime? LastLoginAt { get; set; }
}
