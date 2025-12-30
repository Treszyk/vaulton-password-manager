using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using System.Threading.Tasks;

namespace Api.Middleware
{
    public class SecurityHeadersMiddleware(RequestDelegate next)
    {
        private readonly RequestDelegate _next = next;

        public async Task InvokeAsync(HttpContext context, IWebHostEnvironment env)
        {
            if (env.IsDevelopment() && context.Request.Path.StartsWithSegments("/swagger"))
            {
                await _next(context);
                return;
            }

            // CSP controlled by Caddy/Edge Proxy
            
            context.Response.Headers.Append("X-Frame-Options", "DENY");

            context.Response.Headers.Append("X-Content-Type-Options", "nosniff");

            context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

            context.Response.Headers.Append("Permissions-Policy", 
                "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()");

            // force HTTPS
            context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

            await _next(context);
        }
    }
}
