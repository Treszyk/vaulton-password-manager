using Api.DTOs.Crypto;
using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Vault;

public sealed record CreateEntryRequest(
	[param: Required]
	[property: JsonPropertyName("EntryId")]
	Guid EntryId,

	[param: Required]
	[param: Length(CryptoSizes.DomainTagLen, CryptoSizes.DomainTagLen)]
	[property: JsonPropertyName("DomainTag")]
	byte[] DomainTag,

	[param: Required]
	[property: JsonPropertyName("Payload")]
	EncryptedValueDto Payload
);
