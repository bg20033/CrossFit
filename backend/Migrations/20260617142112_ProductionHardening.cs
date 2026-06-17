using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StandUpFitness.Migrations
{
    /// <inheritdoc />
    public partial class ProductionHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "MembershipPlans",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "MembershipPlans",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Invoices",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Invoices",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "Invoices",
                type: "varchar(255)",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Invoices",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Finances",
                type: "varchar(255)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "longtext")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "Finances",
                type: "varchar(255)",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Clients",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "Clients",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PlanId",
                table: "Clients",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    UserRole = table.Column<string>(type: "longtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Method = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Path = table.Column<string>(type: "longtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    StatusCode = table.Column<int>(type: "int", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_IdempotencyKey",
                table: "Invoices",
                column: "IdempotencyKey");

            migrationBuilder.CreateIndex(
                name: "IX_Invoices_Status",
                table: "Invoices",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Finances_IdempotencyKey",
                table: "Finances",
                column: "IdempotencyKey");

            migrationBuilder.CreateIndex(
                name: "IX_Finances_Type_TransactionDate",
                table: "Finances",
                columns: new[] { "Type", "TransactionDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Clients_PlanId",
                table: "Clients",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceLogs_ClientId_CheckInTime",
                table: "AttendanceLogs",
                columns: new[] { "ClientId", "CheckInTime" });

            // Drop the now-redundant single-column FK index AFTER the composite exists
            // (the composite's leading ClientId column satisfies the FK on MySQL).
            migrationBuilder.DropIndex(
                name: "IX_AttendanceLogs_ClientId",
                table: "AttendanceLogs");

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_MembershipPlans_PlanId",
                table: "Clients",
                column: "PlanId",
                principalTable: "MembershipPlans",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clients_MembershipPlans_PlanId",
                table: "Clients");

            migrationBuilder.DropTable(
                name: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_IdempotencyKey",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Invoices_Status",
                table: "Invoices");

            migrationBuilder.DropIndex(
                name: "IX_Finances_IdempotencyKey",
                table: "Finances");

            migrationBuilder.DropIndex(
                name: "IX_Finances_Type_TransactionDate",
                table: "Finances");

            migrationBuilder.DropIndex(
                name: "IX_Clients_PlanId",
                table: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_AttendanceLogs_ClientId_CheckInTime",
                table: "AttendanceLogs");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "MembershipPlans");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "MembershipPlans");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "IdempotencyKey",
                table: "Finances");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "PlanId",
                table: "Clients");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Invoices",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Finances",
                type: "longtext",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(255)")
                .Annotation("MySql:CharSet", "utf8mb4")
                .OldAnnotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceLogs_ClientId",
                table: "AttendanceLogs",
                column: "ClientId");
        }
    }
}
