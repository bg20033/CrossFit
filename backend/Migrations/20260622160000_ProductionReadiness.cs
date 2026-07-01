using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <inheritdoc />
    public partial class ProductionReadiness : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ProgressLog: full body measurements
            migrationBuilder.AddColumn<decimal>(
                name: "Arms", table: "ProgressLogs", type: "decimal(8,2)", precision: 8, scale: 2, nullable: true);
            migrationBuilder.AddColumn<decimal>(
                name: "BodyFat", table: "ProgressLogs", type: "decimal(8,2)", precision: 8, scale: 2, nullable: true);
            migrationBuilder.AddColumn<decimal>(
                name: "Thighs", table: "ProgressLogs", type: "decimal(8,2)", precision: 8, scale: 2, nullable: true);

            // MembershipPlan: plan type, grace period, shared, session pass
            migrationBuilder.AddColumn<int>(
                name: "GraceDays", table: "MembershipPlans", type: "int", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(
                name: "MaxSharedMembers", table: "MembershipPlans", type: "int", nullable: false, defaultValue: 1);
            migrationBuilder.AddColumn<string>(
                name: "PlanType", table: "MembershipPlans", type: "varchar(40)", maxLength: 40, nullable: false, defaultValue: "standard")
                .Annotation("MySql:CharSet", "utf8mb4");
            migrationBuilder.AddColumn<int>(
                name: "SessionsTotal", table: "MembershipPlans", type: "int", nullable: false, defaultValue: 0);

            // GymSettings (single-row config)
            migrationBuilder.CreateTable(
                name: "GymSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    OpenTime = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CloseTime = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ClosedDays = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    HolidayDates = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BrandName = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    BrandColor = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    RefundThreshold = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GymSettings", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "GymSettings");
            migrationBuilder.DropColumn(name: "Arms", table: "ProgressLogs");
            migrationBuilder.DropColumn(name: "BodyFat", table: "ProgressLogs");
            migrationBuilder.DropColumn(name: "Thighs", table: "ProgressLogs");
            migrationBuilder.DropColumn(name: "GraceDays", table: "MembershipPlans");
            migrationBuilder.DropColumn(name: "MaxSharedMembers", table: "MembershipPlans");
            migrationBuilder.DropColumn(name: "PlanType", table: "MembershipPlans");
            migrationBuilder.DropColumn(name: "SessionsTotal", table: "MembershipPlans");
        }
    }
}
