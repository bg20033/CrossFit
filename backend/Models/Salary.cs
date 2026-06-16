namespace StandUpFitness.Models;

public class Salary
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal BaseSalary { get; set; }
    public decimal HoursWorked { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal OvertimeHours { get; set; }
    public decimal OvertimeMultiplier { get; set; } = 1.5m;
    public decimal Bonus { get; set; }
    public decimal Deductions { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "pending"; // pending, paid, cancelled
    public DateTime? PaidDate { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Staff Staff { get; set; } = null!;
}
