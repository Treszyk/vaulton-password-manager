using Core.Entities;

namespace Application.Services.Auth;

public interface ILockoutPolicy
{
	bool IsLockedOut(User user, DateTime now);
	void RegisterFailedLogin(User user, DateTime now);
	void RegisterSuccessfulLogin(User user, DateTime now);
}
