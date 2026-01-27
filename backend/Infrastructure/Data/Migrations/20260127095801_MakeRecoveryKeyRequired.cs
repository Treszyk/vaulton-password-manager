using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class MakeRecoveryKeyRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte[]>(
                name: "MkWrapRk_Tag",
                table: "Users",
                type: "bytea",
                maxLength: 16,
                nullable: false,
                defaultValue: new byte[0],
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldMaxLength: 16,
                oldNullable: true);

            migrationBuilder.AlterColumn<byte[]>(
                name: "MkWrapRk_Nonce",
                table: "Users",
                type: "bytea",
                maxLength: 12,
                nullable: false,
                defaultValue: new byte[0],
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldMaxLength: 12,
                oldNullable: true);

            migrationBuilder.AlterColumn<byte[]>(
                name: "MkWrapRk_CipherText",
                table: "Users",
                type: "bytea",
                maxLength: 32,
                nullable: false,
                defaultValue: new byte[0],
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldMaxLength: 32,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte[]>(
                name: "MkWrapRk_Tag",
                table: "Users",
                type: "bytea",
                maxLength: 16,
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldMaxLength: 16);

            migrationBuilder.AlterColumn<byte[]>(
                name: "MkWrapRk_Nonce",
                table: "Users",
                type: "bytea",
                maxLength: 12,
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldMaxLength: 12);

            migrationBuilder.AlterColumn<byte[]>(
                name: "MkWrapRk_CipherText",
                table: "Users",
                type: "bytea",
                maxLength: 32,
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldMaxLength: 32);
        }
    }
}
