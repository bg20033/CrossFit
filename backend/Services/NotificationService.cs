using Microsoft.EntityFrameworkCore;
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
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(FitnessContext context, IEmailService emailService, ILogger<NotificationService> logger)
    {
        _context = context;
        _emailService = emailService;
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

            // Log notification (for in-app display)
            _logger.LogInformation($"Notification sent to client {clientId}: {title} - {message}");

            // Send email
            await _emailService.SendAsync(
                client.User.Email,
                title,
                $"<p>{message}</p>"
            );
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

            _logger.LogInformation($"Notification sent to trainer {trainerId}: {title}");

            await _emailService.SendAsync(
                trainer.User.Email,
                title,
                $"<p>{message}</p>"
            );
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
            // TODO: Implement email sending (SMTP, SendGrid, AWS SES, etc)
            // For now, just log
            _logger.LogInformation($"Email would be sent to {to}: {subject}");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Error sending email to {to}");
        }
    }
}
