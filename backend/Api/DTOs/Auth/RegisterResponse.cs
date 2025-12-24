using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record RegisterResponse(
	[property: JsonPropertyName("AccountId")] Guid AccountId
);
