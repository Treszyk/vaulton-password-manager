using Api.DTOs.Crypto;
using Api.DTOs.Vault;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;

namespace Tests.Integration;

public class VaultIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
	private readonly HttpClient _client;

	public VaultIntegrationTests(CustomWebApplicationFactory factory)
	{
		_client = factory.CreateClient();
	}

	[Fact]
	public async Task PreCreate_WithValidAuth_ShouldReturnNewGuid()
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var response = await _client.SendAuthorizedAsync(HttpMethod.Post, "/vault/entries/pre-create", auth.Tokens.AccessToken);

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<PreCreateEntryResponse>();
		Assert.NotNull(data);
		Assert.NotEqual(Guid.Empty, data.EntryId);
	}

	[Fact]
	public async Task PreCreate_WithoutAuth_ShouldReturn401Unauthorized()
	{
		var response = await _client.PostAsync("/vault/entries/pre-create", null);

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task Create_WithValidData_ShouldReturn201Created()
	{
		var auth = await _client.RegisterAndLoginExtAsync();
		var entryId = Guid.NewGuid();
		var payload = IntegrationTestHelpers.CreateValidEncryptedValueDto();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", auth.Tokens.AccessToken,
			new CreateEntryRequest(entryId, payload));

		Assert.Equal(HttpStatusCode.Created, response.StatusCode);
		Assert.NotNull(response.Headers.Location);

		var data = await response.Content.ReadFromJsonAsync<CreateEntryResponse>();
		Assert.NotNull(data);
		Assert.Equal(entryId, data.EntryId);
	}

	[Fact]
	public async Task Create_WithExistingEntryId_ShouldReturn400BadRequest()
	{
		var auth = await _client.RegisterAndLoginExtAsync();
		var entryId = Guid.NewGuid();
		var payload = IntegrationTestHelpers.CreateValidEncryptedValueDto();

		var firstRes = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", auth.Tokens.AccessToken,
			new CreateEntryRequest(entryId, payload));
		Assert.Equal(HttpStatusCode.Created, firstRes.StatusCode);

		var duplicateRes = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", auth.Tokens.AccessToken,
			new CreateEntryRequest(entryId, payload));

		Assert.Equal(HttpStatusCode.BadRequest, duplicateRes.StatusCode);
	}

	[Theory]
	[InlineData(5, 32, 16)]
	[InlineData(16, 32, 16)]
	[InlineData(12, 0, 16)]
	[InlineData(12, 4097, 16)]
	[InlineData(12, 32, 10)]
	[InlineData(12, 32, 24)]
	public async Task Create_WithInvalidCryptoBlob_ShouldReturn400BadRequest(int nonceLen, int cipherTextLen, int tagLen)
	{
		var auth = await _client.RegisterAndLoginExtAsync();
		var invalidPayload = new EncryptedValueDto(
			Nonce: RandomNumberGenerator.GetBytes(nonceLen),
			CipherText: RandomNumberGenerator.GetBytes(cipherTextLen),
			Tag: RandomNumberGenerator.GetBytes(tagLen)
		);

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", auth.Tokens.AccessToken,
			new CreateEntryRequest(Guid.NewGuid(), invalidPayload));

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Create_WithoutAuth_ShouldReturn401Unauthorized()
	{
		var response = await _client.PostAsJsonAsync(
			"/vault/entries",
			new CreateEntryRequest(Guid.NewGuid(), IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
	}

	[Fact]
	public async Task Get_WithValidId_ShouldReturnEntry()
	{
		var auth = await _client.RegisterAndLoginExtAsync();
		var entryId = Guid.NewGuid();
		var payload = IntegrationTestHelpers.CreateValidEncryptedValueDto();

		await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", auth.Tokens.AccessToken,
			new CreateEntryRequest(entryId, payload));

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Get, $"/vault/entries/{entryId}", auth.Tokens.AccessToken);

		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var data = await response.Content.ReadFromJsonAsync<EntryDto>();
		Assert.NotNull(data);
		Assert.Equal(entryId, data.Id);
		Assert.Equal(payload.Nonce, data.Payload.Nonce);
		Assert.Equal(payload.CipherText, data.Payload.CipherText);
		Assert.Equal(payload.Tag, data.Payload.Tag);
	}

	[Fact]
	public async Task Get_WithNonExistentId_ShouldReturn404NotFound()
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Get, $"/vault/entries/{Guid.NewGuid()}", auth.Tokens.AccessToken);

		Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
	}

	[Fact]
	public async Task Get_OtherUsersEntry_ShouldReturn404NotFound()
	{
		var userA = await _client.RegisterAndLoginExtAsync();
		var userB = await _client.RegisterAndLoginExtAsync();

		var entryId = Guid.NewGuid();
		await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", userA.Tokens.AccessToken,
			new CreateEntryRequest(entryId, IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Get, $"/vault/entries/{entryId}", userB.Tokens.AccessToken);

		Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
	}

	[Fact]
	public async Task List_ShouldReturnUserEntriesOnly()
	{
		var userA = await _client.RegisterAndLoginExtAsync();
		var userB = await _client.RegisterAndLoginExtAsync();

		var entryA1 = Guid.NewGuid();
		var entryA2 = Guid.NewGuid();
		await _client.SendAuthorizedAsync(HttpMethod.Post, "/vault/entries", userA.Tokens.AccessToken,
			new CreateEntryRequest(entryA1, IntegrationTestHelpers.CreateValidEncryptedValueDto()));
		await _client.SendAuthorizedAsync(HttpMethod.Post, "/vault/entries", userA.Tokens.AccessToken,
			new CreateEntryRequest(entryA2, IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		var entryB1 = Guid.NewGuid();
		await _client.SendAuthorizedAsync(HttpMethod.Post, "/vault/entries", userB.Tokens.AccessToken,
			new CreateEntryRequest(entryB1, IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		var response = await _client.SendAuthorizedAsync(HttpMethod.Get, "/vault/entries", userA.Tokens.AccessToken);
		Assert.Equal(HttpStatusCode.OK, response.StatusCode);

		var list = await response.Content.ReadFromJsonAsync<IReadOnlyList<EntryDto>>();
		Assert.NotNull(list);
		Assert.Equal(2, list.Count);
		Assert.Contains(list, e => e.Id == entryA1);
		Assert.Contains(list, e => e.Id == entryA2);
		Assert.DoesNotContain(list, e => e.Id == entryB1);
	}

	[Theory]
	[InlineData(-1, 10)]
	[InlineData(0, 0)]
	[InlineData(0, -5)]
	public async Task List_WithInvalidPagination_ShouldReturn400BadRequest(int skip, int take)
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Get, $"/vault/entries?skip={skip}&take={take}", auth.Tokens.AccessToken);

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Update_WithValidData_ShouldReturn204NoContentAndUpdatePayload()
	{
		var auth = await _client.RegisterAndLoginExtAsync();
		var entryId = Guid.NewGuid();
		var initialPayload = IntegrationTestHelpers.CreateValidEncryptedValueDto();

		await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", auth.Tokens.AccessToken,
			new CreateEntryRequest(entryId, initialPayload));

		var updatedPayload = IntegrationTestHelpers.CreateValidEncryptedValueDto();
		var updateRes = await _client.SendAuthorizedAsync(
			HttpMethod.Put, $"/vault/entries/{entryId}", auth.Tokens.AccessToken,
			new UpdateEntryRequest(updatedPayload));

		Assert.Equal(HttpStatusCode.NoContent, updateRes.StatusCode);

		var getRes = await _client.SendAuthorizedAsync(HttpMethod.Get, $"/vault/entries/{entryId}", auth.Tokens.AccessToken);
		var data = await getRes.Content.ReadFromJsonAsync<EntryDto>();

		Assert.NotNull(data);
		Assert.Equal(updatedPayload.Nonce, data.Payload.Nonce);
		Assert.Equal(updatedPayload.CipherText, data.Payload.CipherText);
	}

	[Fact]
	public async Task Update_NonExistentEntry_ShouldReturn404NotFound()
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Put, $"/vault/entries/{Guid.NewGuid()}", auth.Tokens.AccessToken,
			new UpdateEntryRequest(IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
	}

	[Fact]
	public async Task Update_OtherUsersEntry_ShouldReturn404NotFound()
	{
		var userA = await _client.RegisterAndLoginExtAsync();
		var userB = await _client.RegisterAndLoginExtAsync();

		var entryId = Guid.NewGuid();
		await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", userA.Tokens.AccessToken,
			new CreateEntryRequest(entryId, IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Put, $"/vault/entries/{entryId}", userB.Tokens.AccessToken,
			new UpdateEntryRequest(IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
	}

	[Theory]
	[InlineData(5, 32, 16)]
	[InlineData(16, 32, 16)]
	[InlineData(12, 0, 16)]
	[InlineData(12, 4097, 16)]
	[InlineData(12, 32, 10)]
	[InlineData(12, 32, 24)]
	public async Task Update_WithInvalidCryptoBlob_ShouldReturn400BadRequest(int nonceLen, int cipherTextLen, int tagLen)
	{
		var auth = await _client.RegisterAndLoginExtAsync();
		var entryId = Guid.NewGuid();

		await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", auth.Tokens.AccessToken,
			new CreateEntryRequest(entryId, IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		var invalidPayload = new EncryptedValueDto(
			Nonce: RandomNumberGenerator.GetBytes(nonceLen),
			CipherText: RandomNumberGenerator.GetBytes(cipherTextLen),
			Tag: RandomNumberGenerator.GetBytes(tagLen)
		);

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Put, $"/vault/entries/{entryId}", auth.Tokens.AccessToken,
			new UpdateEntryRequest(invalidPayload));

		Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
	}

	[Fact]
	public async Task Delete_WithValidId_ShouldReturn204NoContentAndRemoveEntry()
	{
		var auth = await _client.RegisterAndLoginExtAsync();
		var entryId = Guid.NewGuid();

		await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", auth.Tokens.AccessToken,
			new CreateEntryRequest(entryId, IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		var deleteRes = await _client.SendAuthorizedAsync(
			HttpMethod.Delete, $"/vault/entries/{entryId}", auth.Tokens.AccessToken);

		Assert.Equal(HttpStatusCode.NoContent, deleteRes.StatusCode);

		var getRes = await _client.SendAuthorizedAsync(HttpMethod.Get, $"/vault/entries/{entryId}", auth.Tokens.AccessToken);
		Assert.Equal(HttpStatusCode.NotFound, getRes.StatusCode);
	}

	[Fact]
	public async Task Delete_NonExistentId_ShouldReturn404NotFound()
	{
		var auth = await _client.RegisterAndLoginExtAsync();

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Delete, $"/vault/entries/{Guid.NewGuid()}", auth.Tokens.AccessToken);

		Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
	}

	[Fact]
	public async Task Delete_OtherUsersEntry_ShouldReturn404NotFound()
	{
		var userA = await _client.RegisterAndLoginExtAsync();
		var userB = await _client.RegisterAndLoginExtAsync();

		var entryId = Guid.NewGuid();
		await _client.SendAuthorizedAsync(
			HttpMethod.Post, "/vault/entries", userA.Tokens.AccessToken,
			new CreateEntryRequest(entryId, IntegrationTestHelpers.CreateValidEncryptedValueDto()));

		var response = await _client.SendAuthorizedAsync(
			HttpMethod.Delete, $"/vault/entries/{entryId}", userB.Tokens.AccessToken);

		Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

		var getRes = await _client.SendAuthorizedAsync(HttpMethod.Get, $"/vault/entries/{entryId}", userA.Tokens.AccessToken);
		Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
	}
}
