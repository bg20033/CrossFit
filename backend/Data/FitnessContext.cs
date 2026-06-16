using Microsoft.EntityFrameworkCore;
using StandUpFitness.Models;

namespace StandUpFitness.Data;

public class FitnessContext : DbContext
{
    public FitnessContext(DbContextOptions<FitnessContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Trainer> Trainers { get; set; } = null!;
    public DbSet<Client> Clients { get; set; } = null!;
    public DbSet<GymOwner> GymOwners { get; set; } = null!;
    public DbSet<Staff> Staff { get; set; } = null!;
    public DbSet<TrainingGroup> TrainingGroups { get; set; } = null!;
    public DbSet<PersonalSession> PersonalSessions { get; set; } = null!;
    public DbSet<Goal> Goals { get; set; } = null!;
    public DbSet<DietPlan> DietPlans { get; set; } = null!;
    public DbSet<WorkoutPlan> WorkoutPlans { get; set; } = null!;
    public DbSet<Attendance> Attendance { get; set; } = null!;

    // Finance & Operations
    public DbSet<FinanceCategory> FinanceCategories { get; set; } = null!;
    public DbSet<Finance> Finances { get; set; } = null!;
    public DbSet<CashRegister> CashRegisters { get; set; } = null!;
    public DbSet<Invoice> Invoices { get; set; } = null!;
    public DbSet<InvoiceItem> InvoiceItems { get; set; } = null!;
    public DbSet<Expense> Expenses { get; set; } = null!;
    public DbSet<Salary> Salaries { get; set; } = null!;
    public DbSet<AttendanceLog> AttendanceLogs { get; set; } = null!;
    public DbSet<MembershipPlan> MembershipPlans { get; set; } = null!;
    public DbSet<ProgressLog> ProgressLogs { get; set; } = null!;
    public DbSet<RentalInquiry> RentalInquiries { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ProgressLog>()
            .HasOne(p => p.Client)
            .WithMany()
            .HasForeignKey(p => p.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // User configuration
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Trainer configuration
        modelBuilder.Entity<Trainer>()
            .HasOne(t => t.User)
            .WithMany(u => u.TrainerProfile)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Trainer>()
            .HasMany(t => t.Groups)
            .WithOne(g => g.Trainer)
            .OnDelete(DeleteBehavior.Cascade);

        // Client configuration
        modelBuilder.Entity<Client>()
            .HasOne(c => c.User)
            .WithMany(u => u.ClientProfile)
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Client>()
            .HasOne(c => c.Trainer)
            .WithMany()
            .HasForeignKey(c => c.TrainerId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Client>()
            .HasMany(c => c.Groups)
            .WithMany(g => g.Clients)
            .UsingEntity("ClientTrainingGroups");

        // GymOwner configuration
        modelBuilder.Entity<GymOwner>()
            .HasOne(g => g.User)
            .WithMany(u => u.GymOwnerProfile)
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Staff configuration
        modelBuilder.Entity<Staff>()
            .HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Staff>()
            .HasOne(s => s.GymOwner)
            .WithMany(g => g.Staff)
            .HasForeignKey(s => s.GymOwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // TrainingGroup configuration
        modelBuilder.Entity<TrainingGroup>()
            .HasOne(g => g.GymOwner)
            .WithMany(o => o.Groups)
            .HasForeignKey(g => g.GymOwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        // PersonalSession configuration
        modelBuilder.Entity<PersonalSession>()
            .HasOne(ps => ps.Trainer)
            .WithMany(t => t.PersonalSessions)
            .HasForeignKey(ps => ps.TrainerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PersonalSession>()
            .HasOne(ps => ps.Client)
            .WithMany(c => c.PersonalSessions)
            .HasForeignKey(ps => ps.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Goal configuration
        modelBuilder.Entity<Goal>()
            .HasOne(g => g.Client)
            .WithMany(c => c.Goals)
            .HasForeignKey(g => g.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // DietPlan configuration
        modelBuilder.Entity<DietPlan>()
            .HasOne(dp => dp.Trainer)
            .WithMany(t => t.DietPlans)
            .HasForeignKey(dp => dp.TrainerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DietPlan>()
            .HasOne(dp => dp.Client)
            .WithMany(c => c.DietPlans)
            .HasForeignKey(dp => dp.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // WorkoutPlan configuration
        modelBuilder.Entity<WorkoutPlan>()
            .HasOne(wp => wp.Trainer)
            .WithMany(t => t.WorkoutPlans)
            .HasForeignKey(wp => wp.TrainerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<WorkoutPlan>()
            .HasOne(wp => wp.Client)
            .WithMany(c => c.WorkoutPlans)
            .HasForeignKey(wp => wp.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Attendance configuration
        modelBuilder.Entity<Attendance>()
            .HasOne(a => a.Client)
            .WithMany(c => c.Attendance)
            .HasForeignKey(a => a.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Attendance>()
            .HasOne(a => a.Group)
            .WithMany(g => g.Attendance)
            .HasForeignKey(a => a.GroupId)
            .OnDelete(DeleteBehavior.SetNull);

        // FinanceCategory configuration
        modelBuilder.Entity<FinanceCategory>()
            .HasIndex(fc => new { fc.Name, fc.Type })
            .IsUnique();

        // Finance configuration
        modelBuilder.Entity<Finance>()
            .HasOne(f => f.Category)
            .WithMany(fc => fc.Finances)
            .HasForeignKey(f => f.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Finance>()
            .HasOne(f => f.User)
            .WithMany()
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Finance>()
            .HasOne(f => f.CashRegister)
            .WithMany(cr => cr.Transactions)
            .HasForeignKey(f => f.CashRegisterId)
            .OnDelete(DeleteBehavior.SetNull);

        // CashRegister configuration
        modelBuilder.Entity<CashRegister>()
            .HasOne(cr => cr.Staff)
            .WithMany()
            .HasForeignKey(cr => cr.StaffId)
            .OnDelete(DeleteBehavior.Restrict);

        // Invoice configuration
        modelBuilder.Entity<Invoice>()
            .HasIndex(i => i.InvoiceNumber)
            .IsUnique();

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Client)
            .WithMany()
            .HasForeignKey(i => i.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Staff)
            .WithMany()
            .HasForeignKey(i => i.StaffId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.CashRegister)
            .WithMany(cr => cr.Invoices)
            .HasForeignKey(i => i.CashRegisterId)
            .OnDelete(DeleteBehavior.SetNull);

        // InvoiceItem configuration
        modelBuilder.Entity<InvoiceItem>()
            .HasOne(ii => ii.Invoice)
            .WithMany(i => i.Items)
            .HasForeignKey(ii => ii.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Expense configuration
        modelBuilder.Entity<Expense>()
            .HasOne(e => e.Category)
            .WithMany()
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.ApprovedBy)
            .WithMany()
            .HasForeignKey(e => e.ApprovedById)
            .OnDelete(DeleteBehavior.SetNull);

        // Salary configuration
        modelBuilder.Entity<Salary>()
            .HasOne(s => s.Staff)
            .WithMany()
            .HasForeignKey(s => s.StaffId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Salary>()
            .HasIndex(s => new { s.StaffId, s.Year, s.Month })
            .IsUnique();

        // AttendanceLog configuration
        modelBuilder.Entity<AttendanceLog>()
            .HasOne(al => al.Client)
            .WithMany()
            .HasForeignKey(al => al.ClientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
