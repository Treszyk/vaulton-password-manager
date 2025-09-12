using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Api
{
	public class Program
	{
		public static void Main(string[] args)
		{
			var builder = WebApplication.CreateBuilder(args);

			var conn =
				builder.Configuration.GetConnectionString("Default")
				?? Environment.GetEnvironmentVariable("ConnectionStrings__Default")
				?? throw new InvalidOperationException("Connection string not configured. Set ConnectionStrings:Default or ConnectionStrings__Default.");

			builder.Services.AddDbContext<VaultonDbContext>(opts => opts.UseSqlServer(conn));

			builder.Services.AddControllers();
			builder.Services.AddEndpointsApiExplorer();
			builder.Services.AddSwaggerGen();

			var app = builder.Build();

			if (app.Environment.IsDevelopment())
			{
				app.UseSwagger();
				app.UseSwaggerUI();
			}
			else
			{
				app.UseHttpsRedirection();
			}


			app.UseAuthorization();
			app.MapControllers();

			app.Run();
		}
	}
}
