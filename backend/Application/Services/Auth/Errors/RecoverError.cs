namespace Application.Services.Auth.Errors;

public enum RecoverError
{
	AccountNotFound,
	InvalidRkVerifier,
	InvalidCryptoBlob,
	InvalidKdfMode,
	UnsupportedCryptoSchema
}
