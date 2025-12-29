using Api.DTOs.Crypto;
using Api.Validation;
using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record RegisterRequest(
	[param: Required]
	[param: RequiredNonDefault]
	[property: JsonPropertyName("AccountId")]
	Guid AccountId,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("Verifier")]
	byte[] Verifier,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("AdminVerifier")]
	byte[] AdminVerifier,

	[param: Required]
	[param: Length(CryptoSizes.SaltLen, CryptoSizes.SaltLen)]
	[property: JsonPropertyName("S_Pwd")]
	byte[] S_Pwd,

	[param: Required]
	[param: Range(1, 2)]
	[property: JsonPropertyName("KdfMode")]
	int KdfMode,

	[param: Required]
	[property: JsonPropertyName("MKWrapPwd")]
	EncryptedValueDto MkWrapPwd,

	[property: JsonPropertyName("MKWrapRk")]
	EncryptedValueDto? MkWrapRk,

	[param: Required]
	[param: Range(1, 1)]
	[property: JsonPropertyName("CryptoSchemaVer")]
	int CryptoSchemaVer
);
