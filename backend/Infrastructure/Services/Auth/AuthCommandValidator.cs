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

			var ok = IsValidCryptoSet(
				cmd.Verifier, cmd.AdminVerifier, cmd.RkVerifier,
				cmd.S_Pwd, cmd.KdfMode, cmd.MkWrapPwd, cmd.MkWrapRk,
				rkRequired: true);

			return ok ? null : RegisterError.InvalidCryptoBlob;
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

			if (cmd.AdminVerifier.Length != CryptoSizes.VerifierLen)
				return ChangePasswordError.InvalidCryptoBlob;

			var ok = IsValidCryptoSet(
				cmd.NewVerifier, cmd.NewAdminVerifier, cmd.NewRkVerifier,
				cmd.NewS_Pwd, cmd.NewKdfMode, cmd.NewMkWrapPwd, cmd.NewMkWrapRk,
				rkRequired: false);

			return ok ? null : ChangePasswordError.InvalidCryptoBlob;
		}

		public RecoverError? ValidateRecover(RecoverCommand cmd)
		{
			if (cmd.CryptoSchemaVer != 1)
				return RecoverError.UnsupportedCryptoSchema;

			if (cmd.RkVerifier.Length != CryptoSizes.VerifierLen)
				return RecoverError.InvalidCryptoBlob;

			var ok = IsValidCryptoSet(
				cmd.NewVerifier, cmd.NewAdminVerifier, cmd.NewRkVerifier,
				cmd.NewS_Pwd, cmd.NewKdfMode, cmd.NewMkWrapPwd, cmd.NewMkWrapRk,
				rkRequired: true);

			return ok ? null : RecoverError.InvalidCryptoBlob;
		}

		private static bool IsValidCryptoSet(
			byte[] verifier,
			byte[] adminVerifier,
			byte[]? rkVerifier,
			byte[] sPwd,
			KdfMode kdfMode,
			EncryptedValue mkWrapPwd,
			EncryptedValue? mkWrapRk,
			bool rkRequired)
		{
			if (verifier.Length != CryptoSizes.VerifierLen ||
				adminVerifier.Length != CryptoSizes.VerifierLen ||
				sPwd.Length != CryptoSizes.SaltLen)
			{
				return false;
			}

			if (rkRequired)
			{
				if (rkVerifier == null || rkVerifier.Length != CryptoSizes.VerifierLen)
					return false;
				
				if (mkWrapRk == null || !CryptoValidators.IsValidEncryptedValue(mkWrapRk, CryptoSizes.MkLen))
					return false;
			}
			else
			{
				if (rkVerifier != null && rkVerifier.Length != CryptoSizes.VerifierLen)
					return false;

				if (mkWrapRk != null && !CryptoValidators.IsValidEncryptedValue(mkWrapRk, CryptoSizes.MkLen))
					return false;
			}

			if (!CryptoValidators.IsValidEncryptedValue(mkWrapPwd, CryptoSizes.MkLen))
				return false;

			if (kdfMode is not KdfMode.Default and not KdfMode.Strong)
				return false;

			return true;
		}
	}
}
