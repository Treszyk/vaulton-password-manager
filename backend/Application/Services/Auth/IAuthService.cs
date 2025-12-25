using Application.Services.Auth.Commands;
using Application.Services.Auth.Results;

namespace Application.Services.Auth;

public interface IAuthService
{
	Task<Guid> PreRegisterAsync();
	Task<RegisterResult> RegisterAsync(RegisterCommand cmd);
	Task<LoginResult> LoginAsync(LoginCommand cmd);
	Task<RefreshResult> RefreshAsync(RefreshCommand cmd);
	Task LogoutAsync(string refreshToken);
	Task LogoutAllAsync(Guid accountId);
	Task<PreLoginResult> PreLoginAsync(PreLoginCommand cmd);
}
