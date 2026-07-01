using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalTarget : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "TargetValue",
                table: "Goals",
                type: "decimal(8,2)",
                precision: 8,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                table: "Goals",
                type: "longtext",
                nullable: false,
                defaultValue: "")
                .Annotation("MySql:CharSet", "utf8mb4");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TargetValue",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "Goals");
        }
    }
}
