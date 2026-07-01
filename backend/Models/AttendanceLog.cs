namespace StandUpFitness.Models;

public class AttendanceLog
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public string CheckInMethod { get; set; } = "manual"; // manual, rfid, qr, barcode

    // QR access-decision audit (README → QR Access Control).
    public string Decision { get; set; } = "granted"; // granted | denied | exit
    public string? DenyReason { get; set; }
    public int? GroupId { get; set; }
    public int? ScannedById { get; set; } // User.Id of the Arka operator
    public User? ScannedBy { get; set; }

    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Client Client { get; set; } = null!;
}
