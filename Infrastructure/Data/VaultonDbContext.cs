using Core.Crypto;
using Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data
{
	public class VaultonDbContext(DbContextOptions<VaultonDbContext> options) : DbContext(options)
	{
		public DbSet<User> Users { get; set; }
		public DbSet<Entry> Entries { get; set; }
		public DbSet<RefreshToken> RefreshTokens { get; set; } = default!;
		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			modelBuilder.Entity<Entry>()
				.HasOne<User>()
				.WithMany()
				.HasForeignKey(e => e.UserId)
				.OnDelete(DeleteBehavior.Cascade);

			modelBuilder.Entity<Entry>()
				.HasIndex(e => e.UserId);

			modelBuilder.Entity<Entry>()
				.OwnsOne(e => e.Payload, p =>
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
						.IsRequired();
				});

			modelBuilder.Entity<User>()
				.OwnsOne(u => u.MkWrapPwd, w =>
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

			// Recovery Key is option for now
			modelBuilder.Entity<User>()
				.OwnsOne(u => u.MkWrapRk, w =>
				{
					w.Property(x => x.Nonce)
						.HasColumnName("MkWrapRk_Nonce")
						.HasMaxLength(CryptoSizes.GcmNonceLen)
						.IsRequired(false);

					w.Property(x => x.Tag)
						.HasColumnName("MkWrapRk_Tag")
						.HasMaxLength(CryptoSizes.GcmTagLen)
						.IsRequired(false);

					w.Property(x => x.CipherText)
						.HasColumnName("MkWrapRk_CipherText")
						.HasMaxLength(CryptoSizes.MkLen)
						.IsRequired(false);
				});

			modelBuilder.Entity<User>(b =>
			{
				b.Property(u => u.Verifier).HasMaxLength(CryptoSizes.VerifierLen);
				b.Property(u => u.S_Verifier).HasMaxLength(CryptoSizes.SaltLen);
				b.Property(u => u.S_Pwd).HasMaxLength(CryptoSizes.SaltLen);
			});

			modelBuilder.Entity<Entry>(b =>
			{
				b.Property(e => e.DomainTag).HasMaxLength(CryptoSizes.DomainTagLen);
			});

			modelBuilder.Entity<RefreshToken>(b =>
			{
				b.HasKey(rt => rt.Id);

				b.HasOne(rt => rt.User)
				 .WithMany()
				 .HasForeignKey(rt => rt.UserId)
				 .OnDelete(DeleteBehavior.Cascade);

			});

			modelBuilder.Entity<User>()
				.Navigation(u => u.MkWrapRk)
				.IsRequired(false);

			modelBuilder.Entity<User>()
				.Navigation(u => u.MkWrapPwd)
				.IsRequired();

			modelBuilder.Entity<Entry>()
				.Navigation(e => e.Payload)
				.IsRequired();
		}
	}
}
