using Core.Entities;
using FluentAssertions;

namespace Tests.Unit
{
	public class CoreEntitiesTests
	{
		[Fact]
		public void User_and_Entry_construct_and_hold_values()
		{
			var now = DateTime.UtcNow;

			var user = new User
			{
				Id = Guid.NewGuid(),
				Verifier = [1, 2, 3],
				S_Pwd = [4, 5, 6],
				S_Verifier = [7, 8, 9],
				MK_Wrap_Pwd = [10, 11, 12],
				CreatedAt = now,
				UpdatedAt = now
			};

			var entry = new Entry
			{
				Id = Guid.NewGuid(),
				UserId = user.Id,
				Nonce = [10, 11, 12],
				CipherText = [13, 14, 15],
				Tag = [16, 17, 18],
				CreatedAt = now,
				UpdatedAt = now
			};

			user.Id.Should().NotBeEmpty();
			user.Verifier.Should().NotBeNullOrEmpty();
			user.S_Pwd.Should().NotBeNullOrEmpty();
			user.MK_Wrap_Pwd.Should().NotBeNullOrEmpty();
			user.MK_Wrap_Rk.Should().BeNull();    // optional
			user.CreatedAt.Should().BeOnOrAfter(now.AddMinutes(-1));
			user.UpdatedAt.Should().BeOnOrAfter(now.AddMinutes(-1));

			entry.Id.Should().NotBeEmpty();
			entry.UserId.Should().Be(user.Id);
			entry.Nonce.Should().NotBeNullOrEmpty();
			entry.CipherText.Should().NotBeNullOrEmpty();
			entry.Tag.Should().NotBeNullOrEmpty();
			entry.CreatedAt.Should().BeOnOrAfter(now.AddMinutes(-1));
			entry.UpdatedAt.Should().BeOnOrAfter(now.AddMinutes(-1));
		}
	}
}