using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Application.Services.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Infrastructure.Security;

public sealed class JwtTokenIssuer(IConfiguration config) : ITokenIssuer
{
	private readonly IConfiguration _config = config;

	public string IssueToken(Guid accountId)
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

		var claims = new[]
		{
			new Claim(JwtRegisteredClaimNames.Sub, accountId.ToString()),
			new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
			new Claim(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
		};

		var token = new JwtSecurityToken(
			issuer: issuer,
			audience: audience,
			claims: claims,
			notBefore: now,
			expires: expires,
			signingCredentials: creds
		);

		return new JwtSecurityTokenHandler().WriteToken(token);
	}
}
