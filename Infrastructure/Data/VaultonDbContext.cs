using Microsoft.EntityFrameworkCore;
using Core.Entities;

namespace Infrastructure.Data
{
	public class VaultonDbContext(DbContextOptions<VaultonDbContext> options) : DbContext(options)
	{
		public DbSet<User> Users { get; set; }
		public DbSet<Entry> Entries { get; set; }

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			modelBuilder.Entity<Entry>()
				.HasOne<User>()
				.WithMany()
				.HasForeignKey(e => e.UserId)
				.OnDelete(DeleteBehavior.Cascade);

			modelBuilder.Entity<Entry>()
				.HasIndex(e => e.UserId);
		}
	}
}
