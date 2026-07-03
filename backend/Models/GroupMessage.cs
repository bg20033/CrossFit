namespace StandUpFitness.Models;

// A shared chat thread per TrainingGroup — distinct from DirectMessage (1:1).
// Any member (trainer, its clients, or admin/staff with schedule.write) can post;
// everyone sees the same thread, unlike the old broadcast that fanned a message
// out as individual DirectMessages.
public class GroupMessage
{
    public int Id { get; set; }
    public int TrainingGroupId { get; set; }
    public int SenderUserId { get; set; }
    public string Body { get; set; } = null!;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public TrainingGroup TrainingGroup { get; set; } = null!;
    public User Sender { get; set; } = null!;
}

// Per-user "last read" pointer for a group thread (one row per user/group,
// upserted) — cheaper than a read-receipt row per message per member.
public class GroupMessageRead
{
    public int Id { get; set; }
    public int TrainingGroupId { get; set; }
    public int UserId { get; set; }
    public DateTime LastReadAt { get; set; } = DateTime.UtcNow;

    public TrainingGroup TrainingGroup { get; set; } = null!;
    public User User { get; set; } = null!;
}
