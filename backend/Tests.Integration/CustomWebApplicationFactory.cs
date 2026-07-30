using Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;

namespace Tests.Integration;

public class CustomWebApplicationFactory : WebApplicationFactory<Api.ProgramMarker>
{
	private SqliteConnection? _connection;
	private const string Base6432BytesSecret = "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";

	protected override void ConfigureWebHost(IWebHostBuilder builder)
	{
		builder.UseEnvironment("Development");

		builder.UseSetting("ConnectionStrings:Default", "DataSource=:memory:");
		builder.UseSetting("Jwt:Secret", "ThisIsATestSecretKeyForVaultonUnitIntegrationTests12345!");
		builder.UseSetting("Jwt:Issuer", "VaultonTestIssuer");
		builder.UseSetting("Jwt:Audience", "VaultonTestAudience");
		builder.UseSetting("Auth:VerifierPepper", Base6432BytesSecret);
		builder.UseSetting("Auth:FakeSaltSecret", Base6432BytesSecret);
		builder.UseSetting("Auth:VerifierPbkdf2Iterations", "100");

		builder.ConfigureServices(services =>
		{
			var descriptors = services.Where(d =>
				d.ServiceType == typeof(DbContextOptions<VaultonDbContext>) ||
				d.ServiceType == typeof(DbContextOptions) ||
				d.ServiceType == typeof(VaultonDbContext)
			).ToList();

			foreach (var descriptor in descriptors)
			{
				services.Remove(descriptor);
			}

			_connection = new SqliteConnection("DataSource=:memory:");
			_connection.Open();

			services.AddDbContext<VaultonDbContext>(options =>
			{
				options.UseSqlite(_connection);
			});

			var rateLimiterDescriptors = services.Where(d => d.ServiceType == typeof(IConfigureOptions<RateLimiterOptions>)).ToList();
			foreach (var descriptor in rateLimiterDescriptors)
			{
				services.Remove(descriptor);
			}

			services.Configure<RateLimiterOptions>(options =>
			{
				options.AddPolicy("AuthPolicy", _ => RateLimitPartition.GetNoLimiter("TestNoLimiter"));
			});

			services.Configure<MvcOptions>(options =>
			{
				var jsonFormatter = options.OutputFormatters.OfType<SystemTextJsonOutputFormatter>().FirstOrDefault();
				if (jsonFormatter != null)
				{
					options.OutputFormatters.Remove(jsonFormatter);
				}

				var jsonOptions = services.BuildServiceProvider().GetService<IOptions<Microsoft.AspNetCore.Mvc.JsonOptions>>()?.Value?.JsonSerializerOptions
				                  ?? new JsonSerializerOptions(JsonSerializerDefaults.Web);

				options.OutputFormatters.Add(new StreamSystemTextJsonOutputFormatter(jsonOptions));
			});
		});
	}

	protected override void Dispose(bool disposing)
	{
		base.Dispose(disposing);
		if (disposing)
		{
			_connection?.Close();
			_connection?.Dispose();
		}
	}

	private class StreamSystemTextJsonOutputFormatter : TextOutputFormatter
	{
		private readonly JsonSerializerOptions _options;

		public StreamSystemTextJsonOutputFormatter(JsonSerializerOptions options)
		{
			_options = options;
			SupportedEncodings.Add(Encoding.UTF8);
			SupportedMediaTypes.Add("application/json");
			SupportedMediaTypes.Add("text/json");
			SupportedMediaTypes.Add("application/*+json");
		}

		public override async Task WriteResponseBodyAsync(OutputFormatterWriteContext context, Encoding selectedEncoding)
		{
			var response = context.HttpContext.Response;
			if (context.Object != null)
			{
				await JsonSerializer.SerializeAsync(
					response.Body,
					context.Object,
					context.ObjectType ?? context.Object.GetType(),
					_options
				);
			}
		}
	}
}
