using Application.Services.Auth.Errors;

namespace Application.Services.Auth.Results;

public sealed class RecoverResult
{
	public bool Success { get; }
	public RecoverError? Error { get; }

	private RecoverResult(bool success, RecoverError? error)
	{
		Success = success;
		Error = error;
	}

	public static RecoverResult Ok() => new(true, null);
	public static RecoverResult Fail(RecoverError error) => new(false, error);
}
