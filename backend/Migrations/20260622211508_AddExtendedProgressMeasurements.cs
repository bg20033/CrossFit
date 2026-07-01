using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <inheritdoc />
    public partial class AddExtendedProgressMeasurements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Back",
                table: "ProgressLogs",
                type: "decimal(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Calves",
                table: "ProgressLogs",
                type: "decimal(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Shoulders",
                table: "ProgressLogs",
                type: "decimal(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Back",
                table: "ProgressLogs");

            migrationBuilder.DropColumn(
                name: "Calves",
                table: "ProgressLogs");

            migrationBuilder.DropColumn(
                name: "Shoulders",
                table: "ProgressLogs");
        }
    }
}
