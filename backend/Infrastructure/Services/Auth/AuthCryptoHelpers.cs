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
			byte[] context = System.Text.Encoding.UTF8.GetBytes(contextLabel);
			
			Span<byte> idBytes = stackalloc byte[16];
			if (!accountId.TryWriteBytes(idBytes))
			{
				throw new InvalidOperationException("Failed to write Guid bytes.");
			}

			var inputLen = context.Length + idBytes.Length + extraSeed.Length;
			byte[] input = new byte[inputLen];
			
			Buffer.BlockCopy(context, 0, input, 0, context.Length);
			idBytes.CopyTo(input.AsSpan(context.Length));
			
			if (extraSeed.Length > 0)
			{
				extraSeed.CopyTo(input.AsSpan(context.Length + idBytes.Length));
			}

			try
			{
				using var hmac = new HMACSHA256(options.FakeSaltSecretBytes);
				var hash = hmac.ComputeHash(input);

				var result = new byte[length];
				var take = Math.Min(hash.Length, length);
				Buffer.BlockCopy(hash, 0, result, 0, take);

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