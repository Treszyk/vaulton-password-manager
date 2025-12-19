using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public sealed record LoginRequest(
	[param: Required]
	[property: JsonPropertyName("AccountId")]
	Guid AccountId,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("Verifier")]
	byte[] Verifier
);
