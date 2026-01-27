using Api.DTOs.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Core.Crypto;

namespace Api.DTOs.Auth;

public sealed record RecoverRequest(
	[param: Required]
	[property: JsonPropertyName("AccountId")]
	Guid AccountId,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("RkVerifier")]
	byte[] RkVerifier,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("NewVerifier")]
	byte[] NewVerifier,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("NewAdminVerifier")]
	byte[] NewAdminVerifier,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("NewRkVerifier")]
	byte[] NewRkVerifier,

	[param: Required]
	[param: Length(CryptoSizes.SaltLen, CryptoSizes.SaltLen)]
	[property: JsonPropertyName("NewS_Pwd")]
	byte[] NewS_Pwd,

	[param: Required]
	[property: JsonPropertyName("NewKdfMode")]
	int NewKdfMode,

	[param: Required]
	[property: JsonPropertyName("NewMkWrapPwd")]
	EncryptedValueDto NewMkWrapPwd,

	[param: Required]
	[property: JsonPropertyName("NewMkWrapRk")]
	EncryptedValueDto NewMkWrapRk,

	[param: Required]
	[property: JsonPropertyName("CryptoSchemaVer")]
	int CryptoSchemaVer
);
