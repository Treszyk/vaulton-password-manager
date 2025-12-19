using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class RefactorEncryptedValue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MK_Wrap_Pwd",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MK_Wrap_Rk",
                table: "Users");

            migrationBuilder.RenameColumn(
                name: "Tag",
                table: "Entries",
                newName: "Payload_Tag");

            migrationBuilder.RenameColumn(
                name: "Nonce",
                table: "Entries",
                newName: "Payload_Nonce");

            migrationBuilder.RenameColumn(
                name: "CipherText",
                table: "Entries",
                newName: "Payload_CipherText");

            migrationBuilder.AlterColumn<byte[]>(
                name: "Verifier",
                table: "Users",
                type: "varbinary(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(max)");

            migrationBuilder.AlterColumn<byte[]>(
                name: "S_Verifier",
                table: "Users",
                type: "varbinary(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(max)");

            migrationBuilder.AlterColumn<byte[]>(
                name: "S_Pwd",
                table: "Users",
                type: "varbinary(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(max)");

            migrationBuilder.AddColumn<byte[]>(
                name: "MkWrapPwd_CipherText",
                table: "Users",
                type: "varbinary(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "MkWrapPwd_Nonce",
                table: "Users",
                type: "varbinary(12)",
                maxLength: 12,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "MkWrapPwd_Tag",
                table: "Users",
                type: "varbinary(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "MkWrapRk_CipherText",
                table: "Users",
                type: "varbinary(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "MkWrapRk_Nonce",
                table: "Users",
                type: "varbinary(12)",
                maxLength: 12,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "MkWrapRk_Tag",
                table: "Users",
                type: "varbinary(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AlterColumn<byte[]>(
                name: "DomainTag",
                table: "Entries",
                type: "varbinary(32)",
                maxLength: 32,
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(max)");

            migrationBuilder.AlterColumn<byte[]>(
                name: "Payload_Tag",
                table: "Entries",
                type: "varbinary(16)",
                maxLength: 16,
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(max)");

            migrationBuilder.AlterColumn<byte[]>(
                name: "Payload_Nonce",
                table: "Entries",
                type: "varbinary(12)",
                maxLength: 12,
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(max)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MkWrapPwd_CipherText",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MkWrapPwd_Nonce",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MkWrapPwd_Tag",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MkWrapRk_CipherText",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MkWrapRk_Nonce",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MkWrapRk_Tag",
                table: "Users");

            migrationBuilder.RenameColumn(
                name: "Payload_Tag",
                table: "Entries",
                newName: "Tag");

            migrationBuilder.RenameColumn(
                name: "Payload_Nonce",
                table: "Entries",
                newName: "Nonce");

            migrationBuilder.RenameColumn(
                name: "Payload_CipherText",
                table: "Entries",
                newName: "CipherText");

            migrationBuilder.AlterColumn<byte[]>(
                name: "Verifier",
                table: "Users",
                type: "varbinary(max)",
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(32)",
                oldMaxLength: 32);

            migrationBuilder.AlterColumn<byte[]>(
                name: "S_Verifier",
                table: "Users",
                type: "varbinary(max)",
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(16)",
                oldMaxLength: 16);

            migrationBuilder.AlterColumn<byte[]>(
                name: "S_Pwd",
                table: "Users",
                type: "varbinary(max)",
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(16)",
                oldMaxLength: 16);

            migrationBuilder.AddColumn<byte[]>(
                name: "MK_Wrap_Pwd",
                table: "Users",
                type: "varbinary(max)",
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "MK_Wrap_Rk",
                table: "Users",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AlterColumn<byte[]>(
                name: "DomainTag",
                table: "Entries",
                type: "varbinary(max)",
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(32)",
                oldMaxLength: 32);

            migrationBuilder.AlterColumn<byte[]>(
                name: "Tag",
                table: "Entries",
                type: "varbinary(max)",
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(16)",
                oldMaxLength: 16);

            migrationBuilder.AlterColumn<byte[]>(
                name: "Nonce",
                table: "Entries",
                type: "varbinary(max)",
                nullable: false,
                oldClrType: typeof(byte[]),
                oldType: "varbinary(12)",
                oldMaxLength: 12);
        }
    }
}
