using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Net.Mail;
using System.Text;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Services;

public interface INotificationService
{
    Task SendToClientAsync(int clientId, string title, string message, string type = "info");
    Task SendToTrainerAsync(int trainerId, string title, string message, string type = "info");
    Task SendOnPlanAssignmentAsync(int clientId, string planType, string planName, string trainerName);
    Task SendAttendanceReminderAsync(int clientId, string groupName, DateTime scheduleTime);
}

public class NotificationService : INotificationService
{
    private readonly FitnessContext _context;
    private readonly IEmailService _emailService;
    private readonly ISmsService _smsService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(FitnessContext context, IEmailService emailService, ISmsService smsService, ILogger<NotificationService> logger)
    {
        _context = context;
        _emailService = emailService;
        _smsService = smsService;
        _logger = logger;
    }

    public async Task SendToClientAsync(int clientId, string title, string message, string type = "info")
    {
        try
        {
            var client = await _context.Clients
                .Include(c => c.User)
                .FirstOrDefaultAsync(c => c.Id == clientId);

            if (client == null) return;

            _context.UserNotifications.Add(new UserNotification
            {
                UserId = client.UserId,
                Title = title,
                Message = message,
                Type = type
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Notification sent to client {clientId}: {title} - {message}");

            // Send email
            await _emailService.SendAsync(
                client.User.Email,
                title,
                $"<p>{message}</p>"
            );

            // Send SMS (skipped automatically if no phone on file / provider not configured)
            await _smsService.SendAsync(client.User.Phone, $"{title}: {message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending notification to client {clientId}");
        }
    }

    public async Task SendToTrainerAsync(int trainerId, string title, string message, string type = "info")
    {
        try
        {
            var trainer = await _context.Trainers
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.Id == trainerId);

            if (trainer == null) return;

            _context.UserNotifications.Add(new UserNotification
            {
                UserId = trainer.UserId,
                Title = title,
                Message = message,
                Type = type
            });
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Notification sent to trainer {trainerId}: {title}");

            await _emailService.SendAsync(
                trainer.User.Email,
                title,
                $"<p>{message}</p>"
            );

            await _smsService.SendAsync(trainer.User.Phone, $"{title}: {message}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending notification to trainer {trainerId}");
        }
    }

    public async Task SendOnPlanAssignmentAsync(int clientId, string planType, string planName, string trainerName)
    {
        var title = $"New {planType} Plan Assigned";
        var message = $"{trainerName} assigned you a new {planType.ToLower()} plan: \"{planName}\"";
        await SendToClientAsync(clientId, title, message, "info");
    }

    public async Task SendAttendanceReminderAsync(int clientId, string groupName, DateTime scheduleTime)
    {
        var title = "Attendance Reminder";
        var message = $"Reminder: Your group \"{groupName}\" starts at {scheduleTime:HH:mm}";
        await SendToClientAsync(clientId, title, message, "warning");
    }
}

public interface IEmailService
{
    Task SendAsync(string to, string subject, string htmlContent);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string htmlContent)
    {
        try
        {
            var provider = _configuration["Email:Provider"] ?? "log";
            if (!string.Equals(provider, "smtp", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Email log-only to {To}: {Subject}", to, subject);
                return;
            }

            var host = _configuration["Email:Smtp:Host"];
            if (string.IsNullOrWhiteSpace(host))
            {
                _logger.LogWarning("Email provider is smtp but Email:Smtp:Host is missing. Email skipped for {To}", to);
                return;
            }

            var port = int.TryParse(_configuration["Email:Smtp:Port"], out var configuredPort) ? configuredPort : 587;
            var from = _configuration["Email:From"] ?? "noreply@standupcrossfit.local";
            using var message = new MailMessage(from, to, subject, htmlContent) { IsBodyHtml = true };
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = bool.TryParse(_configuration["Email:Smtp:EnableSsl"], out var ssl) ? ssl : true
            };

            var username = _configuration["Email:Smtp:Username"];
            var password = _configuration["Email:Smtp:Password"];
            if (!string.IsNullOrWhiteSpace(username))
                client.Credentials = new NetworkCredential(username, password);

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending email to {to}");
        }
    }
}

public interface ISmsService
{
    Task SendAsync(string? to, string message);
}

/// <summary>
/// SMS channel. Defaults to log-only; set Sms:Provider = "twilio" with credentials
/// to send via Twilio's REST API. Skips silently when no phone number is on file.
/// </summary>
public class SmsService : ISmsService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SmsService> _logger;

    public SmsService(IConfiguration configuration, IHttpClientFactory httpClientFactory, ILogger<SmsService> logger)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendAsync(string? to, string message)
    {
        if (string.IsNullOrWhiteSpace(to))
        {
            _logger.LogInformation("SMS skipped: no phone number on file.");
            return;
        }

        try
        {
            var provider = _configuration["Sms:Provider"] ?? "log";
            if (!string.Equals(provider, "twilio", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("SMS log-only to {To}: {Message}", to, message);
                return;
            }

            var sid = _configuration["Sms:Twilio:AccountSid"];
            var token = _configuration["Sms:Twilio:AuthToken"];
            var from = _configuration["Sms:Twilio:From"];
            if (string.IsNullOrWhiteSpace(sid) || string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(from))
            {
                _logger.LogWarning("SMS provider is twilio but credentials are missing. SMS skipped for {To}", to);
                return;
            }

            var client = _httpClientFactory.CreateClient();
            var url = $"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json";
            var auth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{sid}:{token}"));
            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", auth);
            request.Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("To", to),
                new KeyValuePair<string, string>("From", from),
                new KeyValuePair<string, string>("Body", message),
            });

            var response = await client.SendAsync(request);
            if (response.IsSuccessStatusCode)
                _logger.LogInformation("SMS sent to {To}", to);
            else
                _logger.LogWarning("SMS to {To} failed: {Status}", to, response.StatusCode);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending SMS to {to}");
        }
    }
}
