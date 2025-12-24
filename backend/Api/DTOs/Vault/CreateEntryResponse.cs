using System.Text.Json.Serialization;

namespace Api.DTOs.Vault;

public sealed record CreateEntryResponse(
	[property: JsonPropertyName("EntryId")] Guid EntryId
);
