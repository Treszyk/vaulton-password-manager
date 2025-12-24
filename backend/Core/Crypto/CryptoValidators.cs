namespace Core.Crypto;

public static class CryptoValidators
{
	public static bool IsValidEncryptedValue(EncryptedValue? value, int minCipherTextLen, int maxCipherTextLen)
	{
		if (value is null)
			return false;

		return value.Nonce is { Length: CryptoSizes.GcmNonceLen }
			&& value.Tag is { Length: CryptoSizes.GcmTagLen }
			&& value.CipherText.Length >= minCipherTextLen
			&& value.CipherText.Length <= maxCipherTextLen;
	}

	public static bool IsValidEncryptedValue(EncryptedValue? value, int cipherTextLen)
		=> IsValidEncryptedValue(value, cipherTextLen, cipherTextLen);
}