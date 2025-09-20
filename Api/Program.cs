using Api.Health;
using Api.Startup;
using Application.Services.Auth;
using Infrastructure.Data;
using Infrastructure.Security;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Text.Json;

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
			builder.Services.AddSwaggerGen();
			builder.Services.AddSingleton<ITokenIssuer, JwtTokenIssuer>();
			builder.Services.AddCors(o =>
			{
				o.AddDefaultPolicy(p => p
					.AllowAnyOrigin()
					.AllowAnyHeader()
					.AllowAnyMethod());
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

			app.UseCors();

			app.UseAuthorization();
			app.MapControllers();

			await app.RunAsync();
		}
	}
}