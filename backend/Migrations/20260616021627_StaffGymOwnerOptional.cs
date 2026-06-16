using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <inheritdoc />
    public partial class StaffGymOwnerOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Staff_GymOwners_GymOwnerId",
                table: "Staff");

            migrationBuilder.AlterColumn<int>(
                name: "GymOwnerId",
                table: "Staff",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddForeignKey(
                name: "FK_Staff_GymOwners_GymOwnerId",
                table: "Staff",
                column: "GymOwnerId",
                principalTable: "GymOwners",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Staff_GymOwners_GymOwnerId",
                table: "Staff");

            migrationBuilder.AlterColumn<int>(
                name: "GymOwnerId",
                table: "Staff",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Staff_GymOwners_GymOwnerId",
                table: "Staff",
                column: "GymOwnerId",
                principalTable: "GymOwners",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
