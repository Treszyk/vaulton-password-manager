using Core.Crypto;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.Auth
{
	public sealed class AuthCryptoOptions
	{
		public int VerifierPbkdf2Iterations { get; }
		public byte[] VerifierPepperBytes { get; }
		public byte[] FakeSaltSecretBytes { get; }

		public AuthCryptoOptions(IConfiguration config)
		{
			var iterValue = config["Auth:VerifierPbkdf2Iterations"];
			if (!int.TryParse(iterValue, out var verifierPbkdf2Iterations) || verifierPbkdf2Iterations <= 0)
			{
				verifierPbkdf2Iterations = 600_000; // fallback
			}

			var pepperB64 = config["Auth:VerifierPepper"];
			if (string.IsNullOrWhiteSpace(pepperB64))
				throw new InvalidOperationException("Missing Auth:VerifierPepper configuration.");

			byte[] verifierPepperBytes;
			try
			{
				verifierPepperBytes = Convert.FromBase64String(pepperB64);
			}
			catch (FormatException)
			{
				throw new InvalidOperationException("Auth:VerifierPepper must be base64.");
			}

			if (verifierPepperBytes.Length != CryptoSizes.PepperLen)
				throw new InvalidOperationException("Auth:VerifierPepper must decode to 32 bytes.");

			VerifierPbkdf2Iterations = verifierPbkdf2Iterations;
			VerifierPepperBytes = verifierPepperBytes;

			var fakeSaltB64 = config["Auth:FakeSaltSecret"];
			if (string.IsNullOrWhiteSpace(fakeSaltB64))
				throw new InvalidOperationException("Missing Auth:FakeSaltSecret configuration.");

			try
			{
				FakeSaltSecretBytes = Convert.FromBase64String(fakeSaltB64);
			}
			catch (FormatException)
			{
				throw new InvalidOperationException("Auth:FakeSaltSecret must be base64.");
			}

			if (FakeSaltSecretBytes.Length != 32)
				throw new InvalidOperationException("Auth:FakeSaltSecret must decode to 32 bytes.");
		}
	}
}