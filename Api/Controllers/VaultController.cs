using Api.DTOs.Vault;
using Application.Services.Vault;
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
	public ActionResult<CreateEntryResponse> Create([FromBody] CreateEntryRequest request)
		=> StatusCode(StatusCodes.Status501NotImplemented);

	[HttpGet]
	public ActionResult<IReadOnlyList<EntryDto>> List()
		=> StatusCode(StatusCodes.Status501NotImplemented);

	[HttpGet("{id:guid}")]
	public ActionResult<EntryDto> Get([FromRoute] Guid id)
		=> StatusCode(StatusCodes.Status501NotImplemented);

	[HttpDelete("{id:guid}")]
	public IActionResult Delete([FromRoute] Guid id)
		=> StatusCode(StatusCodes.Status501NotImplemented);
}
