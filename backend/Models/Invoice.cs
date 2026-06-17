namespace StandUpFitness.Models;

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = null!;
    public int ClientId { get; set; }
    public int? StaffId { get; set; } // Who created the invoice
    public int? CashRegisterId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "pending"; // pending, paid, cancelled, refunded
    public DateTime DueDate { get; set; }
    public DateTime? PaidDate { get; set; }
    public string PaymentMethod { get; set; } = "cash"; // cash, card, transfer
    public string? Notes { get; set; }
    public string? PdfFile { get; set; }
    public string? IdempotencyKey { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Client Client { get; set; } = null!;
    public User? Staff { get; set; }
    public CashRegister? CashRegister { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
}

public class InvoiceItem
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public string Description { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Total { get; set; }

    // Navigation
    public Invoice Invoice { get; set; } = null!;
}
