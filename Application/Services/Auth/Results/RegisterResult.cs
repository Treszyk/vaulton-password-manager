using Application.Services.Auth.Errors;

namespace Application.Services.Auth.Results;

public sealed record RegisterResult(
	bool Success,
	Guid? AccountId,
	RegisterError? Error
)
{
	public static RegisterResult Ok(Guid accountId) => new(true, accountId, null);
	public static RegisterResult Fail(RegisterError error) => new(false, null, error);
}
