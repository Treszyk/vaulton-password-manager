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
	[property: JsonPropertyName("Payload")]
	EncryptedValueDto Payload
);
