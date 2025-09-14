using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Tests.Integration
{
	public class ApiSmokeTests(WebApplicationFactory<Api.Program> factory) : IClassFixture<WebApplicationFactory<Api.Program>>
	{
		private readonly WebApplicationFactory<Api.Program> _factory = factory;

		[Fact]
		public async Task Swagger_Json_is_available_in_Development()
		{
			var client = _factory.CreateClient();
			var resp = await client.GetAsync("/swagger/v1/swagger.json");

			resp.StatusCode.Should().Be(HttpStatusCode.OK);
			var body = await resp.Content.ReadAsStringAsync();
			body.Should().Contain("\"openapi\"");
		}
	}
}
