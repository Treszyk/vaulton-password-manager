using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Api.Startup;

public static class MigrationExtensions
{
	public static async Task ApplyMigrationsAsync(this IHost app, int maxRetries = 6)
	{
		using var scope = app.Services.CreateScope();
		var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbMigrator");
		var db = scope.ServiceProvider.GetRequiredService<VaultonDbContext>();

		var delay = TimeSpan.FromSeconds(5);
		for (var attempt = 1; attempt <= maxRetries; attempt++)
		{
			try
			{
				logger.LogInformation("Applying EF Core migrations (attempt {Attempt})…", attempt);
				await db.Database.MigrateAsync();
				logger.LogInformation("EF Core migrations applied.");
				break;
			}
			catch (Exception ex) when (attempt < maxRetries)
			{
				logger.LogWarning(ex, "Migration attempt {Attempt} failed. Retrying in {Delay}…", attempt, delay);
				await Task.Delay(delay);
			}
		}
	}
}
