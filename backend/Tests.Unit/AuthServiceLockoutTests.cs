using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Results;
using Core.Crypto;
using Core.Entities;
using Infrastructure.Services.Auth;
using Microsoft.Extensions.Configuration;
using Moq;
using System.Security.Cryptography;
using FluentAssertions;

namespace Tests.Unit;

public class AuthServiceLockoutTests : SqliteTestBase
{
    private readonly AuthService _sut;
    private readonly Mock<ITokenIssuer> _tokenIssuer = new();
    private readonly Mock<IAuthCommandValidator> _validator = new();
    private readonly Mock<IRefreshTokenStore> _refreshTokenStore = new();
    private readonly AuthCryptoHelpers _cryptoHelpers;
    private readonly LockoutPolicy _lockoutPolicy = new();

    public AuthServiceLockoutTests()
    {
        var pepper = new byte[32];
        var fakeSaltSet = new byte[32];
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Auth:VerifierPbkdf2Iterations"] = "100",
            ["Auth:VerifierPepper"] = Convert.ToBase64String(pepper),
            ["Auth:FakeSaltSecret"] = Convert.ToBase64String(fakeSaltSet)
        }).Build();
        
        var options = new AuthCryptoOptions(config);
        _cryptoHelpers = new AuthCryptoHelpers(options);

        _sut = new AuthService(
            Db,
            _tokenIssuer.Object,
            _cryptoHelpers,
            _validator.Object,
            _lockoutPolicy,
            _refreshTokenStore.Object);
    }

    private User CreateTestUser(Guid id)
    {
        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = id,
            Verifier = new byte[32],
            S_Verifier = new byte[16],
            AdminVerifier = new byte[32],
            S_AdminVerifier = new byte[16],
            RkVerifier = new byte[32],
            S_Rk = new byte[16],
            S_Pwd = new byte[16],
            KdfMode = KdfMode.Default,
            MkWrapPwd = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            MkWrapRk = new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            CreatedAt = now,
            UpdatedAt = now
        };
        Db.Users.Add(user);
        Db.SaveChanges();
        return user;
    }

    [Fact]
    public async Task LoginAsync_FailedVerifier_IncrementsFailedCount()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var cmd = new LoginCommand(userId, new byte[32]);
        _validator.Setup(v => v.ValidateLogin(cmd)).Returns((Application.Services.Auth.Errors.LoginError?)null);

        var result = await _sut.LoginAsync(cmd);

        result.Success.Should().BeFalse();
        var updatedUser = Db.Users.Find(userId);
        updatedUser!.FailedLoginCount.Should().Be(1);
    }

    [Fact]
    public async Task GetWrapsAsync_FailedAdminVerifier_IncrementsFailedCount()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var cmd = new WrapsCommand(userId, new byte[32]);
        _validator.Setup(v => v.ValidateWraps(cmd)).Returns((Application.Services.Auth.Errors.WrapsError?)null);

        var result = await _sut.GetWrapsAsync(cmd);

        result.Success.Should().BeFalse();
        var updatedUser = Db.Users.Find(userId);
        updatedUser!.FailedLoginCount.Should().Be(1);
    }

    [Fact]
    public async Task ChangePasswordAsync_FailedAdminVerifier_IncrementsFailedCount()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var cmd = new ChangePasswordCommand(
            userId, 
            new byte[32],
            new byte[32],
            new byte[32],
            new byte[16],
            KdfMode.Default,
            new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            null, null, 1);
        
        _validator.Setup(v => v.ValidateChangePassword(cmd)).Returns((Application.Services.Auth.Errors.ChangePasswordError?)null);

        var result = await _sut.ChangePasswordAsync(cmd);

        result.Success.Should().BeFalse();
        var updatedUser = Db.Users.Find(userId);
        updatedUser!.FailedLoginCount.Should().Be(1);
    }

    [Fact]
    public async Task GetRecoveryWrapsAsync_FailedRecoveryVerifier_IncrementsFailedCount()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var wrongRkVerifier = new byte[32];

        var result = await _sut.GetRecoveryWrapsAsync(userId, wrongRkVerifier);

        var updatedUser = Db.Users.Find(userId);
        updatedUser!.FailedLoginCount.Should().Be(1);
    }

    [Fact]
    public async Task RecoverAsync_FailedRecoveryVerifier_IncrementsFailedCount()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var cmd = new RecoverCommand(
            userId,
            new byte[32],
            new byte[32],
            new byte[32],
            new byte[32],
            new byte[16],
            KdfMode.Default,
            new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
            1);

        _validator.Setup(v => v.ValidateRecover(cmd)).Returns((Application.Services.Auth.Errors.RecoverError?)null);

        var result = await _sut.RecoverAsync(cmd);

        result.Success.Should().BeFalse();
        var updatedUser = Db.Users.Find(userId);
        updatedUser!.FailedLoginCount.Should().Be(1);
    }

    [Fact]
    public async Task Lockout_After7Failures_ShouldReturnLockedUntil()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        var cmd = new LoginCommand(userId, new byte[32]);
        _validator.Setup(v => v.ValidateLogin(cmd)).Returns((Application.Services.Auth.Errors.LoginError?)null);

        for (int i = 0; i < 7; i++)
        {
            await _sut.LoginAsync(cmd);
        }

        var lockedUser = Db.Users.Find(userId);
        lockedUser!.LockedUntil.Should().NotBeNull();
        lockedUser.LockedUntil.Value.Should().BeAfter(DateTime.UtcNow);
        
        var result6 = await _sut.LoginAsync(cmd);
        result6.Success.Should().BeFalse();
    }

    [Fact]
    public async Task LoginAsync_Success_ShouldResetFailedLoginCount()
    {
        var userId = Guid.NewGuid();
        var user = CreateTestUser(userId);
        
        var rawVerifier = new byte[] { 1, 2, 3 };
        var salt = new byte[16];
        var storedVerifier = _cryptoHelpers.ComputeStoredVerifier(rawVerifier, salt);
        
        user.Verifier = storedVerifier;
        user.S_Verifier = salt;
        user.FailedLoginCount = 3;
        Db.SaveChanges();

        var cmd = new LoginCommand(userId, rawVerifier);
        _validator.Setup(v => v.ValidateLogin(cmd)).Returns((Application.Services.Auth.Errors.LoginError?)null);
        _tokenIssuer.Setup(t => t.IssueToken(userId)).Returns(new IssuedTokenResult("jwt", "jti"));
        _refreshTokenStore.Setup(r => r.MintAsync(userId, It.IsAny<byte[]>(), It.IsAny<DateTime>()))
            .ReturnsAsync(new RefreshTokenIssueResult("refresh", DateTime.UtcNow.AddDays(7)));

        var result = await _sut.LoginAsync(cmd);

        result.Success.Should().BeTrue();
        var updatedUser = Db.Users.Find(userId);
        updatedUser!.FailedLoginCount.Should().Be(0);
    }

    [Fact]
    public async Task PreLoginAsync_NonExistentUser_ShouldReturnDeterministicFakeSalt()
    {
        var nonExistentId = Guid.NewGuid();
        var cmd = new PreLoginCommand(nonExistentId);

        var result1 = await _sut.PreLoginAsync(cmd);
        var result2 = await _sut.PreLoginAsync(cmd);

        result1.Success.Should().BeTrue();
        result2.Success.Should().BeTrue();
        
        result1.S_Pwd.Should().Equal(result2.S_Pwd);
        
        result1.S_Pwd.Should().NotBeNullOrEmpty();
        result1.S_Pwd.Should().HaveCount(CryptoSizes.SaltLen);
    }
}
