namespace Application.Services.Auth.Errors;

public enum ChangePasswordError
{
	AccountNotFound,
	InvalidAdminVerifier,
	UnsupportedCryptoSchema,
	InvalidKdfMode,
	InvalidCryptoBlob
}
