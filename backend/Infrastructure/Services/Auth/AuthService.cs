using Application.Services.Auth;
using Application.Services.Auth.Commands;
using Application.Services.Auth.Errors;
using Application.Services.Auth.Results;
using Core.Crypto;
using Core.Entities;
using Core.Enums;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace Infrastructure.Services.Auth
{
	public sealed partial class AuthService(
		VaultonDbContext db,
		ITokenIssuer tokenIssuer,
		AuthCryptoHelpers cryptoHelpers,
		IAuthCommandValidator validator,
		ILockoutPolicy lockoutPolicy,
		IRefreshTokenStore refreshTokenStore) : IAuthService
	{
	}
}
