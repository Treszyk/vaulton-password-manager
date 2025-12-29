using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Core.Crypto;

namespace Infrastructure.Services.Auth
{
	public sealed class AuthCommandValidator : IAuthCommandValidator
	{
		public RegisterError? ValidateRegister(RegisterCommand cmd)
		{
			if (cmd.CryptoSchemaVer != 1)
				return RegisterError.UnsupportedCryptoSchema;

			if (cmd.Verifier.Length != CryptoSizes.VerifierLen || cmd.S_Pwd.Length != CryptoSizes.SaltLen)
				return RegisterError.InvalidCryptoBlob;

			if (!CryptoValidators.IsValidEncryptedValue(cmd.MkWrapPwd, CryptoSizes.MkLen))
				return RegisterError.InvalidCryptoBlob;

			if (cmd.MkWrapRk is not null && !CryptoValidators.IsValidEncryptedValue(cmd.MkWrapRk, CryptoSizes.MkLen))
				return RegisterError.InvalidCryptoBlob;

			if (cmd.KdfMode is not KdfMode.Default and not KdfMode.Strong)
				return RegisterError.InvalidKdfMode;

			return null;
		}

		public LoginError? ValidateLogin(LoginCommand cmd)
		{
			if (cmd.Verifier.Length != CryptoSizes.VerifierLen)
				return LoginError.InvalidCredentials;

			return null;
		}

		public WrapsError? ValidateWraps(WrapsCommand cmd)
		{
			if (cmd.AdminVerifier.Length != CryptoSizes.VerifierLen)
				return WrapsError.InvalidCryptoBlob;

			return null;
		}

		public ChangePasswordError? ValidateChangePassword(ChangePasswordCommand cmd)
		{
			if (cmd.CryptoSchemaVer != 1)
				return ChangePasswordError.UnsupportedCryptoSchema;

			if (cmd.AdminVerifier.Length != CryptoSizes.VerifierLen ||
				cmd.NewVerifier.Length != CryptoSizes.VerifierLen ||
				cmd.NewAdminVerifier.Length != CryptoSizes.VerifierLen ||
				cmd.NewS_Pwd.Length != CryptoSizes.SaltLen)
			{
				return ChangePasswordError.InvalidCryptoBlob;
			}

			if (!CryptoValidators.IsValidEncryptedValue(cmd.NewMkWrapPwd, CryptoSizes.MkLen))
				return ChangePasswordError.InvalidCryptoBlob;

			if (cmd.NewMkWrapRk is not null && !CryptoValidators.IsValidEncryptedValue(cmd.NewMkWrapRk, CryptoSizes.MkLen))
				return ChangePasswordError.InvalidCryptoBlob;

			if (cmd.NewKdfMode is not KdfMode.Default and not KdfMode.Strong)
				return ChangePasswordError.InvalidKdfMode;

			return null;
		}
	}
}
