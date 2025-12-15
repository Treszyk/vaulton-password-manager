using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record LoginRequest(
	[Required][property: JsonPropertyName("AccountId")] Guid AccountId,
	
	[Required]
	[Length(32, 32)]
	[property: JsonPropertyName("Verifier")] byte[] Verifier
);



