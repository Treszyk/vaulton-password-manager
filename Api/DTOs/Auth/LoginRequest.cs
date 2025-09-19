using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record LoginRequest(
	[property: Required, JsonPropertyName("AccountId")] Guid AccountId,
	[property: Required, JsonPropertyName("Verifier")] byte[] Verifier
);
