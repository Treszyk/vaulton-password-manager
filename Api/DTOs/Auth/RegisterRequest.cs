using Api.DTOs.Crypto;
using Core.Crypto;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Api.DTOs.Auth;

public sealed record RegisterRequest(
	[Required][property: JsonPropertyName("AccountId")] Guid AccountId,

	[Length(CryptoSizes.VerifierLen, CryptoSizes.VerifierLen)]
	[Required][property: JsonPropertyName("Verifier")] byte[] Verifier,
	[Length(CryptoSizes.SaltLen, CryptoSizes.SaltLen)]
	[Required][property: JsonPropertyName("S_Pwd")] byte[] S_Pwd,

	 // Argon2id parameters
	[Range(1, int.MaxValue)]
	[Required][property: JsonPropertyName("ArgonMem")] int ArgonMem,
	
	[Range(1, int.MaxValue)]
	[Required][property: JsonPropertyName("ArgonTime")] int ArgonTime,
	
	[Range(1, int.MaxValue)]
	[Required][property: JsonPropertyName("ArgonLanes")] int ArgonLanes,
	
	[Range(1, int.MaxValue)]
	[Required][property: JsonPropertyName("ArgonVersion")] int ArgonVersion,

	[Required][property: JsonPropertyName("MKWrapPwd")] EncryptedValueDto MkWrapPwd,

	// optional RK things (I'm gonna be making these mandatory later)
	[property: JsonPropertyName("MKWrapRk")] EncryptedValueDto? MkWrapRk,

	 // always 1 in for mvp 1.0
	[Range(1, 1)]
	[Required][property: JsonPropertyName("CryptoSchemaVer")] int CryptoSchemaVer
);
