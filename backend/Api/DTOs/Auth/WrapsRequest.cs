using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;
using Core.Crypto;

namespace Api.DTOs.Auth;

public sealed record WrapsRequest(
	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("AdminVerifier")]
	byte[] AdminVerifier
);
