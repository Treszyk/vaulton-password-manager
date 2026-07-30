using Api.DTOs.Auth;
using Api.DTOs.Crypto;
using System.Net.Http.Headers;
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

	public static async Task<(Guid accountId, byte[] verifier)> RegisterUserAsync(this HttpClient client)
	{
		var accountId = await client.PreRegisterAccountIdAsync();
		var verifier = CreateValidVerifier();
		var req = CreateValidRegisterRequest(accountId, verifier: verifier);

		var response = await client.PostAsJsonAsync("/auth/register", req);
		response.EnsureSuccessStatusCode();

		return (accountId, verifier);
	}

	public static async Task<ExtLoginResponse> LoginExtAsync(this HttpClient client)
	{
		var (accountId, verifier) = await client.RegisterUserAsync();
		var loginReq = new LoginRequest(accountId, verifier);
		var loginRes = await client.PostAsJsonAsync("/auth/ext/login", loginReq);
		loginRes.EnsureSuccessStatusCode();

		var data = await loginRes.Content.ReadFromJsonAsync<ExtLoginResponse>();
		return data!;
	}

	public static HttpRequestMessage CreateAuthorizedRequest(HttpMethod method, string url, string accessToken)
	{
		var req = new HttpRequestMessage(method, url);
		req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
		return req;
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
