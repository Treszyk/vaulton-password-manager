using Microsoft.EntityFrameworkCore;
using Core.Entities;

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

			modelBuilder.Entity<RefreshToken>(b =>
			{
				b.HasKey(rt => rt.Id);

				b.HasOne(rt => rt.User)
				 .WithMany()
				 .HasForeignKey(rt => rt.UserId)
				 .OnDelete(DeleteBehavior.Cascade);

			});
		}
	}
}
