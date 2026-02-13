using Application.Services.Vault.Commands;
using Application.Services.Vault.Errors;
using Core.Crypto;
using Core.Entities;
using FluentAssertions;
using Infrastructure.Services.Vault;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Tests.Unit;

public class VaultServiceTests : SqliteTestBase
{
    private readonly VaultService _service;
    private readonly Guid _userA = Guid.NewGuid();
    private readonly Guid _userB = Guid.NewGuid();

    public VaultServiceTests()
    {
        _service = new VaultService(Db, new VaultCommandValidator());
    }

    private EncryptedValue CreateDummyPayload(int size = 32) => new()
    {
        Nonce = new byte[12],
        Tag = new byte[16],
        CipherText = new byte[size]
    };

    private async Task SeedUsersAsync()
    {
        if (await Db.Users.AnyAsync(u => u.Id == _userA)) return;

        var mkWrap = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] };

        Db.Users.Add(new User 
        { 
            Id = _userA, 
            Verifier = new byte[32], S_Verifier = new byte[16],
            AdminVerifier = new byte[32], S_AdminVerifier = new byte[16],
            S_Pwd = new byte[16],
            MkWrapPwd = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            MkWrapRk = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            RkVerifier = new byte[32], S_Rk = new byte[16],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        
        Db.Users.Add(new User 
        { 
            Id = _userB, 
            Verifier = new byte[32], S_Verifier = new byte[16],
            AdminVerifier = new byte[32], S_AdminVerifier = new byte[16],
            S_Pwd = new byte[16],
            MkWrapPwd = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            MkWrapRk = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            RkVerifier = new byte[32], S_Rk = new byte[16],
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await Db.SaveChangesAsync();
    }

    [Fact]
    public async Task GetEntry_UserACannotAccessUserBEntry_ReturnsNotFound()
    {
        await SeedUsersAsync();
        var entryId = Guid.NewGuid();
        Db.Entries.Add(new Entry 
        { 
            Id = entryId, 
            UserId = _userB, 
            Payload = CreateDummyPayload(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await Db.SaveChangesAsync();

        var result = await _service.GetEntryAsync(new GetEntryCommand(_userA, entryId));

        result.Success.Should().BeFalse();
        result.Error.Should().Be(VaultError.NotFound);
    }

    [Fact]
    public async Task UpdateEntry_UserACannotUpdateUserBEntry_ReturnsNotFound()
    {
        await SeedUsersAsync();
        var entryId = Guid.NewGuid();
        Db.Entries.Add(new Entry 
        { 
            Id = entryId, 
            UserId = _userB, 
            Payload = CreateDummyPayload(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await Db.SaveChangesAsync();

        var result = await _service.UpdateEntryAsync(new UpdateEntryCommand(_userA, entryId, CreateDummyPayload()));

        result.Success.Should().BeFalse();
        result.Error.Should().Be(VaultError.NotFound);
        
        var dbEntry = await Db.Entries.AsNoTracking().FirstAsync(e => e.Id == entryId);
        dbEntry.UserId.Should().Be(_userB);
    }

    [Fact]
    public async Task DeleteEntry_UserACannotDeleteUserBEntry_ReturnsNotFound()
    {
        await SeedUsersAsync();
        var entryId = Guid.NewGuid();
        Db.Entries.Add(new Entry 
        { 
            Id = entryId, 
            UserId = _userB, 
            Payload = CreateDummyPayload(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        await Db.SaveChangesAsync();

        var result = await _service.DeleteEntryAsync(new DeleteEntryCommand(_userA, entryId));

        result.Success.Should().BeFalse();
        result.Error.Should().Be(VaultError.NotFound);
        
        (await Db.Entries.AnyAsync(e => e.Id == entryId)).Should().BeTrue();
    }

    [Fact]
    public async Task CreateEntry_PayloadTooLarge_ReturnsInvalidCryptoBlob()
    {
        await SeedUsersAsync();
        var oversizedPayload = CreateDummyPayload(CryptoSizes.MaxEntryCiphertextBytes + 1);

        var result = await _service.CreateEntryAsync(new CreateEntryCommand(_userA, Guid.NewGuid(), oversizedPayload));

        result.Success.Should().BeFalse();
        result.Error.Should().Be(VaultError.InvalidCryptoBlob);
    }

    [Fact]
    public async Task ListEntries_ReturnsOnlyOwnedEntries()
    {
        await SeedUsersAsync();
        Db.Entries.Add(new Entry { Id = Guid.NewGuid(), UserId = _userA, Payload = CreateDummyPayload(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        Db.Entries.Add(new Entry { Id = Guid.NewGuid(), UserId = _userB, Payload = CreateDummyPayload(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await Db.SaveChangesAsync();

        var result = await _service.ListEntriesAsync(new ListEntriesCommand(_userA, 0, 10));

        result.Success.Should().BeTrue();
        result.Entries.Should().HaveCount(1);
    }
}
