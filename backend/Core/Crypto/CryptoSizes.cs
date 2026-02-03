namespace Core.Crypto;

public static class CryptoSizes
{
	public const int VerifierLen = 32;   // K_vrf (HKDF output)
	public const int MkLen = 32;         // 256-bit Master Key
	public const int SaltLen = 16;       // S_Pwd, S_Verifier

	public const int GcmNonceLen = 12;   // AES-GCM standard nonce length
	public const int GcmTagLen = 16;     // AES-GCM standard tag length

	public const int PepperLen = 32;

	public const int MaxEntryCiphertextBytes = 4096;
}
