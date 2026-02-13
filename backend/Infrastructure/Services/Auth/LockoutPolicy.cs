using Application.Services.Auth;
using Core.Entities;

namespace Infrastructure.Services.Auth
{
	public sealed class LockoutPolicy : ILockoutPolicy
	{
		private const int MaxFailedLoginAttempts = 7;
		private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(10);

		public bool IsLockedOut(User user, DateTime now)
			=> user.LockedUntil is not null && user.LockedUntil > now;

		public void RegisterFailedLogin(User user, DateTime now)
		{
			user.FailedLoginCount = Math.Min(user.FailedLoginCount + 1, MaxFailedLoginAttempts);
			user.LastFailedLoginAt = now;
			user.UpdatedAt = now;

			if (user.FailedLoginCount >= MaxFailedLoginAttempts)
			{
				user.LockedUntil = now.Add(LockoutDuration);
				user.FailedLoginCount = 0;
			}
		}

		public void RegisterSuccessfulLogin(User user, DateTime now)
		{
			user.FailedLoginCount = 0;
			user.LastFailedLoginAt = null;
			user.LockedUntil = null;
			user.UpdatedAt = now;
		}
	}
}
