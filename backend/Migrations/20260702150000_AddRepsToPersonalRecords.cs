using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using StandUpFitness.Data;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <summary>
    /// Leaderboard rework: PersonalRecords ruajnë peshën (Value, kg) DHE
    /// përsëritjet (Reps) — më parë vetëm një vlerë të vetme.
    /// KUJDES: [DbContext] është i detyrueshëm në migrimet e shkruara me dorë —
    /// pa të EF e kapërcen migrimin në heshtje (mësim nga ReworkRentalScheduling).
    /// </summary>
    [DbContext(typeof(FitnessContext))]
    [Migration("20260702150000_AddRepsToPersonalRecords")]
    public partial class AddRepsToPersonalRecords : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Një operacion i vetëm → edhe pa transaksion DDL (MySQL) s'ka gjendje gjysmake.
            migrationBuilder.AddColumn<int>(
                name: "Reps",
                table: "PersonalRecords",
                type: "int",
                nullable: false,
                defaultValue: 1);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Reps",
                table: "PersonalRecords");
        }
    }
}
