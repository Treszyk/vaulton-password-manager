namespace Application.Services.Auth.Results;

public sealed record RefreshTokenIssueResult(string Token, DateTime ExpiresAt);
