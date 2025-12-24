using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Api.Health;

public sealed class FastSqlHealthCheck(IConfiguration config) : IHealthCheck
{
	private readonly IConfiguration _config = config;

	public async Task<HealthCheckResult> CheckHealthAsync(
		HealthCheckContext context,
		CancellationToken cancellationToken = default)
	{
		var cs = _config.GetConnectionString("Default")
				 ?? Environment.GetEnvironmentVariable("ConnectionStrings__Default");

		if (string.IsNullOrWhiteSpace(cs))
			return HealthCheckResult.Unhealthy("Missing connection string.");

		var b = new SqlConnectionStringBuilder(cs)
		{
			ConnectTimeout = 1
		};

		await using var conn = new SqlConnection(b.ConnectionString);
		try
		{
			await conn.OpenAsync(cancellationToken);

			await using var cmd = conn.CreateCommand();
			cmd.CommandText = "SELECT 1;";
			cmd.CommandType = CommandType.Text;
			cmd.CommandTimeout = 1;

			_ = await cmd.ExecuteScalarAsync(cancellationToken);
			return HealthCheckResult.Healthy("DB OK");
		}
		catch (Exception ex)
		{
			return HealthCheckResult.Unhealthy("DB unreachable", ex);
		}
	}
}
