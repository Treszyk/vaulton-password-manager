using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;

namespace Application.Services.Auth;

public interface IAuthCommandValidator
{
	RegisterError? ValidateRegister(RegisterCommand cmd);
	LoginError? ValidateLogin(LoginCommand cmd);
}
