using Api.DTOs.Auth;
using System.Net;
using System.Net.Http.Json;

namespace Tests.Integration;

public class AuthLoginIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
	private readonly HttpClient _client;

	public AuthLoginIntegrationTests(CustomWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task PreLogin_WithExistingAccount_ShouldReturnAccountSalt()
	{
		var (accountId, _) = await _client.RegisterUserAsync();

		var preReq = new PreLoginRequest(accountId);
		var response = await _client.PostAsJsonAsync("/auth/pre-login", preReq);

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<PreLoginResponse>();
		Assert.NotNull(data);
		Assert.NotNull(data.S_Pwd);
		Assert.Equal(16, data.S_Pwd.Length);
	}

	[Fact]
	public async Task PreLogin_WithNonExistentAccount_ShouldReturnDeterministicFakeSalt()
	{
		var nonExistentAccountId = Guid.NewGuid();
		var preReq = new PreLoginRequest(nonExistentAccountId);

		var res1 = await _client.PostAsJsonAsync("/auth/pre-login", preReq);
		var data1 = await res1.Content.ReadFromJsonAsync<PreLoginResponse>();

		var res2 = await _client.PostAsJsonAsync("/auth/pre-login", preReq);
		var data2 = await res2.Content.ReadFromJsonAsync<PreLoginResponse>();

		Assert.Equal(HttpStatusCode.OK, res1.StatusCode);
		Assert.Equal(HttpStatusCode.OK, res2.StatusCode);
		Assert.NotNull(data1);
		Assert.NotNull(data2);
		Assert.Equal(16, data1.S_Pwd.Length);
		Assert.Equal(data1.S_Pwd, data2.S_Pwd);
	}

	[Fact]
	public async Task PreLogin_WithEmptyAccountId_ShouldReturn400BadRequest()
	{
		var preReq = new PreLoginRequest(Guid.Empty);
		var response = await _client.PostAsJsonAsync("/auth/pre-login", preReq);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Login_WithValidCredentials_ShouldReturnTokenAndSetCookie()
	{
		var (accountId, verifier) = await _client.RegisterUserAsync();

		var loginReq = new LoginRequest(accountId, verifier);
		var response = await _client.PostAsJsonAsync("/auth/login", loginReq);

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<LoginResponse>();
		Assert.NotNull(data);
		Assert.False(string.IsNullOrWhiteSpace(data.Token));
		Assert.True(response.Headers.Contains("Set-Cookie"));
	}

	[Fact]
	public async Task Login_WithInvalidVerifier_ShouldReturn401Unauthorized()
	{
		var (accountId, _) = await _client.RegisterUserAsync();

		var invalidVerifier = IntegrationTestHelpers.CreateValidVerifier();
		var loginReq = new LoginRequest(accountId, invalidVerifier);

		var response = await _client.PostAsJsonAsync("/auth/login", loginReq);

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task Login_WithNonExistentAccount_ShouldReturn401Unauthorized()
	{
		var nonExistentAccountId = Guid.NewGuid();
		var verifier = IntegrationTestHelpers.CreateValidVerifier();
		var loginReq = new LoginRequest(nonExistentAccountId, verifier);

		var response = await _client.PostAsJsonAsync("/auth/login", loginReq);

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task LoginExt_WithValidCredentials_ShouldReturnAccessAndRefreshTokens()
	{
		var (accountId, verifier) = await _client.RegisterUserAsync();

		var loginReq = new LoginRequest(accountId, verifier);
		var response = await _client.PostAsJsonAsync("/auth/ext/login", loginReq);

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<ExtLoginResponse>();
		Assert.NotNull(data);
		Assert.False(string.IsNullOrWhiteSpace(data.AccessToken));
		Assert.False(string.IsNullOrWhiteSpace(data.RefreshToken));
	}

	[Fact]
	public async Task LoginExt_WithInvalidVerifier_ShouldReturn401Unauthorized()
	{
		var (accountId, _) = await _client.RegisterUserAsync();

		var invalidVerifier = IntegrationTestHelpers.CreateValidVerifier();
		var loginReq = new LoginRequest(accountId, invalidVerifier);

		var response = await _client.PostAsJsonAsync("/auth/ext/login", loginReq);

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}
}
