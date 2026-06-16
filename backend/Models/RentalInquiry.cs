namespace StandUpFitness.Models;

public class RentalInquiry
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Phone { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "new"; // new, contacted, approved, rejected
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
