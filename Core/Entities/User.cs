namespace Core.Entities;

public class User
{
	public Guid Id { get; set; }

	// Auth
	public required byte[] Verifier { get; set; }    // Argon2id hash of the login password
	public required byte[] S_Verifier { get; set; }

	// Master Key
	public required byte[] S_Pwd { get; set; }
	public required byte[] MK_Wrap_Pwd { get; set; } // MK wrapped/encrypted with the password

	// Recovery Key - user can opt in for recovery, might change it to forced
	public byte[]? S_Rk { get; set; }
	public byte[]? MK_Wrap_Rk { get; set; }

	// metadata
	public DateTime CreatedAt { get; set; }
	public DateTime UpdatedAt { get; set; }
	public DateTime? LastLoginAt { get; set; }
}
