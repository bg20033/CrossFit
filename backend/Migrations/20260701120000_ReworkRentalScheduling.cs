using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandUpFitness.Migrations
{
    // Hand-authored migration (no `dotnet ef` tooling available in the environment
    // this was written in). It carries its own [Migration] attribute instead of a
    // separate *.Designer.cs, which is all EF Core needs to discover and apply it
    // via `dotnet ef database update` / Database.Migrate(). Before your next
    // `dotnet ef migrations add`, run one locally to confirm the model is in sync —
    // FitnessContextModelSnapshot.cs was updated by hand alongside this file.
    [Migration("20260701120000_ReworkRentalScheduling")]
    public partial class ReworkRentalScheduling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rentals no longer work as "book a slot out of a shared pool" (RentalSlots).
            // A qiragji (TrainerTenant) now configures their own name + recurring weekly
            // schedule directly, the same way a TrainingGroup does.
            migrationBuilder.DropTable(name: "RentalSlots");

            migrationBuilder.CreateTable(
                name: "RentalScheduleSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TrainerTenantId = table.Column<int>(type: "int", nullable: false),
                    DayOfWeek = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartMin = table.Column<int>(type: "int", nullable: false),
                    EndMin = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalScheduleSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RentalScheduleSlots_TrainerTenants_TrainerTenantId",
                        column: x => x.TrainerTenantId,
                        principalTable: "TrainerTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_RentalScheduleSlots_TrainerTenantId_DayOfWeek_StartMin",
                table: "RentalScheduleSlots",
                columns: new[] { "TrainerTenantId", "DayOfWeek", "StartMin" });

            migrationBuilder.CreateTable(
                name: "RentalSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TrainerTenantId = table.Column<int>(type: "int", nullable: false),
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
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RentalSessions_TrainerTenants_TrainerTenantId",
                        column: x => x.TrainerTenantId,
                        principalTable: "TrainerTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_RentalSessions_TrainerTenantId_Date",
                table: "RentalSessions",
                columns: new[] { "TrainerTenantId", "Date" });

            // Rename the seeded "TrainerTenant" system role's display name to "Qiragji"
            // (the underlying Key stays "trainertenant" for compatibility).
            migrationBuilder.Sql(
                "UPDATE DynamicRoles SET Name = 'Qiragji' WHERE `Key` = 'trainertenant' AND IsSystem = 1;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "RentalSessions");
            migrationBuilder.DropTable(name: "RentalScheduleSlots");

            migrationBuilder.CreateTable(
                name: "RentalSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TrainerTenantId = table.Column<int>(type: "int", nullable: true),
                    DayOfWeek = table.Column<string>(type: "varchar(255)", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartMin = table.Column<int>(type: "int", nullable: false),
                    DurationMin = table.Column<int>(type: "int", nullable: false),
                    Room = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Cost = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsRecurring = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    StartsAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    EndsAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RentalSlots_TrainerTenants_TrainerTenantId",
                        column: x => x.TrainerTenantId,
                        principalTable: "TrainerTenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_RentalSlots_DayOfWeek_StartMin",
                table: "RentalSlots",
                columns: new[] { "DayOfWeek", "StartMin" });

            migrationBuilder.CreateIndex(
                name: "IX_RentalSlots_TrainerTenantId",
                table: "RentalSlots",
                column: "TrainerTenantId");

            migrationBuilder.Sql(
                "UPDATE DynamicRoles SET Name = 'TrainerTenant' WHERE `Key` = 'trainertenant' AND IsSystem = 1;");
        }
    }
}
