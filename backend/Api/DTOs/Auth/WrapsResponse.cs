using Api.DTOs.Crypto;
using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public record WrapsResponse(
	[property: JsonPropertyName("MkWrapPwd")]
	EncryptedValueDto MkWrapPwd,

	[property: JsonPropertyName("MkWrapRk")]
	EncryptedValueDto MkWrapRk
);
