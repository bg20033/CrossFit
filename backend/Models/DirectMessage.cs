namespace StandUpFitness.Models;

public class DirectMessage
{
    public int Id { get; set; }
    public int SenderUserId { get; set; }
    public int ReceiverUserId { get; set; }
    public string Body { get; set; } = null!;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }

    public User Sender { get; set; } = null!;
    public User Receiver { get; set; } = null!;
}
