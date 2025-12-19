namespace Application.Services.Auth.Errors;

public enum RegisterError
{
	UnsupportedCryptoSchema,
	AccountExists,
	InvalidKdfMode
}
