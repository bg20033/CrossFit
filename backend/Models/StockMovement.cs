namespace StandUpFitness.Models;

public class StockMovement
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string MovementType { get; set; } = null!; // in, sale, adjustment, return
    public int Quantity { get; set; }
    public decimal? UnitCost { get; set; }
    public string? Notes { get; set; }
    public int? StaffId { get; set; }
    public int? InvoiceItemId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Product Product { get; set; } = null!;
    public User? Staff { get; set; }
    public InvoiceItem? InvoiceItem { get; set; }
}
