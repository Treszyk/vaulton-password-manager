using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Core.Crypto;

namespace Api.DTOs.Auth;

public sealed record LoginRequest(
	[Required][property: JsonPropertyName("AccountId")] Guid AccountId,
	
	[Required]
	[Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("Verifier")] byte[] Verifier
);



