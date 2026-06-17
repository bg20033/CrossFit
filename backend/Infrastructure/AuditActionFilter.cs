using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using System.Security.Claims;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Infrastructure;

/// <summary>
/// Records every mutating request (POST/PUT/DELETE/PATCH) to the audit log.
/// Failures here never break the request.
/// </summary>
public class AuditActionFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var method = context.HttpContext.Request.Method;
        var executed = await next();

        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
            return;

        try
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<FitnessContext>();
            int? userId = int.TryParse(context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : null;
            var role = context.HttpContext.User.FindFirst("role")?.Value;
            var status = (executed.Result as IStatusCodeActionResult)?.StatusCode ?? context.HttpContext.Response.StatusCode;

            db.AuditLogs.Add(new AuditLog
            {
                UserId = userId,
                UserRole = role,
                Method = method,
                Path = context.HttpContext.Request.Path.Value ?? "",
                StatusCode = status,
                Timestamp = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        catch
        {
            // auditing must never break the request
        }
    }
}
