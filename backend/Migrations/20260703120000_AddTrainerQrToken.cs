using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StandUpFitness.Data;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <summary>
    /// Trainer self check-in via QR (2026-07-03): trainers get an opaque QrToken
    /// (mirrors Client.QrToken) so scanning it at Arka auto-opens every group
    /// session of theirs scheduled right now.
    /// KUJDES: [DbContext] është i detyrueshëm në migrimet e shkruara me dorë —
    /// pa të EF e kapërcen migrimin në heshtje (mësim nga ReworkRentalScheduling).
    /// </summary>
    [DbContext(typeof(FitnessContext))]
    [Migration("20260703120000_AddTrainerQrToken")]
    public partial class AddTrainerQrToken : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "QrToken",
                table: "Trainers",
                type: "varchar(255)",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Trainers_QrToken",
                table: "Trainers",
                column: "QrToken");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Trainers_QrToken",
                table: "Trainers");

            migrationBuilder.DropColumn(
                name: "QrToken",
                table: "Trainers");
        }
    }
}
