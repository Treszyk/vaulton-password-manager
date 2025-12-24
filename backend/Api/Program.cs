using Api.Health;
using Api.Startup;
using Application.Services.Auth;
using Application.Services.Vault;
using Infrastructure.Data;
using Infrastructure.Security;
using Infrastructure.Services.Auth;
using Infrastructure.Services.Vault;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;

namespace Api
{
	public static class Program
	{
		private static async Task Main(string[] args)
		{
			var builder = WebApplication.CreateBuilder(args);

			var conn =
				builder.Configuration.GetConnectionString("Default")
				?? Environment.GetEnvironmentVariable("ConnectionStrings__Default")
				?? throw new InvalidOperationException("Connection string not configured. Set ConnectionStrings:Default or ConnectionStrings__Default.");

			builder.Services.AddDbContext<VaultonDbContext>(o =>
				o.UseSqlServer(conn, sql => sql.EnableRetryOnFailure()));

			builder.Services.AddControllers();
			builder.Services.AddHealthChecks()
				.AddCheck<FastSqlHealthCheck>("sql");
			builder.Services.AddEndpointsApiExplorer();
			builder.Services.AddSwaggerGen(c =>
			{
				c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
				{
					Name = "Authorization",
					Type = SecuritySchemeType.Http,
					Scheme = "bearer",
					BearerFormat = "JWT",
					In = ParameterLocation.Header,
					Description = "Paste: Bearer {your JWT token}"
				});

				c.AddSecurityRequirement(new OpenApiSecurityRequirement
				{
					{
						new OpenApiSecurityScheme
						{
							Reference = new OpenApiReference
							{
								Type = ReferenceType.SecurityScheme,
								Id = "Bearer"
							}
						},
						Array.Empty<string>()
					}
				});
			});

			builder.Services.AddSingleton<ITokenIssuer, JwtTokenIssuer>();
			builder.Services.AddSingleton<AuthCryptoOptions>();
			builder.Services.AddSingleton<AuthCryptoHelpers>();
			builder.Services.AddSingleton<IAuthCommandValidator, AuthCommandValidator>();
			builder.Services.AddSingleton<IVaultCommandValidator, VaultCommandValidator>();
			builder.Services.AddSingleton<ILockoutPolicy, LockoutPolicy>();
			builder.Services.AddScoped<IRefreshTokenStore, RefreshTokenStore>();
			builder.Services.AddScoped<IAuthService, AuthService>();
			builder.Services.AddScoped<IVaultService, VaultService>();

			var jwtSecret = builder.Configuration["Jwt:Secret"]
				?? throw new InvalidOperationException("Missing Jwt:Secret");

			if (Encoding.UTF8.GetByteCount(jwtSecret) < 32)
				throw new InvalidOperationException("Jwt:Secret must be at least 32 bytes (HS256).");

			var jwtIssuer = builder.Configuration["Jwt:Issuer"];
			var jwtAudience = builder.Configuration["Jwt:Audience"];

			builder.Services
				.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
				.AddJwtBearer(options =>
				{
					options.TokenValidationParameters = new TokenValidationParameters
					{
						ValidateIssuerSigningKey = true,
						IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),

						ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
						ValidIssuer = jwtIssuer,

						ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
						ValidAudience = jwtAudience,

						ValidateLifetime = true,
						ClockSkew = TimeSpan.FromSeconds(30)
					};
					options.MapInboundClaims = false;
					options.TokenValidationParameters.NameClaimType = JwtRegisteredClaimNames.Sub;
				});

			builder.Services.AddAuthorization();
			builder.Services.AddRateLimiter(options =>
			{
				options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
				options.AddPolicy("AuthPolicy", context =>
				{
					var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
					return RateLimitPartition.GetFixedWindowLimiter(
						ip,
						_ => new FixedWindowRateLimiterOptions
						{
							PermitLimit = 10,
							Window = TimeSpan.FromMinutes(1),
							QueueLimit = 0,
							AutoReplenishment = true
						});
				});
			});

			var app = builder.Build();

			app.MapHealthChecks("/healthz", new HealthCheckOptions
			{
				ResponseWriter = async (ctx, report) =>
				{
					ctx.Response.ContentType = "application/json";
					var status = report.Status == HealthStatus.Healthy ? "ok" : "unavailable";
					await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { status }));
				}
			});

			await app.ApplyMigrationsAsync();

			if (app.Environment.IsDevelopment())
			{
				app.UseSwagger();
				app.UseSwaggerUI();
			}
			else
			{
				app.UseHttpsRedirection();
			}

			app.UseRateLimiter();
			app.UseAuthentication();
			app.UseAuthorization();
			app.MapControllers();

			await app.RunAsync();
		}
	}
}
