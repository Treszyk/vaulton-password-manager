using Api.DTOs.Auth;
using System.Net;
using System.Net.Http.Json;

namespace Tests.Integration;

public class AuthSessionIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
	private readonly HttpClient _client;

	public AuthSessionIntegrationTests(CustomWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task Refresh_WithValidCookie_ShouldReturnNewTokenAndSetRotatedCookie()
	{
		var (accountId, verifier) = await _client.RegisterUserAsync();
		var loginRes = await _client.PostAsJsonAsync("/auth/login", new LoginRequest(accountId, verifier));

		Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
		Assert.True(loginRes.Headers.Contains("Set-Cookie"));

		var refreshRes = await _client.PostAsync("/auth/refresh", null);

		Assert.Equal(HttpStatusCode.OK, refreshRes.StatusCode);

		var data = await refreshRes.Content.ReadFromJsonAsync<LoginResponse>();
		Assert.NotNull(data);
		Assert.False(string.IsNullOrWhiteSpace(data.Token));
		Assert.True(refreshRes.Headers.Contains("Set-Cookie"));
	}

	[Fact]
	public async Task Refresh_WithoutCookie_ShouldReturn401Unauthorized()
	{
		var response = await _client.PostAsync("/auth/refresh", null);

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task Refresh_WithInvalidCookie_ShouldReturn401Unauthorized()
	{
		var request = new HttpRequestMessage(HttpMethod.Post, "/auth/refresh");
		request.Headers.Add("Cookie", "v_rt=InvalidRefreshToken12345");

		var response = await _client.SendAsync(request);

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task RefreshExt_WithValidRefreshToken_ShouldReturnNewTokens()
	{
		var loginData = await _client.LoginExtAsync();

		var refreshRes = await _client.PostAsJsonAsync("/auth/ext/refresh", new ExtRefreshRequest(loginData.RefreshToken));

		Assert.Equal(HttpStatusCode.OK, refreshRes.StatusCode);

		var refreshData = await refreshRes.Content.ReadFromJsonAsync<ExtRefreshResponse>();
		Assert.NotNull(refreshData);
		Assert.False(string.IsNullOrWhiteSpace(refreshData.AccessToken));
		Assert.False(string.IsNullOrWhiteSpace(refreshData.RefreshToken));
		Assert.NotEqual(loginData.RefreshToken, refreshData.RefreshToken);
	}

	[Fact]
	public async Task RefreshExt_WithInvalidRefreshToken_ShouldReturn401Unauthorized()
	{
		var response = await _client.PostAsJsonAsync("/auth/ext/refresh", new ExtRefreshRequest("InvalidRefreshToken12345"));

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task RefreshExt_WithReusedTokenWithinGracePeriod_ShouldReturn409Conflict()
	{
		var loginData = await _client.LoginExtAsync();

		var firstRefreshRes = await _client.PostAsJsonAsync("/auth/ext/refresh", new ExtRefreshRequest(loginData.RefreshToken));
		Assert.Equal(HttpStatusCode.OK, firstRefreshRes.StatusCode);

		var duplicateRefreshRes = await _client.PostAsJsonAsync("/auth/ext/refresh", new ExtRefreshRequest(loginData.RefreshToken));

		Assert.Equal(HttpStatusCode.Conflict, duplicateRefreshRes.StatusCode);
	}

	[Fact]
	public async Task Logout_WithValidSession_ShouldReturn204NoContentAndInvalidateSession()
	{
		var (accountId, verifier) = await _client.RegisterUserAsync();
		await _client.PostAsJsonAsync("/auth/login", new LoginRequest(accountId, verifier));

		var logoutRes = await _client.PostAsync("/auth/logout", null);
		Assert.Equal(HttpStatusCode.NoContent, logoutRes.StatusCode);

		var refreshRes = await _client.PostAsync("/auth/refresh", null);
		Assert.Equal(HttpStatusCode.Unauthorized, refreshRes.StatusCode);
	}

	[Fact]
	public async Task LogoutExt_WithValidRefreshToken_ShouldReturn204NoContentAndInvalidateSession()
	{
		var loginData = await _client.LoginExtAsync();

		var logoutRes = await _client.PostAsJsonAsync("/auth/ext/logout", new ExtRefreshRequest(loginData.RefreshToken));
		Assert.Equal(HttpStatusCode.NoContent, logoutRes.StatusCode);

		var refreshRes = await _client.PostAsJsonAsync("/auth/ext/refresh", new ExtRefreshRequest(loginData.RefreshToken));
		Assert.Equal(HttpStatusCode.Unauthorized, refreshRes.StatusCode);
	}

	[Fact]
	public async Task LogoutAll_WithValidAuthorizationHeader_ShouldRevokeAllUserSessions()
	{
		var loginData = await _client.LoginExtAsync();

		var logoutAllReq = IntegrationTestHelpers.CreateAuthorizedRequest(HttpMethod.Post, "/auth/logout-all", loginData.AccessToken);
		var logoutAllRes = await _client.SendAsync(logoutAllReq);
		Assert.Equal(HttpStatusCode.NoContent, logoutAllRes.StatusCode);

		var refreshRes = await _client.PostAsJsonAsync("/auth/ext/refresh", new ExtRefreshRequest(loginData.RefreshToken));
		Assert.Equal(HttpStatusCode.Unauthorized, refreshRes.StatusCode);
	}

	[Fact]
	public async Task LogoutAllExt_WithValidAuthorizationHeader_ShouldRevokeAllUserSessions()
	{
		var loginData = await _client.LoginExtAsync();

		var logoutAllReq = IntegrationTestHelpers.CreateAuthorizedRequest(HttpMethod.Post, "/auth/ext/logout-all", loginData.AccessToken);
		var logoutAllRes = await _client.SendAsync(logoutAllReq);
		Assert.Equal(HttpStatusCode.NoContent, logoutAllRes.StatusCode);

		var refreshRes = await _client.PostAsJsonAsync("/auth/ext/refresh", new ExtRefreshRequest(loginData.RefreshToken));
		Assert.Equal(HttpStatusCode.Unauthorized, refreshRes.StatusCode);
	}

	[Fact]
	public async Task LogoutAll_WithoutAuthorizationHeader_ShouldReturn401Unauthorized()
	{
		var response = await _client.PostAsync("/auth/logout-all", null);

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task RevokedSession_AccessToken_ShouldBeRejectedOnAuthenticatedEndpoint()
	{
		var loginData = await _client.LoginExtAsync();

		var logoutRes = await _client.PostAsJsonAsync("/auth/ext/logout", new ExtRefreshRequest(loginData.RefreshToken));
		Assert.Equal(HttpStatusCode.NoContent, logoutRes.StatusCode);

		var wrapsReq = IntegrationTestHelpers.CreateAuthorizedRequest(HttpMethod.Post, "/auth/logout-all", loginData.AccessToken);
		var wrapsRes = await _client.SendAsync(wrapsReq);
		Assert.Equal(HttpStatusCode.Unauthorized, wrapsRes.StatusCode);
	}
}
