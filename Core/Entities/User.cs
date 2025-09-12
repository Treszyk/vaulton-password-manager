namespace Core.Entities;

public class User
{
	public Guid Id { get; set; }

	// Auth
	public required byte[] Verifier { get; set; }    // Argon2id hash of the login password
	public required byte[] S_Pwd { get; set; }       // Salt used with Argon2id for the password

	// Recovery Key - user can opt in for recovery, might change it to forced
	public byte[]? S_Rk { get; set; }                // Salt used with Argon2id for the recovery Key
	public byte[]? MK_Wrap_Rk { get; set; }          // Master Key encrypted with the recovery Key

	public required byte[] MK_Wrap_Pwd { get; set; } // MK wrapped/encrypted with the password

	// metadata
	public DateTime CreatedAt { get; set; }
	public DateTime UpdatedAt { get; set; }
	public DateTime? LastLoginAt { get; set; }
}
