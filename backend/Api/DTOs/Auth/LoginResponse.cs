using System.Text.Json.Serialization;
using Api.DTOs.Crypto;

namespace Api.DTOs.Auth;

public sealed record LoginResponse(
	[property: JsonPropertyName("Token")] string Token,
	[property: JsonPropertyName("MkWrapPwd")] EncryptedValueDto? MkWrapPwd,
	[property: JsonPropertyName("MkWrapRk")] EncryptedValueDto? MkWrapRk
);
