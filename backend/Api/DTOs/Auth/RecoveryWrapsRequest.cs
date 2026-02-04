namespace Api.DTOs.Auth;

public record RecoveryWrapsRequest(Guid AccountId, byte[] RkVerifier);
