using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StandUpFitness.Data;
using StandUpFitness.Models;

namespace StandUpFitness.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AdminOnly")]
public class RentalsController : ControllerBase
{
    private readonly FitnessContext _context;

    public RentalsController(FitnessContext context)
    {
        _context = context;
    }

    // POST: api/rentals/inquiry  (public — from the marketing page)
    [AllowAnonymous]
    [HttpPost("inquiry")]
    public async Task<IActionResult> CreateInquiry([FromBody] RentalInquiryRequest request)
    {
        var inquiry = new RentalInquiry
        {
            Name = request.Name,
            Email = request.Email,
            Phone = request.Phone ?? "",
            Message = request.Message ?? "",
            Status = "new"
        };
        _context.RentalInquiries.Add(inquiry);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Inquiry received", id = inquiry.Id });
    }

    // GET: api/rentals
    [HttpGet]
    public async Task<IActionResult> GetInquiries([FromQuery] string? status)
    {
        var query = _context.RentalInquiries.AsQueryable();
        if (!string.IsNullOrEmpty(status))
            query = query.Where(r => r.Status == status);

        var inquiries = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, r.Name, r.Email, r.Phone, r.Message, r.Status, r.CreatedAt })
            .ToListAsync();

        return Ok(inquiries);
    }

    // PUT: api/rentals/{id}/status
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] RentalStatusRequest request)
    {
        var inquiry = await _context.RentalInquiries.FindAsync(id);
        if (inquiry == null) return NotFound();
        inquiry.Status = request.Status;
        await _context.SaveChangesAsync();
        return Ok(new { message = "Updated" });
    }
}

public class RentalInquiryRequest
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Phone { get; set; }
    public string? Message { get; set; }
}

public class RentalStatusRequest
{
    public string Status { get; set; } = null!;
}
