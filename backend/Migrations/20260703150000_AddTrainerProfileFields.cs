using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StandUpFitness.Data;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <summary>
    /// Public trainer profile (2026-07-03): photo, headline title, work experience,
    /// certifications and trainings — shown on the landing page's Trajnerët section
    /// and editable from Admin → Trajnerët.
    /// KUJDES: [DbContext] është i detyrueshëm në migrimet e shkruara me dorë —
    /// pa të EF e kapërcen migrimin në heshtje (mësim nga ReworkRentalScheduling).
    /// </summary>
    [DbContext(typeof(FitnessContext))]
    [Migration("20260703150000_AddTrainerProfileFields")]
    public partial class AddTrainerProfileFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PhotoUrl",
                table: "Trainers",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Trainers",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "WorkExperience",
                table: "Trainers",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Certifications",
                table: "Trainers",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Trainings",
                table: "Trainers",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "PhotoUrl", table: "Trainers");
            migrationBuilder.DropColumn(name: "Title", table: "Trainers");
            migrationBuilder.DropColumn(name: "WorkExperience", table: "Trainers");
            migrationBuilder.DropColumn(name: "Certifications", table: "Trainers");
            migrationBuilder.DropColumn(name: "Trainings", table: "Trainers");
        }
    }
}
