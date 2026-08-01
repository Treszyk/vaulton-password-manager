using Core.Crypto;
using Microsoft.AspNetCore.WebUtilities;
using System.Security.Cryptography;

namespace Infrastructure.Services.Auth
{
	public sealed class AuthCryptoHelpers(AuthCryptoOptions options)
	{
		public byte[] ComputeStoredVerifier(byte[] verifierRaw, byte[] salt)
		{
			Span<byte> input = stackalloc byte[verifierRaw.Length + options.VerifierPepperBytes.Length];
			verifierRaw.CopyTo(input);
			options.VerifierPepperBytes.CopyTo(input[verifierRaw.Length..]);

			try
			{
				var result = new byte[CryptoSizes.VerifierLen];
				Rfc2898DeriveBytes.Pbkdf2(
					input,
					salt,
					result,
					options.VerifierPbkdf2Iterations,
					HashAlgorithmName.SHA256);
				return result;
			}
			finally
			{
				CryptographicOperations.ZeroMemory(input);
			}
		}

		public byte[] ComputeFakeSalt(Guid accountId)
		{
			return ComputeFakeBlob(accountId, "Vaulton.FakeSalt.v1", CryptoSizes.SaltLen);
		}

		public (byte[] Nonce, byte[] CipherText, byte[] Tag) ComputeFakeWraps(Guid accountId, string label, ReadOnlySpan<byte> extraSeed = default)
		{
			var nonce = ComputeFakeBlob(accountId, $"Vaulton.FakeNonce.v1.{label}", CryptoSizes.GcmNonceLen, extraSeed);
			var ct = ComputeFakeBlob(accountId, $"Vaulton.FakeCT.v1.{label}", CryptoSizes.MkLen, extraSeed);
			var tag = ComputeFakeBlob(accountId, $"Vaulton.FakeTag.v1.{label}", CryptoSizes.GcmTagLen, extraSeed);

			return (nonce, ct, tag);
		}

		private byte[] ComputeFakeBlob(Guid accountId, string contextLabel, int length, ReadOnlySpan<byte> extraSeed = default)
		{
			Span<byte> idBytes = stackalloc byte[16];
			if (!accountId.TryWriteBytes(idBytes))
			{
				throw new InvalidOperationException("Failed to write Guid bytes.");
			}

			int contextByteCount = System.Text.Encoding.UTF8.GetByteCount(contextLabel);
			int inputLen = contextByteCount + idBytes.Length + extraSeed.Length;

			Span<byte> input = stackalloc byte[inputLen];
			System.Text.Encoding.UTF8.GetBytes(contextLabel, input);
			idBytes.CopyTo(input[contextByteCount..]);

			if (extraSeed.Length > 0)
			{
				extraSeed.CopyTo(input[(contextByteCount + idBytes.Length)..]);
			}

			try
			{
				Span<byte> hash = stackalloc byte[32];
				HMACSHA256.HashData(options.FakeSaltSecretBytes, input, hash);

				var result = new byte[length];
				var take = Math.Min(hash.Length, length);
				hash[..take].CopyTo(result);

				return result;
			}
			finally
			{
				CryptographicOperations.ZeroMemory(input);
			}
		}

		public static (string token, byte[] tokenHash) MintRefreshToken()
		{
			Span<byte> raw = stackalloc byte[64];
			RandomNumberGenerator.Fill(raw);

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

			Span<byte> raw = stackalloc byte[64];
			try
			{
				if (!System.Buffers.Text.Base64Url.TryDecodeFromChars(token, raw, out int bytesWritten) || bytesWritten != 64)
				{
					return false;
				}

				hash = SHA256.HashData(raw);
				return true;
			}
			catch
			{
				return false;
			}
			finally
			{
				CryptographicOperations.ZeroMemory(raw);
			}
		}
	}
}