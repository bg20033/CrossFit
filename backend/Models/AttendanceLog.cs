namespace StandUpFitness.Models;

public class AttendanceLog
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string CheckInMethod { get; set; } = "manual"; // manual, rfid, qr, barcode
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Client Client { get; set; } = null!;
}
