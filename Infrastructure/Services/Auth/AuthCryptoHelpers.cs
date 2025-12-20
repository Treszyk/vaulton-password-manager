using Core.Crypto;
using Microsoft.AspNetCore.WebUtilities;
using System.Security.Cryptography;

namespace Infrastructure.Services.Auth
{
	public sealed class AuthCryptoHelpers(AuthCryptoOptions options)
	{
		public byte[] ComputeStoredVerifier(byte[] verifierRaw, byte[] salt)
		{
			var input = new byte[verifierRaw.Length + options.VerifierPepperBytes.Length];
			Buffer.BlockCopy(verifierRaw, 0, input, 0, verifierRaw.Length);
			Buffer.BlockCopy(options.VerifierPepperBytes, 0, input, verifierRaw.Length, options.VerifierPepperBytes.Length);

			try
			{
				using var pbkdf2 = new Rfc2898DeriveBytes(input, salt, options.VerifierPbkdf2Iterations, HashAlgorithmName.SHA256);
				return pbkdf2.GetBytes(CryptoSizes.VerifierLen);
			}
			finally
			{
				CryptographicOperations.ZeroMemory(input);
			}
		}

		public static bool IsValidMkWrap(EncryptedValue w)
		{
			return w.Nonce is { Length: CryptoSizes.GcmNonceLen }
				&& w.Tag is { Length: CryptoSizes.GcmTagLen }
				&& w.CipherText is { Length: CryptoSizes.MkLen };
		}

		public static (string token, byte[] tokenHash) MintRefreshToken()
		{
			var raw = RandomNumberGenerator.GetBytes(64);
			try
			{
				var token = WebEncoders.Base64UrlEncode(raw);
				var hash = SHA256.HashData(raw);
				return (token, hash);
			}
			finally
			{
				CryptographicOperations.ZeroMemory(raw);
			}
		}

		public static bool TryHashRefreshToken(string token, out byte[] hash)
		{
			hash = Array.Empty<byte>();
			try
			{
				var raw = WebEncoders.Base64UrlDecode(token);
				hash = SHA256.HashData(raw);
				return true;
			}
			catch
			{
				return false;
			}
		}
	}
}