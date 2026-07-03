using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using StandUpFitness.Data;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <summary>
    /// Group chat (2026-07-03): GroupMessages is a real shared thread per
    /// TrainingGroup (trainer + all its clients + admin/staff post into the same
    /// thread), replacing the earlier one-way "broadcast fanned out as individual
    /// DirectMessages". GroupMessageReads is a per-user last-read pointer (one row
    /// per user/group) used for unread counts.
    /// KUJDES: [DbContext] është i detyrueshëm në migrimet e shkruara me dorë —
    /// pa të EF e kapërcen migrimin në heshtje (mësim nga ReworkRentalScheduling).
    /// </summary>
    [DbContext(typeof(FitnessContext))]
    [Migration("20260703180000_AddGroupChat")]
    public partial class AddGroupChat : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GroupMessages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TrainingGroupId = table.Column<int>(type: "int", nullable: false),
                    SenderUserId = table.Column<int>(type: "int", nullable: false),
                    Body = table.Column<string>(type: "varchar(4000)", maxLength: 4000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    SentAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupMessages_TrainingGroups_TrainingGroupId",
                        column: x => x.TrainingGroupId,
                        principalTable: "TrainingGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GroupMessages_Users_SenderUserId",
                        column: x => x.SenderUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "GroupMessageReads",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    TrainingGroupId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    LastReadAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupMessageReads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupMessageReads_TrainingGroups_TrainingGroupId",
                        column: x => x.TrainingGroupId,
                        principalTable: "TrainingGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GroupMessageReads_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMessages_SenderUserId",
                table: "GroupMessages",
                column: "SenderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GroupMessages_TrainingGroupId_SentAt",
                table: "GroupMessages",
                columns: new[] { "TrainingGroupId", "SentAt" });

            migrationBuilder.CreateIndex(
                name: "IX_GroupMessageReads_TrainingGroupId_UserId",
                table: "GroupMessageReads",
                columns: new[] { "TrainingGroupId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GroupMessageReads_UserId",
                table: "GroupMessageReads",
                column: "UserId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "GroupMessageReads");
            migrationBuilder.DropTable(name: "GroupMessages");
        }
    }
}
