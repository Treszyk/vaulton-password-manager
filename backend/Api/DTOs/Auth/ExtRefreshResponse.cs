using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record ExtRefreshResponse(
	[property: JsonPropertyName("AccessToken")] string AccessToken,
	[property: JsonPropertyName("RefreshToken")] string RefreshToken
);
