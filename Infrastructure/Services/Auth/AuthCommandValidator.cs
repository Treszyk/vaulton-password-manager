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

			if (!AuthCryptoHelpers.IsValidMkWrap(cmd.MkWrapPwd))
				return RegisterError.InvalidCryptoBlob;

			if (cmd.MkWrapRk is not null && !AuthCryptoHelpers.IsValidMkWrap(cmd.MkWrapRk))
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
	}
}
