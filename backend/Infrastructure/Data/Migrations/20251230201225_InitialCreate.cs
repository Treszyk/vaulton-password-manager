using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Verifier = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    S_Verifier = table.Column<byte[]>(type: "bytea", maxLength: 16, nullable: false),
                    AdminVerifier = table.Column<byte[]>(type: "bytea", nullable: false),
                    S_AdminVerifier = table.Column<byte[]>(type: "bytea", nullable: false),
                    S_Pwd = table.Column<byte[]>(type: "bytea", maxLength: 16, nullable: false),
                    KdfMode = table.Column<int>(type: "integer", nullable: false),
                    MkWrapPwd_Nonce = table.Column<byte[]>(type: "bytea", maxLength: 12, nullable: false),
                    MkWrapPwd_CipherText = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    MkWrapPwd_Tag = table.Column<byte[]>(type: "bytea", maxLength: 16, nullable: false),
                    MkWrapRk_Nonce = table.Column<byte[]>(type: "bytea", maxLength: 12, nullable: true),
                    MkWrapRk_CipherText = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: true),
                    MkWrapRk_Tag = table.Column<byte[]>(type: "bytea", maxLength: 16, nullable: true),
                    CryptoSchemaVer = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FailedLoginCount = table.Column<int>(type: "integer", nullable: false),
                    LastFailedLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LockedUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Payload_Nonce = table.Column<byte[]>(type: "bytea", maxLength: 12, nullable: false),
                    Payload_CipherText = table.Column<byte[]>(type: "bytea", maxLength: 4096, nullable: false),
                    Payload_Tag = table.Column<byte[]>(type: "bytea", maxLength: 16, nullable: false),
                    DomainTag = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Entries_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<byte[]>(type: "bytea", maxLength: 32, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Entries_DomainTag",
                table: "Entries",
                column: "DomainTag");

            migrationBuilder.CreateIndex(
                name: "IX_Entries_UserId",
                table: "Entries",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Entries");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
