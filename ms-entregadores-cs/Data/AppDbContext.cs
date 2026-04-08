using Features.GerenciamentoEntregadores;
using Microsoft.EntityFrameworkCore;

namespace Data;

public partial class AppDbContext : DbContext
{
  public AppDbContext()
  {
  }

  public AppDbContext(DbContextOptions<AppDbContext> options)
      : base(options)
  {
  }

  public virtual DbSet<Entregador> Entregadores { get; set; }

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    modelBuilder.Entity<Entregador>(entity =>
    {
      entity.HasKey(e => e.Id).HasName("entregadores_pkey");
      entity.ToTable("entregadores");

      entity.Property(e => e.Id).HasColumnName("id").HasColumnType("integer");
      entity.Property(e => e.Nome).HasMaxLength(100).HasColumnName("nome");
      entity.Property(e => e.Telefone).HasMaxLength(20).HasColumnName("telefone");
      entity.Property(e => e.Veiculo).HasMaxLength(50).HasColumnName("veiculo");
      entity.Property(e => e.Status).HasMaxLength(50).HasColumnName("status").HasColumnType("varchar");
    });

    OnModelCreatingPartial(modelBuilder);
  }

  partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}