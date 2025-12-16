using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ThisCord.Domain.Entities;

namespace ThisCord.Infrastructure.Persistence.Configurations;

public class ServerConfiguration : IEntityTypeConfiguration<Server>
{
    public void Configure(EntityTypeBuilder<Server> builder)
    {
        builder.HasKey(s => s.Id);
        
        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(100);
        
        builder.Property(s => s.Description)
            .HasMaxLength(1000);
        
        builder.Property(s => s.IconUrl)
            .HasMaxLength(512);
        
        builder.Property(s => s.InviteCode)
            .IsRequired()
            .HasMaxLength(16);
        
        builder.HasIndex(s => s.InviteCode)
            .IsUnique();
        
        builder.HasIndex(s => s.OwnerId);
        
        builder.HasIndex(s => s.IsDeleted);
        
        builder.HasOne(s => s.Owner)
            .WithMany(u => u.OwnedServers)
            .HasForeignKey(s => s.OwnerId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
