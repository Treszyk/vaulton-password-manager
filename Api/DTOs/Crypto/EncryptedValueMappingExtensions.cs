using Core.Crypto;
using System;

namespace Api.DTOs.Crypto;

public static class EncryptedValueMappingExtensions
{
	public static EncryptedValue ToDomain(this EncryptedValueDto dto)
	{
		ArgumentNullException.ThrowIfNull(dto);

		return new EncryptedValue
		{
			Nonce = dto.Nonce,
			CipherText = dto.CipherText,
			Tag = dto.Tag
		};
	}

	public static EncryptedValueDto ToDto(this EncryptedValue value)
	{
		ArgumentNullException.ThrowIfNull(value);

		return new EncryptedValueDto(value.Nonce, value.CipherText, value.Tag);
	}
}