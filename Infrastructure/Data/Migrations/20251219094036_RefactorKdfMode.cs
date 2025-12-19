using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RefactorKdfMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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

            migrationBuilder.RenameColumn(
                name: "ArgonVersion",
                table: "Users",
                newName: "KdfMode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "KdfMode",
                table: "Users",
                newName: "ArgonVersion");

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
        }
    }
}
