using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record RegisterRequest(
	[property: Required, JsonPropertyName("Verifier")] byte[] Verifier,
	[property: Required, JsonPropertyName("S_Pwd")] byte[] S_Pwd,
	[property: Required, JsonPropertyName("MK_Wrap_Pwd")] byte[] MK_Wrap_Pwd,

	// optional RK things (for now)
	[property: JsonPropertyName("S_Rk")] byte[]? S_Rk,
	[property: JsonPropertyName("MK_Wrap_Rk")] byte[]? MK_Wrap_Rk
);
