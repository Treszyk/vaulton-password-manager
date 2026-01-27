using Api.DTOs.Crypto;
using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record ChangePasswordRequest(
	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("AdminVerifier")]
	byte[] AdminVerifier,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("NewVerifier")]
	byte[] NewVerifier,

	[param: Required]
	[param: Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[property: JsonPropertyName("NewAdminVerifier")]
	byte[] NewAdminVerifier,

	[param: Required]
	[param: Length(CryptoSizes.SaltLen, CryptoSizes.SaltLen)]
	[property: JsonPropertyName("NewS_Pwd")]
	byte[] NewS_Pwd,

	[param: Required]
	[param: Range(1, 2)]
	[property: JsonPropertyName("NewKdfMode")]
	int NewKdfMode,

	[property: JsonPropertyName("NewMkWrapPwd")]
	EncryptedValueDto NewMkWrapPwd,

	[property: JsonPropertyName("NewMkWrapRk")]
	EncryptedValueDto? NewMkWrapRk,

	[property: JsonPropertyName("NewRkVerifier")]
	byte[]? NewRkVerifier,

	[param: Required]
	[param: Range(1, 1)]
	[property: JsonPropertyName("CryptoSchemaVer")]
	int CryptoSchemaVer
);
