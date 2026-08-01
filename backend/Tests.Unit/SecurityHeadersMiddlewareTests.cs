using Api.Middleware;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Moq;

namespace Tests.Unit;

public class SecurityHeadersMiddlewareTests
{
	[Fact]
	public async Task InvokeAsync_InDevelopmentEnvironment_ShouldNotAppendSecurityHeaders()
	{
		var context = new DefaultHttpContext();
		var envMock = new Mock<IWebHostEnvironment>();
		envMock.Setup(e => e.EnvironmentName).Returns("Development");

		var nextCalled = false;
		RequestDelegate next = (ctx) =>
		{
			nextCalled = true;
			return Task.CompletedTask;
		};

		var middleware = new SecurityHeadersMiddleware(next);
		await middleware.InvokeAsync(context, envMock.Object);

		Assert.True(nextCalled);
		Assert.False(context.Response.Headers.ContainsKey("X-Frame-Options"));
	}

	[Fact]
	public async Task InvokeAsync_InProductionEnvironment_ShouldAppendSecurityHeaders()
	{
		var context = new DefaultHttpContext();
		var envMock = new Mock<IWebHostEnvironment>();
		envMock.Setup(e => e.EnvironmentName).Returns("Production");

		var nextCalled = false;
		RequestDelegate next = (ctx) =>
		{
			nextCalled = true;
			return Task.CompletedTask;
		};

		var middleware = new SecurityHeadersMiddleware(next);
		await middleware.InvokeAsync(context, envMock.Object);

		Assert.True(nextCalled);
		Assert.True(context.Response.Headers.ContainsKey("X-Frame-Options"));
		Assert.Equal("DENY", context.Response.Headers["X-Frame-Options"].ToString());
		Assert.True(context.Response.Headers.ContainsKey("X-Content-Type-Options"));
		Assert.Equal("nosniff", context.Response.Headers["X-Content-Type-Options"].ToString());
		Assert.True(context.Response.Headers.ContainsKey("Referrer-Policy"));
		Assert.True(context.Response.Headers.ContainsKey("Permissions-Policy"));
		Assert.True(context.Response.Headers.ContainsKey("Strict-Transport-Security"));
	}
}
