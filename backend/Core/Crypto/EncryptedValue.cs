namespace Core.Crypto;

public sealed record class EncryptedValue
{
	// AES-GCM
	public byte[] Nonce { get; set; } = default!;
	public byte[] CipherText { get; set; } = default!;
	public byte[] Tag { get; set; } = default!;
}
