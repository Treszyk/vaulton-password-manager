using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record PreRegisterResponse(
	[property: JsonPropertyName("AccountId")] Guid AccountId,
	[property: JsonPropertyName("CryptoSchemaVer")] int CryptoSchemaVer
);
