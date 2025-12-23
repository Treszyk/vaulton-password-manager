using Api.DTOs.Crypto;
using Api.DTOs.Vault;
using Application.Services.Vault;
using Application.Services.Vault.Commands;
using Application.Services.Vault.Errors;
using Core.Crypto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("vault/entries")]
[Authorize]
public sealed class VaultController(IVaultService vault) : ControllerBase
{
	private readonly IVaultService _vault = vault;

	[HttpPost]
	public async Task<ActionResult<CreateEntryResponse>> Create([FromBody] CreateEntryRequest request)
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();

		var payload = request.Payload.ToDomain();

		var cmd = new CreateEntryCommand(accountId, request.DomainTag, payload);
		var result = await _vault.CreateEntryAsync(cmd);

		if (!result.Success)
		{
			return result.Error switch
			{
				VaultError.InvalidCryptoBlob => BadRequest(new { message = "Invalid crypto blob sizes." }),
				_ => StatusCode(StatusCodes.Status500InternalServerError)
			};
		}

		return CreatedAtAction(
			nameof(Get),
			new { id = result.EntryId!.Value },
			new CreateEntryResponse(result.EntryId!.Value)
		);
	}

	[HttpGet]
	public async Task<ActionResult<IReadOnlyList<EntryDto>>> List(
			[FromQuery] int skip = 0,
			[FromQuery] int take = 200
		)
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();


		if (skip < 0)
			return BadRequest(new { message = "skip must be >= 0." });

		if (take <= 0)
			return BadRequest(new { message = "take must be > 0." });

		if (take > 500)
			take = 500;
		var result = await _vault.ListEntriesAsync(new ListEntriesCommand(accountId, skip, take));

		if (!result.Success)
		{
			return result.Error switch
			{
				VaultError.InvalidCryptoBlob => BadRequest(new { message = "Invalid request." }),
				_ => StatusCode(StatusCodes.Status500InternalServerError)
			};
		}

		var dtos = result.Entries!.Select(e => new EntryDto(
			e.Id,
			e.DomainTag,
			e.Payload.ToDto()
		)).ToList();

		return Ok(dtos);
	}


	[HttpGet("{id:guid}")]
	public async Task<ActionResult<EntryDto>> Get([FromRoute] Guid id)
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();

		var result = await _vault.GetEntryAsync(new GetEntryCommand(accountId, id));

		if (!result.Success)
		{
			return result.Error switch
			{
				VaultError.NotFound => NotFound(),
				_ => StatusCode(StatusCodes.Status500InternalServerError)
			};
		}

		var dto = new EntryDto(
			result.EntryId!.Value,
			result.DomainTag!,
			new EncryptedValueDto(
				result.Payload!.Nonce,
				result.Payload!.CipherText,
				result.Payload!.Tag
			)
		);

		return Ok(dto);
	}

	[HttpDelete("{id:guid}")]
	public async Task<IActionResult> Delete([FromRoute] Guid id)
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();

		var result = await _vault.DeleteEntryAsync(new DeleteEntryCommand(accountId, id));

		if (!result.Success)
		{
			return result.Error switch
			{
				VaultError.NotFound => NotFound(),
				_ => StatusCode(StatusCodes.Status500InternalServerError)
			};
		}

		return NoContent();
	}

	[HttpPut("{id:guid}")]
	public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateEntryRequest request)
	{
		if (!User.TryGetAccountId(out var accountId))
			return Unauthorized();

		var payload = new EncryptedValue
		{
			Nonce = request.Payload.Nonce,
			CipherText = request.Payload.CipherText,
			Tag = request.Payload.Tag
		};

		var cmd = new UpdateEntryCommand(accountId, id, request.DomainTag, payload);
		var result = await _vault.UpdateEntryAsync(cmd);

		if (!result.Success)
		{
			return result.Error switch
			{
				VaultError.InvalidCryptoBlob => BadRequest(new { message = "Invalid crypto blob sizes." }),
				VaultError.NotFound => NotFound(),
				_ => StatusCode(StatusCodes.Status500InternalServerError)
			};
		}

		return NoContent();
	}

}
