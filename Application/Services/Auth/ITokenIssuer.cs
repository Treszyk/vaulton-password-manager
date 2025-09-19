namespace Application.Services.Auth;

public interface ITokenIssuer
{
	string IssueToken(Guid accountId);
}
