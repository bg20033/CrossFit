using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupScheduleSlots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GroupScheduleSlots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TrainingGroupId = table.Column<int>(type: "int", nullable: false),
                    DayOfWeek = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StartMin = table.Column<int>(type: "int", nullable: false),
                    EndMin = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupScheduleSlots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupScheduleSlots_TrainingGroups_TrainingGroupId",
                        column: x => x.TrainingGroupId,
                        principalTable: "TrainingGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_GroupScheduleSlots_TrainingGroupId_DayOfWeek_StartMin",
                table: "GroupScheduleSlots",
                columns: new[] { "TrainingGroupId", "DayOfWeek", "StartMin" });

            // Backfill: seed each existing group's single legacy slot into the new table
            // so its weekly schedule is preserved.
            migrationBuilder.Sql(@"
                INSERT INTO GroupScheduleSlots (TrainingGroupId, DayOfWeek, StartMin, EndMin)
                SELECT Id, DayOfWeek,
                       HOUR(ScheduleStart) * 60 + MINUTE(ScheduleStart),
                       HOUR(ScheduleEnd)   * 60 + MINUTE(ScheduleEnd)
                FROM TrainingGroups
                WHERE DayOfWeek IS NOT NULL AND DayOfWeek <> '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GroupScheduleSlots");
        }
    }
}
