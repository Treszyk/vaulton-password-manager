using Api.DTOs.Crypto;
using System.Text.Json.Serialization;

namespace Api.DTOs.Vault;

public sealed record EntryDto(
	[property: JsonPropertyName("Id")] Guid Id,
	[property: JsonPropertyName("Payload")] EncryptedValueDto Payload
);
