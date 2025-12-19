using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Crypto;

public sealed record EncryptedValueDto(
	[Length(CryptoSizes.GcmNonceLen, CryptoSizes.GcmNonceLen)]
	[Required]
	[property: JsonPropertyName("Nonce")] byte[] Nonce,

	[Required]
	[property: JsonPropertyName("CipherText")] byte[] CipherText,

	[Length(CryptoSizes.GcmTagLen, CryptoSizes.GcmTagLen)]
	[Required]
	[property: JsonPropertyName("Tag")] byte[] Tag
);
