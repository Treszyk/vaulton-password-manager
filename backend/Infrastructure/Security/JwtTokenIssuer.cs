using Application.Services.Auth;
using Application.Services.Auth.Results;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace Infrastructure.Security;

public sealed class JwtTokenIssuer(IConfiguration config) : ITokenIssuer
{
	private readonly IConfiguration _config = config;

	public IssuedTokenResult IssueToken(Guid accountId)
	{
		var secret = _config["Jwt:Secret"]
			?? throw new InvalidOperationException("Missing Jwt:Secret");

		if (Encoding.UTF8.GetByteCount(secret) < 32)
			throw new InvalidOperationException("Jwt:Secret must be at least 32 bytes (HS256).");

		var issuer = _config["Jwt:Issuer"];
		var audience = _config["Jwt:Audience"];

		var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
		var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

		var now = DateTime.UtcNow;
		var expires = now.AddMinutes(20);
		var jti = Guid.NewGuid().ToString();

		var claims = new Dictionary<string, object>
		{
			{ JwtRegisteredClaimNames.Sub, accountId.ToString() },
			{ JwtRegisteredClaimNames.Jti, jti },
			{ JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUnixTimeSeconds() }
		};

		var descriptor = new SecurityTokenDescriptor
		{
			Issuer = issuer,
			Audience = audience,
			Claims = claims,
			NotBefore = now,
			Expires = expires,
			SigningCredentials = creds
		};

		var handler = new JsonWebTokenHandler();
		var token = handler.CreateToken(descriptor);

		return new IssuedTokenResult(token, jti);
	}
}
