using Api.DTOs.Auth;
using System.Net;
using System.Net.Http.Json;

namespace Tests.Integration;

public class AuthRecoveryIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
	private readonly HttpClient _client;

	public AuthRecoveryIntegrationTests(CustomWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task RecoveryWraps_WithValidRkVerifier_ShouldReturnWraps()
	{
		var user = await _client.RegisterUserAsync();

		var response = await _client.PostAsJsonAsync("/auth/recovery-wraps",
			new RecoveryWrapsRequest(user.AccountId, user.RkVerifier));

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<WrapsResponse>();
		Assert.NotNull(data);
		Assert.NotNull(data.MkWrapPwd);
		Assert.NotNull(data.MkWrapRk);
	}

	[Fact]
	public async Task RecoveryWraps_WithInvalidRkVerifier_ShouldReturnFakeWrapsWith200OK()
	{
		var user = await _client.RegisterUserAsync();

		var response = await _client.PostAsJsonAsync("/auth/recovery-wraps",
			new RecoveryWrapsRequest(user.AccountId, IntegrationTestHelpers.CreateValidVerifier()));

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);
		var data = await response.Content.ReadFromJsonAsync<WrapsResponse>();
		Assert.NotNull(data);
		Assert.NotNull(data.MkWrapPwd);
		Assert.NotNull(data.MkWrapRk);
	}

	[Fact]
	public async Task RecoveryWraps_WithNonExistentAccount_ShouldReturnFakeWrapsWith200OK()
	{
		var response = await _client.PostAsJsonAsync("/auth/recovery-wraps",
			new RecoveryWrapsRequest(Guid.NewGuid(), IntegrationTestHelpers.CreateValidVerifier()));

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);
		var data = await response.Content.ReadFromJsonAsync<WrapsResponse>();
		Assert.NotNull(data);
		Assert.NotNull(data.MkWrapPwd);
		Assert.NotNull(data.MkWrapRk);
	}

	[Fact]
	public async Task Recover_WithValidCredentials_ShouldReturn204NoContent()
	{
		var user = await _client.RegisterUserAsync();

		var response = await _client.PostAsJsonAsync("/auth/recover",
			IntegrationTestHelpers.CreateValidRecoverRequest(user.AccountId, user.RkVerifier));

		Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
	}

	[Fact]
	public async Task Recover_ShouldAllowLoginWithNewCredentials()
	{
		var user = await _client.RegisterUserAsync();
		var newVerifier = IntegrationTestHelpers.CreateValidVerifier();

		var recoverRes = await _client.PostAsJsonAsync("/auth/recover",
			IntegrationTestHelpers.CreateValidRecoverRequest(user.AccountId, user.RkVerifier, newVerifier: newVerifier));
		Assert.Equal(HttpStatusCode.NoContent, recoverRes.StatusCode);

		var loginRes = await _client.PostAsJsonAsync("/auth/login", new LoginRequest(user.AccountId, newVerifier));
		Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
	}

	[Fact]
	public async Task Recover_ShouldInvalidateOldCredentials()
	{
		var user = await _client.RegisterUserAsync();

		var recoverRes = await _client.PostAsJsonAsync("/auth/recover",
			IntegrationTestHelpers.CreateValidRecoverRequest(user.AccountId, user.RkVerifier));
		Assert.Equal(HttpStatusCode.NoContent, recoverRes.StatusCode);

		var loginRes = await _client.PostAsJsonAsync("/auth/login", new LoginRequest(user.AccountId, user.Verifier));
		Assert.Equal(HttpStatusCode.Unauthorized, loginRes.StatusCode);
	}

	[Theory]
	[InlineData(true, false)]
	[InlineData(false, true)]
	public async Task Recover_WithInvalidVerifier_ShouldReturn401Unauthorized(bool useRealAccount, bool useRealRkVerifier)
	{
		var user = await _client.RegisterUserAsync();

		var response = await _client.PostAsJsonAsync("/auth/recover",
			IntegrationTestHelpers.CreateValidRecoverRequest(
				useRealAccount ? user.AccountId : Guid.NewGuid(),
				useRealRkVerifier ? user.RkVerifier : IntegrationTestHelpers.CreateValidVerifier()
			));

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Theory]
	[InlineData(0)]
	[InlineData(3)]
	[InlineData(99)]
	public async Task Recover_WithInvalidKdfMode_ShouldReturn400BadRequest(int kdfMode)
	{
		var user = await _client.RegisterUserAsync();

		var response = await _client.PostAsJsonAsync("/auth/recover",
			IntegrationTestHelpers.CreateValidRecoverRequest(user.AccountId, user.RkVerifier, newKdfMode: kdfMode));

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Recover_WithUnsupportedCryptoSchema_ShouldReturn400BadRequest()
	{
		var user = await _client.RegisterUserAsync();

		var response = await _client.PostAsJsonAsync("/auth/recover",
			IntegrationTestHelpers.CreateValidRecoverRequest(user.AccountId, user.RkVerifier, cryptoSchemaVer: 99));

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Wraps_WithValidAdminVerifier_ShouldReturnWraps()
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/auth/wraps", auth.Tokens.AccessToken,
			new WrapsRequest(auth.User.AdminVerifier));

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<WrapsResponse>();
		Assert.NotNull(data);
		Assert.NotNull(data.MkWrapPwd);
		Assert.NotNull(data.MkWrapRk);
	}

	[Fact]
	public async Task Wraps_WithInvalidAdminVerifier_ShouldReturn401Unauthorized()
	{
		var tokens = await _client.LoginExtAsync();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/auth/wraps", tokens.AccessToken,
			new WrapsRequest(IntegrationTestHelpers.CreateValidVerifier()));

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task Wraps_WithoutAuthorizationHeader_ShouldReturn401Unauthorized()
	{
		var response = await _client.PostAsJsonAsync("/auth/wraps",
			new WrapsRequest(IntegrationTestHelpers.CreateValidVerifier()));

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task ChangePassword_WithValidCredentials_ShouldReturn204NoContent()
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/auth/change-password", auth.Tokens.AccessToken,
			IntegrationTestHelpers.CreateValidChangePasswordRequest(auth.User.AdminVerifier));

		Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
	}

	[Fact]
	public async Task ChangePassword_ShouldAllowLoginWithNewCredentials()
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var newVerifier = IntegrationTestHelpers.CreateValidVerifier();
		var changeRes = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/auth/change-password", auth.Tokens.AccessToken,
			IntegrationTestHelpers.CreateValidChangePasswordRequest(auth.User.AdminVerifier, newVerifier: newVerifier));
		Assert.Equal(HttpStatusCode.NoContent, changeRes.StatusCode);

		var newLoginRes = await _client.PostAsJsonAsync("/auth/login", new LoginRequest(auth.User.AccountId, newVerifier));
		Assert.Equal(HttpStatusCode.OK, newLoginRes.StatusCode);
	}

	[Fact]
	public async Task ChangePassword_ShouldInvalidateOldCredentials()
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var changeRes = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/auth/change-password", auth.Tokens.AccessToken,
			IntegrationTestHelpers.CreateValidChangePasswordRequest(auth.User.AdminVerifier));
		Assert.Equal(HttpStatusCode.NoContent, changeRes.StatusCode);

		var oldLoginRes = await _client.PostAsJsonAsync("/auth/login", new LoginRequest(auth.User.AccountId, auth.User.Verifier));
		Assert.Equal(HttpStatusCode.Unauthorized, oldLoginRes.StatusCode);
	}

	[Fact]
	public async Task ChangePassword_WithInvalidAdminVerifier_ShouldReturn401Unauthorized()
	{
		var tokens = await _client.LoginExtAsync();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/auth/change-password", tokens.AccessToken,
			IntegrationTestHelpers.CreateValidChangePasswordRequest(IntegrationTestHelpers.CreateValidVerifier()));

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task ChangePassword_WithoutAuthorizationHeader_ShouldReturn401Unauthorized()
	{
		var response = await _client.PostAsJsonAsync("/auth/change-password",
			IntegrationTestHelpers.CreateValidChangePasswordRequest(IntegrationTestHelpers.CreateValidVerifier()));

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}
}
