using Api.DTOs.Auth;
using Api.DTOs.Crypto;
using System.Net;
using System.Net.Http.Json;

namespace Tests.Integration;

public class AuthRegistrationIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
	private readonly HttpClient _client;

	public AuthRegistrationIntegrationTests(CustomWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Theory]
	[InlineData(1)]
	[InlineData(2)]
	public async Task Register_WithValidKdfMode_ShouldReturn201Created(int kdfMode)
	{
		var accountId = await _client.PreRegisterAccountIdAsync();
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(accountId, kdfMode: kdfMode);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.Created, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<RegisterResponse>();
		Assert.NotNull(data);
		Assert.Equal(accountId, data.AccountId);
	}

	[Theory]
	[InlineData(0)]
	[InlineData(-1)]
	[InlineData(3)]
	[InlineData(99)]
	public async Task Register_WithInvalidKdfMode_ShouldReturn400BadRequest(int kdfMode)
	{
		var accountId = await _client.PreRegisterAccountIdAsync();
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(accountId, kdfMode: kdfMode);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Theory]
	[InlineData(0)]
	[InlineData(5)]
	[InlineData(16)]
	[InlineData(31)]
	[InlineData(33)]
	public async Task Register_WithInvalidVerifierLength_ShouldReturn400BadRequest(int verifierLength)
	{
		var accountId = await _client.PreRegisterAccountIdAsync();
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(
			accountId,
			verifier: new byte[verifierLength]
		);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Theory]
	[InlineData(0)]
	[InlineData(5)]
	[InlineData(31)]
	[InlineData(33)]
	public async Task Register_WithInvalidAdminVerifierLength_ShouldReturn400BadRequest(int length)
	{
		var accountId = await _client.PreRegisterAccountIdAsync();
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(
			accountId,
			adminVerifier: new byte[length]
		);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Theory]
	[InlineData(0)]
	[InlineData(5)]
	[InlineData(31)]
	[InlineData(33)]
	public async Task Register_WithInvalidRkVerifierLength_ShouldReturn400BadRequest(int length)
	{
		var accountId = await _client.PreRegisterAccountIdAsync();
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(
			accountId,
			rkVerifier: new byte[length]
		);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Register_WithDuplicateAccountId_ShouldReturn400BadRequest()
	{
		var accountId = await _client.PreRegisterAccountIdAsync();
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(accountId);

		var firstRes = await _client.PostAsJsonAsync("/auth/register", req);
		Assert.Equal(HttpStatusCode.Created, firstRes.StatusCode);

		var duplicateRes = await _client.PostAsJsonAsync("/auth/register", req);
		Assert.Equal(HttpStatusCode.BadRequest, duplicateRes.StatusCode);
	}

	[Fact]
	public async Task Register_WithUnsupportedCryptoSchema_ShouldReturn400BadRequest()
	{
		var accountId = await _client.PreRegisterAccountIdAsync();
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(
			accountId,
			cryptoSchemaVer: 99
		);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Theory]
	[InlineData(0)]
	[InlineData(8)]
	[InlineData(15)]
	[InlineData(17)]
	[InlineData(32)]
	public async Task Register_WithInvalidSaltLength_ShouldReturn400BadRequest(int saltLength)
	{
		var accountId = await _client.PreRegisterAccountIdAsync();
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(
			accountId,
			sPwd: new byte[saltLength]
		);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Register_WithEmptyAccountId_ShouldReturn400BadRequest()
	{
		var req = IntegrationTestHelpers.CreateValidRegisterRequest(Guid.Empty);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Theory]
	[InlineData(0)]
	[InlineData(4)]
	[InlineData(11)]
	[InlineData(13)]
	public async Task Register_WithInvalidCryptoBlobNonceLength_ShouldReturn400BadRequest(int nonceLength)
	{
		var accountId = await _client.PreRegisterAccountIdAsync();

		var invalidBlob = new EncryptedValueDto(
			Nonce: new byte[nonceLength],
			CipherText: new byte[32],
			Tag: new byte[16]
		);

		var req = IntegrationTestHelpers.CreateValidRegisterRequest(
			accountId,
			mkWrapPwd: invalidBlob
		);

		var response = await _client.PostAsJsonAsync("/auth/register", req);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Register_WithNullRequestBody_ShouldReturn400BadRequest()
	{
		var response = await _client.PostAsJsonAsync<RegisterRequest?>("/auth/register", null);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}
}
