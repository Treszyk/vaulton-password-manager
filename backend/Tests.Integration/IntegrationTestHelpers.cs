using Api.DTOs.Auth;
using Api.DTOs.Crypto;
using System.Net.Http.Json;
using System.Security.Cryptography;

namespace Tests.Integration;

public static class IntegrationTestHelpers
{
	public static async Task<Guid> PreRegisterAccountIdAsync(this HttpClient client)
	{
		var preRes = await client.PostAsync("/auth/pre-register", null);
		var preData = await preRes.Content.ReadFromJsonAsync<PreRegisterResponse>();
		return preData!.AccountId;
	}

	public static byte[] CreateValidVerifier() => RandomNumberGenerator.GetBytes(32);
	public static byte[] CreateValidSalt() => RandomNumberGenerator.GetBytes(16);

	public static EncryptedValueDto CreateValidEncryptedValueDto()
	{
		return new EncryptedValueDto(
			Nonce: RandomNumberGenerator.GetBytes(12),
			CipherText: RandomNumberGenerator.GetBytes(32),
			Tag: RandomNumberGenerator.GetBytes(16)
		);
	}

	public static RegisterRequest CreateValidRegisterRequest(
		Guid accountId,
		byte[]? verifier = null,
		byte[]? adminVerifier = null,
		byte[]? rkVerifier = null,
		byte[]? sPwd = null,
		int kdfMode = 1,
		EncryptedValueDto? mkWrapPwd = null,
		EncryptedValueDto? mkWrapRk = null,
		int cryptoSchemaVer = 1)
	{
		return new RegisterRequest(
			AccountId: accountId,
			Verifier: verifier ?? CreateValidVerifier(),
			AdminVerifier: adminVerifier ?? CreateValidVerifier(),
			RkVerifier: rkVerifier ?? CreateValidVerifier(),
			S_Pwd: sPwd ?? CreateValidSalt(),
			KdfMode: kdfMode,
			MkWrapPwd: mkWrapPwd ?? CreateValidEncryptedValueDto(),
			MkWrapRk: mkWrapRk ?? CreateValidEncryptedValueDto(),
			CryptoSchemaVer: cryptoSchemaVer
		);
	}
}
