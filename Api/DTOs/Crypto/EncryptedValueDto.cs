using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Crypto;

public sealed record EncryptedValueDto(
	[property: Length(CryptoSizes.GcmNonceLen, CryptoSizes.GcmNonceLen)]
	[property: Required]
	[property: JsonPropertyName("Nonce")] byte[] Nonce,

	[property: Required]
	[property: JsonPropertyName("CipherText")] byte[] CipherText,

	[property: Length(CryptoSizes.GcmTagLen, CryptoSizes.GcmTagLen)]
	[property: Required]
	[property: JsonPropertyName("Tag")] byte[] Tag
);
