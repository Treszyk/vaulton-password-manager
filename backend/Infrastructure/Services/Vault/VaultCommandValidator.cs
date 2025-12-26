using Application.Services.Vault;
using Application.Services.Vault.Commands;
using Application.Services.Vault.Errors;
using Core.Crypto;

namespace Infrastructure.Services.Vault;

public sealed class VaultCommandValidator : IVaultCommandValidator
{
	public VaultError? ValidateCreate(CreateEntryCommand cmd)
	{
		if (cmd.AccountId == Guid.Empty || cmd.EntryId == Guid.Empty)
			return VaultError.InvalidCryptoBlob;

		if (!IsValidDomainTag(cmd.DomainTag) || !IsValidPayload(cmd.Payload))
			return VaultError.InvalidCryptoBlob;

		return null;
	}

	public VaultError? ValidateList(ListEntriesCommand cmd)
	{
		if (cmd.AccountId == Guid.Empty)
			return VaultError.InvalidCryptoBlob;

		if (cmd.Skip < 0 || cmd.Take <= 0)
			return VaultError.InvalidCryptoBlob;

		return null;
	}

	public VaultError? ValidateGet(GetEntryCommand cmd)
	{
		if (cmd.AccountId == Guid.Empty || cmd.EntryId == Guid.Empty)
			return VaultError.NotFound;

		return null;
	}

	public VaultError? ValidateDelete(DeleteEntryCommand cmd)
	{
		if (cmd.AccountId == Guid.Empty || cmd.EntryId == Guid.Empty)
			return VaultError.NotFound;

		return null;
	}

	public VaultError? ValidateUpdate(UpdateEntryCommand cmd)
	{
		if (cmd.AccountId == Guid.Empty || cmd.EntryId == Guid.Empty)
			return VaultError.NotFound;

		if (!IsValidDomainTag(cmd.DomainTag) || !IsValidPayload(cmd.Payload))
			return VaultError.InvalidCryptoBlob;

		return null;
	}

	private static bool IsValidDomainTag(byte[] tag)
		=> tag is { Length: CryptoSizes.DomainTagLen };

	private static bool IsValidPayload(EncryptedValue p)
		=> CryptoValidators.IsValidEncryptedValue(p, 1, CryptoSizes.MaxEntryCiphertextBytes);
}
