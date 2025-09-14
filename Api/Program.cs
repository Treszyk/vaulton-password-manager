using Api.Startup;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var conn =
	builder.Configuration.GetConnectionString("Default")
	?? Environment.GetEnvironmentVariable("ConnectionStrings__Default")
	?? throw new InvalidOperationException("Connection string not configured. Set ConnectionStrings:Default or ConnectionStrings__Default.");

builder.Services.AddDbContext<VaultonDbContext>(o =>
	o.UseSqlServer(conn, sql => sql.EnableRetryOnFailure()));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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



app.UseAuthorization();
app.MapControllers();

await app.RunAsync();
