using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public sealed record EncryptedValueDto(
	[param: Required]
	[param: Length(CryptoSizes.GcmNonceLen, CryptoSizes.GcmNonceLen)]
	[property: JsonPropertyName("Nonce")]
	byte[] Nonce,

	[param: Required]
	[property: JsonPropertyName("CipherText")]
	byte[] CipherText,

	[param: Required]
	[param: Length(CryptoSizes.GcmTagLen, CryptoSizes.GcmTagLen)]
	[property: JsonPropertyName("Tag")]
	byte[] Tag
);
