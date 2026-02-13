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
				S_Verifier = [4, 5, 6],
				AdminVerifier = [7, 8, 9],
				S_AdminVerifier = [10, 11, 12],
				S_Pwd = [13, 14, 15],
				KdfMode = Core.Crypto.KdfMode.Strong,
				MkWrapPwd = new Core.Crypto.EncryptedValue { Nonce = [1], CipherText = [2], Tag = [3] },
				MkWrapRk = new Core.Crypto.EncryptedValue { Nonce = [4], CipherText = [5], Tag = [6] },
				RkVerifier = [16, 17, 18],
				S_Rk = [19, 20, 21],
				CryptoSchemaVer = 1,
				CreatedAt = now,
				UpdatedAt = now
			};

			var entry = new Entry
			{
				Id = Guid.NewGuid(),
				UserId = user.Id,
				Payload = new Core.Crypto.EncryptedValue 
				{
					Nonce = [10, 11, 12],
					CipherText = [13, 14, 15],
					Tag = [16, 17, 18]
				},
				CreatedAt = now,
				UpdatedAt = now
			};

			user.Id.Should().NotBeEmpty();
			user.Verifier.Should().NotBeNullOrEmpty();
			user.MkWrapPwd.Should().NotBeNull();
			user.MkWrapRk.Should().NotBeNull();
			user.CreatedAt.Should().BeOnOrAfter(now.AddMinutes(-1));

			entry.Id.Should().NotBeEmpty();
			entry.UserId.Should().Be(user.Id);
			entry.Payload.Nonce.Should().NotBeNullOrEmpty();
			entry.Payload.CipherText.Should().NotBeNullOrEmpty();
			entry.Payload.Tag.Should().NotBeNullOrEmpty();
		}
	}
}