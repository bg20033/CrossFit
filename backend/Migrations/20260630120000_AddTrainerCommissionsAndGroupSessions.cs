using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainerCommissionsAndGroupSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // --- Trainer payment model columns ---
            migrationBuilder.AddColumn<string>(
                name: "PaymentModel",
                table: "Trainers",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "prorated")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionPerClient",
                table: "Trainers",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "TrainerType",
                table: "Trainers",
                type: "varchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "employee")
                .Annotation("MySql:CharSet", "utf8mb4");

            // --- Invoice line → group link (auto-enroll on paid) ---
            migrationBuilder.AddColumn<int>(
                name: "GroupId",
                table: "InvoiceItems",
                type: "int",
                nullable: true);

            // --- GroupSessions ---
            migrationBuilder.CreateTable(
                name: "GroupSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TrainingGroupId = table.Column<int>(type: "int", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    DayOfWeek = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartMin = table.Column<int>(type: "int", nullable: false),
                    EndMin = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Reason = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PostponedToDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    SubstituteTrainerId = table.Column<int>(type: "int", nullable: true),
                    TrainerCheckedIn = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    TrainerCheckInTime = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupSessions_TrainingGroups_TrainingGroupId",
                        column: x => x.TrainingGroupId,
                        principalTable: "TrainingGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GroupSessions_Trainers_SubstituteTrainerId",
                        column: x => x.SubstituteTrainerId,
                        principalTable: "Trainers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            // --- TrainerCommissions ---
            migrationBuilder.CreateTable(
                name: "TrainerCommissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    Month = table.Column<int>(type: "int", nullable: false),
                    ClientCount = table.Column<int>(type: "int", nullable: false),
                    RatePerClient = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    SessionsPlanned = table.Column<int>(type: "int", nullable: false),
                    SessionsHeld = table.Column<int>(type: "int", nullable: false),
                    SessionsCancelled = table.Column<int>(type: "int", nullable: false),
                    PaymentModel = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ProratedAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Bonus = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Deductions = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    PaidDate = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    FinanceId = table.Column<int>(type: "int", nullable: true),
                    Notes = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrainerCommissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrainerCommissions_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "Trainers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TrainerCommissions_Finances_FinanceId",
                        column: x => x.FinanceId,
                        principalTable: "Finances",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_GroupSessions_SubstituteTrainerId",
                table: "GroupSessions",
                column: "SubstituteTrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupSessions_TrainingGroupId_Date",
                table: "GroupSessions",
                columns: new[] { "TrainingGroupId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_TrainerCommissions_FinanceId",
                table: "TrainerCommissions",
                column: "FinanceId");

            migrationBuilder.CreateIndex(
                name: "IX_TrainerCommissions_TrainerId_Year_Month",
                table: "TrainerCommissions",
                columns: new[] { "TrainerId", "Year", "Month" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "GroupSessions");
            migrationBuilder.DropTable(name: "TrainerCommissions");

            migrationBuilder.DropColumn(name: "GroupId", table: "InvoiceItems");
            migrationBuilder.DropColumn(name: "PaymentModel", table: "Trainers");
            migrationBuilder.DropColumn(name: "CommissionPerClient", table: "Trainers");
            migrationBuilder.DropColumn(name: "TrainerType", table: "Trainers");
        }
    }
}
