namespace StandUpFitness.Models;

public class Attendance
{
    public int Id { get; set; }
    public int ClientId { get; set; }
    public int? GroupId { get; set; }
    public DateTime AttendanceDate { get; set; }
    public bool IsPresent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Client Client { get; set; } = null!;
    public TrainingGroup? Group { get; set; }
}
