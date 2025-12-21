using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Crypto;

public sealed record EncryptedValueDto(
	[param: Required]
	[param: Length(CryptoSizes.GcmNonceLen, CryptoSizes.GcmNonceLen)]
	[property: JsonPropertyName("Nonce")]
	byte[] Nonce,

	[param: Required]
	[param: MinLength(1)]
	[property: JsonPropertyName("CipherText")]
	byte[] CipherText,

	[param: Required]
	[param: Length(CryptoSizes.GcmTagLen, CryptoSizes.GcmTagLen)]
	[property: JsonPropertyName("Tag")]
	byte[] Tag
);
