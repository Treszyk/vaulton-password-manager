using FluentAssertions;
using Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Tests.Integration
{
	public class DbConnectivityTests(WebApplicationFactory<Api.Program> factory)
		: IClassFixture<WebApplicationFactory<Api.Program>>
	{
		private readonly WebApplicationFactory<Api.Program> _factory = factory;

		[Fact]
		public void Can_resolve_DbContext_and_connect()
		{
			// Prefer env and fall back to a LOCAL TEST-ONLY connection string if needed
			var envCs = Environment.GetEnvironmentVariable("ConnectionStrings__Default");
			var cs = !string.IsNullOrWhiteSpace(envCs)
				? envCs.TrimEnd(';')
				: "Server=localhost,1433;Database=VaultonTest;User Id=SA;Password=VaultonTest!Passw0rd;TrustServerCertificate=True";

			if (!cs.Contains("Connect Timeout=", StringComparison.OrdinalIgnoreCase))
				cs += ";Connect Timeout=3;";

			var appFactory = _factory.WithWebHostBuilder(b =>
			{
				b.UseSetting("environment", "Development");
				b.ConfigureAppConfiguration((_, cfg) =>
				{
					cfg.AddInMemoryCollection(new Dictionary<string, string?>
					{
						["ConnectionStrings:Default"] = cs
					});
				});
			});

			using var scope = appFactory.Services.CreateScope();
			var db = scope.ServiceProvider.GetRequiredService<VaultonDbContext>();
			db.Database.CanConnect().Should().BeTrue("the API should be able to reach SQL Server");
		}
	}
}
