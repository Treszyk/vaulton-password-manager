using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record LoginResponse(
	[property: JsonPropertyName("Token")] string Token
);
