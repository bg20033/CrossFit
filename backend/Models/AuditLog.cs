namespace StandUpFitness.Models;

public class AuditLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string? UserRole { get; set; }
    public string Method { get; set; } = null!;
    public string Path { get; set; } = null!;
    public int StatusCode { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
