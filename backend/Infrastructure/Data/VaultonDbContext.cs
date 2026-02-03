using Core.Crypto;
using Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public class VaultonDbContext(DbContextOptions<VaultonDbContext> options) : DbContext(options)
{
	public DbSet<User> Users { get; set; } = default!;
	public DbSet<Entry> Entries { get; set; } = default!;
	public DbSet<RefreshToken> RefreshTokens { get; set; } = default!;

	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);

		ConfigureEntries(modelBuilder);
		ConfigureUsers(modelBuilder);
		ConfigureRefreshTokens(modelBuilder);
	}

	private static void ConfigureEntries(ModelBuilder modelBuilder)
	{
		var b = modelBuilder.Entity<Entry>();

		// Entry -> User
		b.HasOne<User>()
			.WithMany()
			.HasForeignKey(e => e.UserId)
			.OnDelete(DeleteBehavior.Cascade);

		b.HasIndex(e => e.UserId);

		b.OwnsOne(e => e.Payload, p =>
		{
			p.Property(x => x.Nonce)
				.HasColumnName("Payload_Nonce")
				.HasMaxLength(CryptoSizes.GcmNonceLen)
				.IsRequired();

			p.Property(x => x.Tag)
				.HasColumnName("Payload_Tag")
				.HasMaxLength(CryptoSizes.GcmTagLen)
				.IsRequired();

			p.Property(x => x.CipherText)
				.HasColumnName("Payload_CipherText")
				.HasMaxLength(CryptoSizes.MaxEntryCiphertextBytes)
				.IsRequired();
		});

		b.Navigation(e => e.Payload).IsRequired();
	}

	private static void ConfigureUsers(ModelBuilder modelBuilder)
	{
		var b = modelBuilder.Entity<User>();

		b.Property(u => u.Verifier).HasMaxLength(CryptoSizes.VerifierLen);
		b.Property(u => u.S_Verifier).HasMaxLength(CryptoSizes.SaltLen);
		b.Property(u => u.S_Pwd).HasMaxLength(CryptoSizes.SaltLen);

		b.Property(u => u.KdfMode).HasConversion<int>();

		b.OwnsOne(u => u.MkWrapPwd, w =>
		{
			w.Property(x => x.Nonce)
				.HasColumnName("MkWrapPwd_Nonce")
				.HasMaxLength(CryptoSizes.GcmNonceLen)
				.IsRequired();

			w.Property(x => x.Tag)
				.HasColumnName("MkWrapPwd_Tag")
				.HasMaxLength(CryptoSizes.GcmTagLen)
				.IsRequired();

			w.Property(x => x.CipherText)
				.HasColumnName("MkWrapPwd_CipherText")
				.HasMaxLength(CryptoSizes.MkLen)
				.IsRequired();
		});

		b.OwnsOne(u => u.MkWrapRk, w =>
		{
			w.Property(x => x.Nonce)
				.HasColumnName("MkWrapRk_Nonce")
				.HasMaxLength(CryptoSizes.GcmNonceLen)
				.IsRequired();

			w.Property(x => x.Tag)
				.HasColumnName("MkWrapRk_Tag")
				.HasMaxLength(CryptoSizes.GcmTagLen)
				.IsRequired();

			w.Property(x => x.CipherText)
				.HasColumnName("MkWrapRk_CipherText")
				.HasMaxLength(CryptoSizes.MkLen)
				.IsRequired();
		});

		b.Navigation(u => u.MkWrapPwd).IsRequired();
		b.Navigation(u => u.MkWrapRk).IsRequired();
	}

	private static void ConfigureRefreshTokens(ModelBuilder modelBuilder)
	{
		var b = modelBuilder.Entity<RefreshToken>();

		b.HasKey(rt => rt.Id);

		b.HasOne(rt => rt.User)
			.WithMany()
			.HasForeignKey(rt => rt.UserId)
			.OnDelete(DeleteBehavior.Cascade);

		b.Property(rt => rt.TokenHash)
			.HasMaxLength(32)
			.IsRequired();

		b.HasIndex(rt => rt.TokenHash).IsUnique();
		b.HasIndex(rt => rt.UserId);

		b.Property(rt => rt.CreatedAt).IsRequired();
		b.Property(rt => rt.ExpiresAt).IsRequired();
	}
}
