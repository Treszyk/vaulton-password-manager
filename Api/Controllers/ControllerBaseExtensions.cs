using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Api.Controllers;

public static class ControllerBaseExtensions
{
	public static bool TryGetAccountId(this ClaimsPrincipal user, out Guid accountId)
	{
		accountId = default;

		if (user is null)
			return false;

		var sub = user.FindFirstValue(JwtRegisteredClaimNames.Sub);
		return Guid.TryParse(sub, out accountId);
	}
}
