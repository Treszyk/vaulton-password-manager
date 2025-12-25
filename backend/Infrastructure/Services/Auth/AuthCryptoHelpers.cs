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

		public byte[] ComputeFakeSalt(Guid accountId)
		{
			ReadOnlySpan<byte> context = "Vaulton.FakeSalt.v1"u8;
			
			Span<byte> idBytes = stackalloc byte[16];
			if (!accountId.TryWriteBytes(idBytes))
			{
				throw new InvalidOperationException("Failed to write Guid bytes.");
			}

			var inputLen = context.Length + idBytes.Length;
			byte[] input = new byte[inputLen];
			
			context.CopyTo(input);
			idBytes.CopyTo(input.AsSpan(context.Length));

			try
			{
				using var hmac = new HMACSHA256(options.FakeSaltSecretBytes);
				var hash = hmac.ComputeHash(input);

				var result = new byte[CryptoSizes.SaltLen];
				Buffer.BlockCopy(hash, 0, result, 0, CryptoSizes.SaltLen);

				return result;
			}
			finally
			{
				CryptographicOperations.ZeroMemory(input);
			}
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
			if (token.Length < 86 || token.Length > 88)
			{
				return false;
			}

			byte[] raw;
			try
			{
				raw = WebEncoders.Base64UrlDecode(token);
			}
			catch
			{
				return false;
			}

			try
			{
				if (raw.Length != 64)
				{
					return false;
				}

				hash = SHA256.HashData(raw);
				return true;
			}
			finally
			{
				CryptographicOperations.ZeroMemory(raw);
			}
		}
	}
}