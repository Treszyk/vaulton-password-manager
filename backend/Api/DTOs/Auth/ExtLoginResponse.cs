using System.Text.Json.Serialization;
using Api.DTOs.Crypto;

namespace Api.DTOs.Auth;

public sealed record ExtLoginResponse(
	[property: JsonPropertyName("AccessToken")] string AccessToken,
	[property: JsonPropertyName("RefreshToken")] string RefreshToken,
	[property: JsonPropertyName("MkWrapPwd")] EncryptedValueDto? MkWrapPwd,
	[property: JsonPropertyName("MkWrapRk")] EncryptedValueDto? MkWrapRk
);
