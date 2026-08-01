using Api.DTOs.Auth;
using Api.DTOs.Crypto;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;

namespace Tests.Integration;

public record RegisteredUser(Guid AccountId, byte[] Verifier, byte[] AdminVerifier, byte[] RkVerifier);
public record AuthenticatedUser(RegisteredUser User, ExtLoginResponse Tokens);

public static class IntegrationTestHelpers
{
	public static async Task<Guid> PreRegisterAccountIdAsync(this HttpClient client)
	{
		var preRes = await client.PostAsync("/auth/pre-register", null);
		var preData = await preRes.Content.ReadFromJsonAsync<PreRegisterResponse>();
		return preData!.AccountId;
	}

	public static async Task<RegisteredUser> RegisterUserAsync(this HttpClient client)
	{
		var accountId = await client.PreRegisterAccountIdAsync();
		var verifier = CreateValidVerifier();
		var adminVerifier = CreateValidVerifier();
		var rkVerifier = CreateValidVerifier();
		var req = CreateValidRegisterRequest(
			accountId,
			verifier: verifier,
			adminVerifier: adminVerifier,
			rkVerifier: rkVerifier
		);

		var response = await client.PostAsJsonAsync("/auth/register", req);
		response.EnsureSuccessStatusCode();

		return new RegisteredUser(accountId, verifier, adminVerifier, rkVerifier);
	}

	public static async Task<ExtLoginResponse> LoginExtAsync(this HttpClient client)
	{
		var user = await client.RegisterUserAsync();
		var loginRes = await client.PostAsJsonAsync("/auth/ext/login", new LoginRequest(user.AccountId, user.Verifier));
		loginRes.EnsureSuccessStatusCode();

		var data = await loginRes.Content.ReadFromJsonAsync<ExtLoginResponse>();
		return data!;
	}

	public static async Task<AuthenticatedUser> RegisterAndLoginExtAsync(this HttpClient client)
	{
		var user = await client.RegisterUserAsync();
		var loginRes = await client.PostAsJsonAsync("/auth/ext/login", new LoginRequest(user.AccountId, user.Verifier));
		loginRes.EnsureSuccessStatusCode();

		var tokens = (await loginRes.Content.ReadFromJsonAsync<ExtLoginResponse>())!;
		return new AuthenticatedUser(user, tokens);
	}

	public static HttpRequestMessage CreateAuthorizedRequest(HttpMethod method, string url, string accessToken, HttpContent? content = null)
	{
		var req = new HttpRequestMessage(method, url);
		req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
		req.Content = content;
		return req;
	}

	public static Task<HttpResponseMessage> SendAuthorizedAsync(this HttpClient client, HttpMethod method, string url, string accessToken, object? jsonBody = null)
	{
		var content = jsonBody != null ? JsonContent.Create(jsonBody) : null;
		var req = CreateAuthorizedRequest(method, url, accessToken, content);
		return client.SendAsync(req);
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

	public static RecoverRequest CreateValidRecoverRequest(
		Guid accountId,
		byte[] rkVerifier,
		byte[]? newVerifier = null,
		byte[]? newAdminVerifier = null,
		byte[]? newRkVerifier = null,
		byte[]? newSPwd = null,
		int newKdfMode = 1,
		EncryptedValueDto? newMkWrapPwd = null,
		EncryptedValueDto? newMkWrapRk = null,
		int cryptoSchemaVer = 1)
	{
		return new RecoverRequest(
			AccountId: accountId,
			RkVerifier: rkVerifier,
			NewVerifier: newVerifier ?? CreateValidVerifier(),
			NewAdminVerifier: newAdminVerifier ?? CreateValidVerifier(),
			NewRkVerifier: newRkVerifier ?? CreateValidVerifier(),
			NewS_Pwd: newSPwd ?? CreateValidSalt(),
			NewKdfMode: newKdfMode,
			NewMkWrapPwd: newMkWrapPwd ?? CreateValidEncryptedValueDto(),
			NewMkWrapRk: newMkWrapRk ?? CreateValidEncryptedValueDto(),
			CryptoSchemaVer: cryptoSchemaVer
		);
	}

	public static ChangePasswordRequest CreateValidChangePasswordRequest(
		byte[] adminVerifier,
		byte[]? newVerifier = null,
		byte[]? newAdminVerifier = null,
		byte[]? newSPwd = null,
		int newKdfMode = 1,
		EncryptedValueDto? newMkWrapPwd = null,
		EncryptedValueDto? newMkWrapRk = null,
		byte[]? newRkVerifier = null,
		int cryptoSchemaVer = 1)
	{
		return new ChangePasswordRequest(
			AdminVerifier: adminVerifier,
			NewVerifier: newVerifier ?? CreateValidVerifier(),
			NewAdminVerifier: newAdminVerifier ?? CreateValidVerifier(),
			NewS_Pwd: newSPwd ?? CreateValidSalt(),
			NewKdfMode: newKdfMode,
			NewMkWrapPwd: newMkWrapPwd ?? CreateValidEncryptedValueDto(),
			NewMkWrapRk: newMkWrapRk ?? CreateValidEncryptedValueDto(),
			NewRkVerifier: newRkVerifier ?? CreateValidVerifier(),
			CryptoSchemaVer: cryptoSchemaVer
		);
	}
}
