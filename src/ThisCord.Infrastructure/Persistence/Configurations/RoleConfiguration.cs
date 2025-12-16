using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ThisCord.Domain.Entities;

namespace ThisCord.Infrastructure.Persistence.Configurations;

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.HasKey(r => r.Id);
        
        builder.Property(r => r.Name)
            .IsRequired()
            .HasMaxLength(64);
        
        builder.Property(r => r.Color)
            .HasMaxLength(7);
        
        builder.HasIndex(r => new { r.ServerId, r.Position });
        
        builder.HasIndex(r => new { r.ServerId, r.IsDefault });
        
        builder.HasOne(r => r.Server)
            .WithMany(s => s.Roles)
            .HasForeignKey(r => r.ServerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
