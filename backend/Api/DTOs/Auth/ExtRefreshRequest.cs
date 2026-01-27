using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record ExtRefreshRequest(
	[property: JsonPropertyName("RefreshToken")] string RefreshToken
);
