using Api.DTOs.Crypto;
using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record RegisterRequest(
	[property: Required]
	[property: JsonPropertyName("AccountId")]
	Guid AccountId,

	[property: Required]
	[property: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("Verifier")]
	byte[] Verifier,

	[property: Required]
	[property: Length(CryptoSizes.SaltLen, CryptoSizes.SaltLen)]
	[property: JsonPropertyName("S_Pwd")]
	byte[] S_Pwd,

	[property: Required]
	[property: Range(1, 2)]
	[property: JsonPropertyName("KdfMode")]
	int KdfMode,

	[property: Required]
	[property: JsonPropertyName("MKWrapPwd")]
	EncryptedValueDto MkWrapPwd,

	[property: JsonPropertyName("MKWrapRk")]
	EncryptedValueDto? MkWrapRk,

	[property: Required]
	[property: Range(1, 1)]
	[property: JsonPropertyName("CryptoSchemaVer")]
	int CryptoSchemaVer
);

