using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace Api.Middleware
{
    public class SecurityHeadersMiddleware(RequestDelegate next)
    {
        private readonly RequestDelegate _next = next;

        public async Task InvokeAsync(HttpContext context)
        {
            var csp = "default-src 'none'; " +
                      "base-uri 'self'; " +
                      "form-action 'self'; " +
                      "frame-ancestors 'none'; " +
                      "script-src 'self' 'wasm-unsafe-eval'; " +
                      "connect-src 'self'; " +
                      "img-src 'self'; " +
                      "style-src 'self'; " +
                      "font-src 'self'; " +
                      "worker-src 'self' blob:; " +
                      "manifest-src 'self'; " +
                      "upgrade-insecure-requests; " +
                      "block-all-mixed-content; " +
                      "require-trusted-types-for 'script'; " +
                      "trusted-types angular vaulton-worker-policy;";

            context.Response.Headers.Append("Content-Security-Policy", csp);

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
