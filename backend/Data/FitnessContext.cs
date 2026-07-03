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
    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<StockMovement> StockMovements { get; set; } = null!;
    public DbSet<DiscountCategory> DiscountCategories { get; set; } = null!;
    public DbSet<Expense> Expenses { get; set; } = null!;
    public DbSet<Salary> Salaries { get; set; } = null!;
    public DbSet<AttendanceLog> AttendanceLogs { get; set; } = null!;
    public DbSet<MembershipPlan> MembershipPlans { get; set; } = null!;
    public DbSet<ProgressLog> ProgressLogs { get; set; } = null!;
    public DbSet<RentalInquiry> RentalInquiries { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

    // Nutrition, QR access & rental (added with the 6-role expansion)
    public DbSet<NutritionProfile> NutritionProfiles { get; set; } = null!;
    public DbSet<TrainerTenant> TrainerTenants { get; set; } = null!;
    public DbSet<TenantClient> TenantClients { get; set; } = null!;
    public DbSet<RentalScheduleSlot> RentalScheduleSlots { get; set; } = null!;
    public DbSet<RentalSession> RentalSessions { get; set; } = null!;
    public DbSet<RentalInvoice> RentalInvoices { get; set; } = null!;
    public DbSet<DynamicRole> DynamicRoles { get; set; } = null!;
    public DbSet<Permission> Permissions { get; set; } = null!;
    public DbSet<RolePermission> RolePermissions { get; set; } = null!;
    public DbSet<UserRoleAssignment> UserRoleAssignments { get; set; } = null!;
    public DbSet<UserNotification> UserNotifications { get; set; } = null!;
    public DbSet<PaymentTransaction> PaymentTransactions { get; set; } = null!;
    public DbSet<TrainerWeeklyReport> TrainerWeeklyReports { get; set; } = null!;
    public DbSet<GroupWaitlistEntry> GroupWaitlistEntries { get; set; } = null!;
    public DbSet<DirectMessage> DirectMessages { get; set; } = null!;
    public DbSet<GroupMessage> GroupMessages { get; set; } = null!;
    public DbSet<GroupMessageRead> GroupMessageReads { get; set; } = null!;
    public DbSet<GymNotice> GymNotices { get; set; } = null!;
    public DbSet<GymSettings> GymSettings { get; set; } = null!;
    public DbSet<ProgressPhoto> ProgressPhotos { get; set; } = null!;
    public DbSet<PersonalRecord> PersonalRecords { get; set; } = null!;
    public DbSet<Recipe> Recipes { get; set; } = null!;
    public DbSet<ShoppingItem> ShoppingItems { get; set; } = null!;
    public DbSet<FoodLogEntry> FoodLogEntries { get; set; } = null!;
    public DbSet<WaterLog> WaterLogs { get; set; } = null!;
    public DbSet<ClassSession> ClassSessions { get; set; } = null!;
    public DbSet<GroupScheduleSlot> GroupScheduleSlots { get; set; } = null!;
    public DbSet<GroupSession> GroupSessions { get; set; } = null!;
    public DbSet<TrainerCommission> TrainerCommissions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasIndex(r => r.Token).IsUnique();
            e.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            e.Property(r => r.Token).HasMaxLength(256);
        });

        modelBuilder.Entity<ProgressLog>()
            .HasOne(p => p.Client)
            .WithMany()
            .HasForeignKey(p => p.ClientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Soft-delete global query filters (deleted rows are hidden from all queries)
        modelBuilder.Entity<Client>().HasQueryFilter(c => !c.IsDeleted);
        modelBuilder.Entity<Invoice>().HasQueryFilter(i => !i.IsDeleted);
        modelBuilder.Entity<MembershipPlan>().HasQueryFilter(p => !p.IsDeleted);
        modelBuilder.Entity<Attendance>().HasQueryFilter(a => !a.Client.IsDeleted);
        modelBuilder.Entity<AttendanceLog>().HasQueryFilter(a => !a.Client.IsDeleted);
        modelBuilder.Entity<DietPlan>().HasQueryFilter(d => !d.Client.IsDeleted);
        modelBuilder.Entity<Goal>().HasQueryFilter(g => !g.Client.IsDeleted);
        modelBuilder.Entity<PersonalSession>().HasQueryFilter(p => !p.Client.IsDeleted);
        modelBuilder.Entity<ProgressLog>().HasQueryFilter(p => !p.Client.IsDeleted);
        modelBuilder.Entity<ProgressPhoto>().HasQueryFilter(p => !p.Client.IsDeleted);
        modelBuilder.Entity<TrainerWeeklyReport>().HasQueryFilter(r => !r.Client.IsDeleted);
        modelBuilder.Entity<WorkoutPlan>().HasQueryFilter(w => !w.Client.IsDeleted);
        modelBuilder.Entity<InvoiceItem>().HasQueryFilter(i => !i.Invoice.IsDeleted);
        modelBuilder.Entity<GroupWaitlistEntry>().HasQueryFilter(w => !w.Client.IsDeleted);

        // Client -> MembershipPlan (optional link, keeps client if the plan is removed)
        modelBuilder.Entity<Client>()
            .HasOne(c => c.Plan)
            .WithMany()
            .HasForeignKey(c => c.PlanId)
            .OnDelete(DeleteBehavior.SetNull);

        // Idempotency keys
        modelBuilder.Entity<Invoice>().HasIndex(i => i.IdempotencyKey);
        modelBuilder.Entity<Finance>().HasIndex(f => f.IdempotencyKey);

        // Money & measurement precision. MySQL's decimal(65,30) default is too wide for EUR amounts.
        modelBuilder.Entity<PersonalSession>().Property(p => p.Cost).HasPrecision(18, 2);
        modelBuilder.Entity<Finance>().Property(f => f.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<Staff>().Property(s => s.Salary).HasPrecision(18, 2);
        modelBuilder.Entity<Expense>().Property(e => e.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<Salary>().Property(s => s.BaseSalary).HasPrecision(18, 2);
        modelBuilder.Entity<Salary>().Property(s => s.HourlyRate).HasPrecision(18, 2);
        modelBuilder.Entity<Salary>().Property(s => s.Bonus).HasPrecision(18, 2);
        modelBuilder.Entity<Salary>().Property(s => s.Deductions).HasPrecision(18, 2);
        modelBuilder.Entity<Salary>().Property(s => s.TotalAmount).HasPrecision(18, 2);
        modelBuilder.Entity<MembershipPlan>().Property(p => p.Price).HasPrecision(18, 2);
        modelBuilder.Entity<TrainerTenant>().Property(t => t.MonthlyRate).HasPrecision(18, 2);
        modelBuilder.Entity<CashRegister>().Property(c => c.OpeningBalance).HasPrecision(18, 2);
        modelBuilder.Entity<CashRegister>().Property(c => c.ClosingBalance).HasPrecision(18, 2);
        modelBuilder.Entity<CashRegister>().Property(c => c.TotalIncome).HasPrecision(18, 2);
        modelBuilder.Entity<CashRegister>().Property(c => c.TotalExpense).HasPrecision(18, 2);
        modelBuilder.Entity<PaymentTransaction>().Property(p => p.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<RentalInvoice>().Property(r => r.Amount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.Subtotal).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.TaxAmount).HasPrecision(18, 2);
        modelBuilder.Entity<Invoice>().Property(i => i.TotalAmount).HasPrecision(18, 2);
        modelBuilder.Entity<InvoiceItem>().Property(i => i.UnitPrice).HasPrecision(18, 2);
        modelBuilder.Entity<InvoiceItem>().Property(i => i.Total).HasPrecision(18, 2);
        modelBuilder.Entity<Product>().Property(p => p.SalePrice).HasPrecision(18, 2);
        modelBuilder.Entity<Product>().Property(p => p.CostPrice).HasPrecision(18, 2);
        modelBuilder.Entity<StockMovement>().Property(s => s.UnitCost).HasPrecision(18, 2);
        modelBuilder.Entity<Trainer>().Property(t => t.HourlyRate).HasPrecision(18, 2);
        modelBuilder.Entity<Trainer>().Property(t => t.CommissionPerClient).HasPrecision(18, 2);
        modelBuilder.Entity<Trainer>().Property(t => t.PaymentModel).HasMaxLength(20);
        modelBuilder.Entity<Trainer>().Property(t => t.TrainerType).HasMaxLength(40);
        modelBuilder.Entity<Salary>().Property(s => s.HoursWorked).HasPrecision(8, 2);
        modelBuilder.Entity<Salary>().Property(s => s.OvertimeHours).HasPrecision(8, 2);
        modelBuilder.Entity<Salary>().Property(s => s.OvertimeMultiplier).HasPrecision(5, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Weight).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Chest).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Waist).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Hips).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Arms).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Thighs).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Calves).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Shoulders).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.Back).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressLog>().Property(p => p.BodyFat).HasPrecision(8, 2);
        modelBuilder.Entity<GymSettings>().Property(s => s.RefundThreshold).HasPrecision(18, 2);
        modelBuilder.Entity<Goal>().Property(g => g.TargetValue).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressPhoto>().Property(p => p.Weight).HasPrecision(8, 2);
        modelBuilder.Entity<PersonalRecord>().Property(p => p.Value).HasPrecision(10, 2);
        modelBuilder.Entity<PersonalRecord>().Property(p => p.Reps).HasDefaultValue(1);
        modelBuilder.Entity<FoodLogEntry>().Property(f => f.Protein).HasPrecision(8, 2);
        modelBuilder.Entity<FoodLogEntry>().Property(f => f.Carbs).HasPrecision(8, 2);
        modelBuilder.Entity<FoodLogEntry>().Property(f => f.Fat).HasPrecision(8, 2);
        modelBuilder.Entity<ProgressPhoto>().HasOne(p => p.Client).WithMany().HasForeignKey(p => p.ClientId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PersonalRecord>().HasOne(p => p.User).WithMany().HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<Recipe>().HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ShoppingItem>().HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<FoodLogEntry>().HasOne(f => f.User).WithMany().HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<FoodLogEntry>().HasIndex(f => new { f.UserId, f.Date });
        modelBuilder.Entity<WaterLog>().HasOne(w => w.User).WithMany().HasForeignKey(w => w.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<WaterLog>().HasIndex(w => new { w.UserId, w.Date }).IsUnique();

        // Hot-path indexes
        modelBuilder.Entity<AttendanceLog>().HasIndex(a => new { a.ClientId, a.CheckInTime });
        modelBuilder.Entity<Invoice>().HasIndex(i => i.Status);
        modelBuilder.Entity<Finance>().HasIndex(f => new { f.Type, f.TransactionDate });

        // User configuration
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // Trainer configuration
        modelBuilder.Entity<Trainer>()
            .HasOne(t => t.User)
            .WithMany(u => u.TrainerProfiles)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Trainer>()
            .HasMany(t => t.Groups)
            .WithOne(g => g.Trainer)
            .OnDelete(DeleteBehavior.Cascade);

        // Client configuration
        modelBuilder.Entity<Client>()
            .HasOne(c => c.User)
            .WithMany(u => u.ClientProfiles)
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
            .WithMany(u => u.GymOwnerProfiles)
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

        // GroupScheduleSlot — recurring weekly sessions, deleted with their group.
        modelBuilder.Entity<GroupScheduleSlot>(e =>
        {
            e.HasOne(s => s.TrainingGroup).WithMany(g => g.ScheduleSlots)
                .HasForeignKey(s => s.TrainingGroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(s => new { s.TrainingGroupId, s.DayOfWeek, s.StartMin });
            e.Property(s => s.DayOfWeek).HasMaxLength(20);
        });

        // GroupSession — concrete dated occurrences (cancel/postpone/substitute/held).
        modelBuilder.Entity<GroupSession>(e =>
        {
            e.HasOne(s => s.TrainingGroup).WithMany().HasForeignKey(s => s.TrainingGroupId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.SubstituteTrainer).WithMany().HasForeignKey(s => s.SubstituteTrainerId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(s => new { s.TrainingGroupId, s.Date });
            e.Property(s => s.DayOfWeek).HasMaxLength(20);
            e.Property(s => s.Status).HasMaxLength(20);
        });

        // TrainerCommission — monthly trainer payment keyed on TrainerId.
        modelBuilder.Entity<TrainerCommission>(e =>
        {
            e.HasOne(c => c.Trainer).WithMany().HasForeignKey(c => c.TrainerId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.Finance).WithMany().HasForeignKey(c => c.FinanceId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(c => new { c.TrainerId, c.Year, c.Month });
            e.Property(c => c.Status).HasMaxLength(20);
            e.Property(c => c.PaymentModel).HasMaxLength(20);
            e.Property(c => c.RatePerClient).HasPrecision(18, 2);
            e.Property(c => c.ProratedAmount).HasPrecision(18, 2);
            e.Property(c => c.Bonus).HasPrecision(18, 2);
            e.Property(c => c.Deductions).HasPrecision(18, 2);
            e.Property(c => c.TotalAmount).HasPrecision(18, 2);
        });

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

        // DiscountCategory configuration
        modelBuilder.Entity<DiscountCategory>(e =>
        {
            e.HasIndex(d => d.Key).IsUnique();
            e.Property(d => d.Key).HasMaxLength(40);
            e.Property(d => d.Name).HasMaxLength(120);
            e.HasData(
                new DiscountCategory { Id = 1, Key = "standard", Name = "Standarde", DiscountPercent = 0, IsBuiltIn = true, IsActive = true },
                new DiscountCategory { Id = 2, Key = "police", Name = "Policia (zbritje)", DiscountPercent = 20, IsBuiltIn = true, IsActive = true },
                new DiscountCategory { Id = 3, Key = "free", Name = "Falas (0€)", DiscountPercent = 100, IsBuiltIn = true, IsActive = true },
                new DiscountCategory { Id = 4, Key = "shared", Name = "E ndarë (3–4)", DiscountPercent = 0, IsBuiltIn = true, IsActive = true },
                new DiscountCategory { Id = 5, Key = "session_pass", Name = "Pako seancash", DiscountPercent = 0, IsBuiltIn = true, IsActive = true }
            );
        });

        modelBuilder.Entity<InvoiceItem>()
            .HasOne(ii => ii.Product)
            .WithMany(p => p.InvoiceItems)
            .HasForeignKey(ii => ii.ProductId)
            .OnDelete(DeleteBehavior.SetNull);

        // Product / StockMovement configuration
        modelBuilder.Entity<StockMovement>()
            .HasOne(s => s.Product)
            .WithMany(p => p.StockMovements)
            .HasForeignKey(s => s.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StockMovement>()
            .HasOne(s => s.Staff)
            .WithMany()
            .HasForeignKey(s => s.StaffId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<StockMovement>()
            .HasOne(s => s.InvoiceItem)
            .WithMany(i => i.StockMovements)
            .HasForeignKey(s => s.InvoiceItemId)
            .OnDelete(DeleteBehavior.SetNull);

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

        // NutritionProfile — one per user.
        modelBuilder.Entity<NutritionProfile>(e =>
        {
            e.HasIndex(n => n.UserId).IsUnique();
            e.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // QR access token on Client (opaque; indexed for fast scan lookups).
        modelBuilder.Entity<Client>().HasIndex(c => c.QrToken);

        // QR access token on Trainer — scanning it at Arka auto-opens his group
        // sessions scheduled now (AccessController.ScanTrainerAsync).
        modelBuilder.Entity<Trainer>().HasIndex(t => t.QrToken);

        // TrainerTenant — rental trainer profile linked to a User.
        modelBuilder.Entity<TrainerTenant>(e =>
        {
            e.HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(t => t.UserId);
        });

        // TenantClient — isolated to its tenant trainer.
        modelBuilder.Entity<TenantClient>(e =>
        {
            e.HasOne(tc => tc.TrainerTenant).WithMany(t => t.Clients)
                .HasForeignKey(tc => tc.TrainerTenantId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(tc => tc.TrainerTenantId);
        });

        // RentalScheduleSlot — a qiragji's recurring weekly schedule, deleted with the tenant.
        modelBuilder.Entity<RentalScheduleSlot>(e =>
        {
            e.HasOne(s => s.TrainerTenant).WithMany(t => t.ScheduleSlots)
                .HasForeignKey(s => s.TrainerTenantId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(s => new { s.TrainerTenantId, s.DayOfWeek, s.StartMin });
            e.Property(s => s.DayOfWeek).HasMaxLength(20);
        });

        // RentalSession — concrete dated occurrences of a qiragji's schedule (cancel/postpone/held).
        modelBuilder.Entity<RentalSession>(e =>
        {
            e.HasOne(s => s.TrainerTenant).WithMany().HasForeignKey(s => s.TrainerTenantId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(s => new { s.TrainerTenantId, s.Date });
            e.Property(s => s.DayOfWeek).HasMaxLength(20);
            e.Property(s => s.Status).HasMaxLength(20);
        });

        // RentalInvoice — rental billing per tenant.
        modelBuilder.Entity<RentalInvoice>(e =>
        {
            e.HasOne(i => i.TrainerTenant).WithMany(t => t.Invoices)
                .HasForeignKey(i => i.TrainerTenantId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(i => i.TrainerTenantId);
        });

        // Dynamic RBAC — admin-defined roles and permissions beyond the enum baseline.
        modelBuilder.Entity<DynamicRole>(e =>
        {
            e.HasIndex(r => r.Key).IsUnique();
            e.Property(r => r.Key).HasMaxLength(80);
            e.Property(r => r.Name).HasMaxLength(120);
        });

        modelBuilder.Entity<Permission>(e =>
        {
            e.HasIndex(p => p.Key).IsUnique();
            e.Property(p => p.Key).HasMaxLength(120);
            e.Property(p => p.Module).HasMaxLength(80);
        });

        modelBuilder.Entity<RolePermission>(e =>
        {
            e.HasKey(rp => new { rp.DynamicRoleId, rp.PermissionId });
            e.HasOne(rp => rp.DynamicRole).WithMany(r => r.Permissions)
                .HasForeignKey(rp => rp.DynamicRoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(rp => rp.Permission).WithMany(p => p.Roles)
                .HasForeignKey(rp => rp.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserRoleAssignment>(e =>
        {
            e.HasKey(ur => new { ur.UserId, ur.DynamicRoleId });
            e.HasOne(ur => ur.User).WithMany().HasForeignKey(ur => ur.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ur => ur.DynamicRole).WithMany(r => r.Users)
                .HasForeignKey(ur => ur.DynamicRoleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserNotification>(e =>
        {
            e.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAt });
        });

        modelBuilder.Entity<PaymentTransaction>(e =>
        {
            e.HasOne(p => p.Invoice).WithMany().HasForeignKey(p => p.InvoiceId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.Client).WithMany().HasForeignKey(p => p.ClientId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(p => p.Staff).WithMany().HasForeignKey(p => p.StaffId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(p => p.IdempotencyKey);
            e.HasIndex(p => p.ReceiptNumber).IsUnique();
        });

        modelBuilder.Entity<TrainerWeeklyReport>(e =>
        {
            e.HasOne(r => r.Trainer).WithMany().HasForeignKey(r => r.TrainerId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.Client).WithMany().HasForeignKey(r => r.ClientId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.WorkoutPlan).WithMany().HasForeignKey(r => r.WorkoutPlanId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(r => new { r.TrainerId, r.ClientId, r.WeekStart });
        });

        modelBuilder.Entity<GroupWaitlistEntry>(e =>
        {
            e.HasOne(w => w.TrainingGroup).WithMany()
                .HasForeignKey(w => w.TrainingGroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(w => w.Client).WithMany()
                .HasForeignKey(w => w.ClientId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(w => new { w.TrainingGroupId, w.ClientId, w.Status });
        });

        modelBuilder.Entity<DirectMessage>(e =>
        {
            e.HasOne(m => m.Sender).WithMany().HasForeignKey(m => m.SenderUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.Receiver).WithMany().HasForeignKey(m => m.ReceiverUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(m => new { m.SenderUserId, m.ReceiverUserId, m.SentAt });
            e.Property(m => m.Body).HasMaxLength(4000);
        });

        // Group chat — one shared thread per TrainingGroup.
        modelBuilder.Entity<GroupMessage>(e =>
        {
            e.HasOne(m => m.TrainingGroup).WithMany().HasForeignKey(m => m.TrainingGroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.Sender).WithMany().HasForeignKey(m => m.SenderUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(m => new { m.TrainingGroupId, m.SentAt });
            e.Property(m => m.Body).HasMaxLength(4000);
        });

        modelBuilder.Entity<GroupMessageRead>(e =>
        {
            e.HasOne(r => r.TrainingGroup).WithMany().HasForeignKey(r => r.TrainingGroupId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(r => new { r.TrainingGroupId, r.UserId }).IsUnique();
        });

        modelBuilder.Entity<GymNotice>(e =>
        {
            e.HasOne(n => n.CreatedByUser).WithMany().HasForeignKey(n => n.CreatedByUserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(n => new { n.IsActive, n.StartsAt, n.EndsAt });
            e.Property(n => n.Type).HasMaxLength(40);
            e.Property(n => n.TargetAudience).HasMaxLength(40);
            e.Property(n => n.Title).HasMaxLength(160);
            e.Property(n => n.Message).HasMaxLength(2000);
        });
    }
}
