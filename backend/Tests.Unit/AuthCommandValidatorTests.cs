using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Core.Crypto;
using Infrastructure.Services.Auth;

namespace Tests.Unit;

public class AuthCommandValidatorTests
{
	private readonly AuthCommandValidator _validator = new();

	[Fact]
	public async Task ValidateRegister_WithUnsupportedCryptoSchema_ShouldReturnUnsupportedCryptoSchema()
	{
		var cmd = new RegisterCommand(
			Guid.NewGuid(), new byte[32], new byte[32], new byte[32],
			new byte[16], KdfMode.Default,
			new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
			new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
			CryptoSchemaVer: 99);

		var result = _validator.ValidateRegister(cmd);

		Assert.Equal(RegisterError.UnsupportedCryptoSchema, result);
	}

	[Fact]
	public async Task ValidateLogin_WithInvalidVerifierLength_ShouldReturnInvalidCredentials()
	{
		var cmd = new LoginCommand(Guid.NewGuid(), Verifier: new byte[10]);

		var result = _validator.ValidateLogin(cmd);

		Assert.Equal(LoginError.InvalidCredentials, result);
	}

	[Fact]
	public async Task ValidateWraps_WithInvalidAdminVerifierLength_ShouldReturnInvalidCryptoBlob()
	{
		var cmd = new WrapsCommand(Guid.NewGuid(), AdminVerifier: new byte[10]);

		var result = _validator.ValidateWraps(cmd);

		Assert.Equal(WrapsError.InvalidCryptoBlob, result);
	}

	[Fact]
	public async Task ValidateChangePassword_WithInvalidCryptoSet_ShouldReturnInvalidCryptoBlob()
	{
		var cmd = new ChangePasswordCommand(
			Guid.NewGuid(), AdminVerifier: new byte[32],
			NewVerifier: new byte[10],
			NewAdminVerifier: new byte[32], NewRkVerifier: new byte[32],
			NewS_Pwd: new byte[16], NewKdfMode: KdfMode.Default,
			NewMkWrapPwd: new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
			NewMkWrapRk: new EncryptedValue { Nonce = new byte[12], CipherText = new byte[32], Tag = new byte[16] },
			CryptoSchemaVer: 1);

		var result = _validator.ValidateChangePassword(cmd);

		Assert.Equal(ChangePasswordError.InvalidCryptoBlob, result);
	}
}
