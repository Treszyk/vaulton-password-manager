using System.Text.Json.Serialization;

namespace Api.DTOs.Vault;

public sealed record PreCreateEntryResponse(
	[property: JsonPropertyName("EntryId")] Guid EntryId
);
