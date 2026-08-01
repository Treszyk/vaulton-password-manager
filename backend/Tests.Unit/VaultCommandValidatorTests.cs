using Application.Services.Vault.Commands;
using Application.Services.Vault.Errors;
using Core.Crypto;
using Infrastructure.Services.Vault;

namespace Tests.Unit;

public class VaultCommandValidatorTests
{
	private readonly VaultCommandValidator _validator = new();

	[Fact]
	public async Task ValidateCreate_WithEmptyAccountIdOrEntryId_ShouldReturnInvalidCryptoBlob()
	{
		var validPayload = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] };

		var result1 = _validator.ValidateCreate(new CreateEntryCommand(Guid.Empty, Guid.NewGuid(), validPayload));
		var result2 = _validator.ValidateCreate(new CreateEntryCommand(Guid.NewGuid(), Guid.Empty, validPayload));

		Assert.Equal(VaultError.InvalidCryptoBlob, result1);
		Assert.Equal(VaultError.InvalidCryptoBlob, result2);
	}

	[Fact]
	public async Task ValidateList_WithEmptyAccountIdOrInvalidBounds_ShouldReturnInvalidCryptoBlob()
	{
		var result1 = _validator.ValidateList(new ListEntriesCommand(Guid.Empty, 0, 10));
		var result2 = _validator.ValidateList(new ListEntriesCommand(Guid.NewGuid(), -1, 10));
		var result3 = _validator.ValidateList(new ListEntriesCommand(Guid.NewGuid(), 0, 0));

		Assert.Equal(VaultError.InvalidCryptoBlob, result1);
		Assert.Equal(VaultError.InvalidCryptoBlob, result2);
		Assert.Equal(VaultError.InvalidCryptoBlob, result3);
	}

	[Fact]
	public async Task ValidateGet_WithEmptyAccountIdOrEntryId_ShouldReturnNotFound()
	{
		var result1 = _validator.ValidateGet(new GetEntryCommand(Guid.Empty, Guid.NewGuid()));
		var result2 = _validator.ValidateGet(new GetEntryCommand(Guid.NewGuid(), Guid.Empty));

		Assert.Equal(VaultError.NotFound, result1);
		Assert.Equal(VaultError.NotFound, result2);
	}

	[Fact]
	public async Task ValidateDelete_WithEmptyAccountIdOrEntryId_ShouldReturnNotFound()
	{
		var result1 = _validator.ValidateDelete(new DeleteEntryCommand(Guid.Empty, Guid.NewGuid()));
		var result2 = _validator.ValidateDelete(new DeleteEntryCommand(Guid.NewGuid(), Guid.Empty));

		Assert.Equal(VaultError.NotFound, result1);
		Assert.Equal(VaultError.NotFound, result2);
	}

	[Fact]
	public async Task ValidateUpdate_WithEmptyAccountIdOrEntryId_ShouldReturnNotFound()
	{
		var validPayload = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] };

		var result1 = _validator.ValidateUpdate(new UpdateEntryCommand(Guid.Empty, Guid.NewGuid(), validPayload));
		var result2 = _validator.ValidateUpdate(new UpdateEntryCommand(Guid.NewGuid(), Guid.Empty, validPayload));

		Assert.Equal(VaultError.NotFound, result1);
		Assert.Equal(VaultError.NotFound, result2);
	}
}
