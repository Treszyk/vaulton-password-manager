using Infrastructure.Services.Auth;
using Microsoft.Extensions.Configuration;
using FluentAssertions;

namespace Tests.Unit
{
	public class AuthCryptoHelpersTests
	{
		private readonly AuthCryptoHelpers _sut;
		private readonly AuthCryptoOptions _options;

		public AuthCryptoHelpersTests()
		{
			var pepperBytes = new byte[32];
			var fakeSaltBytes = new byte[32];

			Array.Fill(pepperBytes, (byte)1);
			Array.Fill(fakeSaltBytes, (byte)2);

			var pepperB64 = Convert.ToBase64String(pepperBytes);
			var fakeSaltB64 = Convert.ToBase64String(fakeSaltBytes);

			var inMemoryConfig = new Dictionary<string, string?>
			{
				["Auth:VerifierPbkdf2Iterations"] = "1000",
				["Auth:VerifierPepper"] = pepperB64,
				["Auth:FakeSaltSecret"] = fakeSaltB64
			};

			var config = new ConfigurationBuilder()
				.AddInMemoryCollection(inMemoryConfig)
				.Build();

			_options = new AuthCryptoOptions(config);
			_sut = new AuthCryptoHelpers(_options);
		}

		[Fact]
		public void ComputeStoredVerifier_should_produce_deterministic_hash()
		{
			var verifierRaw = new byte[] { 10, 20, 30 };
			var salt = new byte[16];

			var hash1 = _sut.ComputeStoredVerifier(verifierRaw, salt);
			var hash2 = _sut.ComputeStoredVerifier(verifierRaw, salt);

			hash1.Should().HaveCount(32);
			hash1.Should().Equal(hash2);
		}

		[Fact]
		public void ComputeStoredVerifier_should_change_if_salt_changes()
		{
			var verifierRaw = new byte[] { 10, 20, 30 };
			var salt1 = new byte[16];
			var salt2 = new byte[16]; 
			salt2[0] = 1;

			var hash1 = _sut.ComputeStoredVerifier(verifierRaw, salt1);
			var hash2 = _sut.ComputeStoredVerifier(verifierRaw, salt2);

			hash1.Should().NotEqual(hash2);
		}

		[Fact]
		public void ComputeStoredVerifier_should_change_if_input_changes()
		{
			var verifierRaw1 = new byte[] { 10, 20, 30 };
			var verifierRaw2 = new byte[] { 10, 20, 31 };
			var salt = new byte[16];

			var hash1 = _sut.ComputeStoredVerifier(verifierRaw1, salt);
			var hash2 = _sut.ComputeStoredVerifier(verifierRaw2, salt);

			hash1.Should().NotEqual(hash2);
		}
	}
}
