using Application.Services.Auth.Errors;

namespace Application.Services.Auth.Results;

public sealed class ChangePasswordResult
{
	public bool Success { get; }
	public ChangePasswordError? Error { get; }

	private ChangePasswordResult(bool success, ChangePasswordError? error)
	{
		Success = success;
		Error = error;
	}

	public static ChangePasswordResult Ok() => new(true, null);
	public static ChangePasswordResult Fail(ChangePasswordError error) => new(false, error);
}
