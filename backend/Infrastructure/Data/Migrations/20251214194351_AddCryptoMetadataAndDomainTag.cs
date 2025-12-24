using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCryptoMetadataAndDomainTag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ArgonLanes",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ArgonMem",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ArgonTime",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ArgonVersion",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CryptoSchemaVer",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<byte[]>(
                name: "DomainTag",
                table: "Entries",
                type: "varbinary(max)",
                nullable: false,
                defaultValue: new byte[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArgonLanes",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ArgonMem",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ArgonTime",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ArgonVersion",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CryptoSchemaVer",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DomainTag",
                table: "Entries");
        }
    }
}
