using Api.DTOs.Auth;
using System.Net;
using System.Net.Http.Json;

namespace Tests.Integration;

public class AuthPreRegisterIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
	private readonly HttpClient _client;

	public AuthPreRegisterIntegrationTests(CustomWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task PreRegister_ShouldReturnValidAccountIdAndSchemaVersion()
	{
		var response = await _client.PostAsync("/auth/pre-register", null);

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<PreRegisterResponse>();
		Assert.NotNull(data);
		Assert.NotEqual(Guid.Empty, data.AccountId);
		Assert.Equal(1, data.CryptoSchemaVer);
	}

	[Fact]
	public async Task PreRegister_ShouldReturnDifferentGuidsEachTime()
	{
		var res1 = await _client.PostAsync("/auth/pre-register", null);
		var res2 = await _client.PostAsync("/auth/pre-register", null);

		Assert.Equal(HttpStatusCode.OK, res1.StatusCode);
		Assert.Equal(HttpStatusCode.OK, res2.StatusCode);

		var data1 = await res1.Content.ReadFromJsonAsync<PreRegisterResponse>();
		var data2 = await res2.Content.ReadFromJsonAsync<PreRegisterResponse>();

		Assert.NotNull(data1);
		Assert.NotNull(data2);
		Assert.NotEqual(data1.AccountId, data2.AccountId);
	}

	[Fact]
	public async Task PreRegister_ShouldSetApplicationJsonContentTypeHeader()
	{
		var response = await _client.PostAsync("/auth/pre-register", null);

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);
		Assert.NotNull(response.Content.Headers.ContentType);
		Assert.Equal("application/json", response.Content.Headers.ContentType.MediaType);
	}

	[Theory]
	[InlineData("GET")]
	[InlineData("PUT")]
	[InlineData("DELETE")]
	[InlineData("PATCH")]
	public async Task PreRegister_ShouldRejectUnsupportedHttpMethodsWith405MethodNotAllowed(string method)
	{
		var request = new HttpRequestMessage(new HttpMethod(method), "/auth/pre-register");
		var response = await _client.SendAsync(request);

		Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
	}
}
