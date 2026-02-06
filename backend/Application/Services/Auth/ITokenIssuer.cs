using Application.Services.Auth.Results;

namespace Application.Services.Auth;

public interface ITokenIssuer
{
	IssuedTokenResult IssueToken(Guid accountId);
}
