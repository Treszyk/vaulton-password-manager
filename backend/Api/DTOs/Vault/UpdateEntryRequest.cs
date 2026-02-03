using Api.DTOs.Crypto;
using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Vault;

public sealed record UpdateEntryRequest(
	[param: Required]
	[property: JsonPropertyName("Payload")]
	EncryptedValueDto Payload
);
