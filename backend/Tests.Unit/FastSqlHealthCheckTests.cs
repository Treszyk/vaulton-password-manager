using Api.Health;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Tests.Unit;

public class FastSqlHealthCheckTests
{
	[Fact]
	public async Task CheckHealthAsync_WithMissingConnectionString_ShouldReturnUnhealthy()
	{
		var inMemorySettings = new Dictionary<string, string?>();
		IConfiguration config = new ConfigurationBuilder()
			.AddInMemoryCollection(inMemorySettings)
			.Build();

		var healthCheck = new FastSqlHealthCheck(config);
		var context = new HealthCheckContext();

		var result = await healthCheck.CheckHealthAsync(context);

		Assert.Equal(HealthStatus.Unhealthy, result.Status);
		Assert.Equal("Missing connection string.", result.Description);
	}

	[Fact]
	public async Task CheckHealthAsync_WithUnreachableConnectionString_ShouldReturnUnhealthy()
	{
		var inMemorySettings = new Dictionary<string, string?>
		{
			{"ConnectionStrings:Default", "Host=127.0.0.1;Port=54321;Database=nonexistent;Username=invalid;Password=invalid"}
		};
		IConfiguration config = new ConfigurationBuilder()
			.AddInMemoryCollection(inMemorySettings)
			.Build();

		var healthCheck = new FastSqlHealthCheck(config);
		var context = new HealthCheckContext();

		var result = await healthCheck.CheckHealthAsync(context);

		Assert.Equal(HealthStatus.Unhealthy, result.Status);
		Assert.Equal("DB unreachable", result.Description);
	}
}
