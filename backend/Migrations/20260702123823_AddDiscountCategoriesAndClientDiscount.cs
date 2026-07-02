using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace StandUpFitness.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscountCategoriesAndClientDiscount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DiscountCategory",
                table: "Clients",
                type: "longtext",
                nullable: false)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "DiscountCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    Key = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    Name = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    DiscountPercent = table.Column<int>(type: "int", nullable: false),
                    IsBuiltIn = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiscountCategories", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.InsertData(
                table: "DiscountCategories",
                columns: new[] { "Id", "CreatedAt", "DiscountPercent", "IsActive", "IsBuiltIn", "Key", "Name", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010), 0, true, true, "standard", "Standarde", new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010) },
                    { 2, new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010), 20, true, true, "police", "Policia (zbritje)", new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010) },
                    { 3, new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010), 100, true, true, "free", "Falas (0€)", new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010) },
                    { 4, new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010), 0, true, true, "shared", "E ndarë (3–4)", new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010) },
                    { 5, new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010), 0, true, true, "session_pass", "Pako seancash", new DateTime(2026, 7, 2, 12, 38, 23, 509, DateTimeKind.Utc).AddTicks(7010) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_DiscountCategories_Key",
                table: "DiscountCategories",
                column: "Key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiscountCategories");

            migrationBuilder.DropColumn(
                name: "DiscountCategory",
                table: "Clients");
        }
    }
}
