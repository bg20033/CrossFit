namespace StandUpFitness.Models;

public class GroupWaitlistEntry
{
    public int Id { get; set; }
    public int TrainingGroupId { get; set; }
    public int ClientId { get; set; }
    public string Status { get; set; } = "waiting"; // waiting | promoted | cancelled
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PromotedAt { get; set; }

    public TrainingGroup TrainingGroup { get; set; } = null!;
    public Client Client { get; set; } = null!;
}
