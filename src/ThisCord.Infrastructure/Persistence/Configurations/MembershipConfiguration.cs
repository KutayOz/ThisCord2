using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ThisCord.Domain.Entities;

namespace ThisCord.Infrastructure.Persistence.Configurations;

public class MembershipConfiguration : IEntityTypeConfiguration<Membership>
{
    public void Configure(EntityTypeBuilder<Membership> builder)
    {
        builder.HasKey(m => m.Id);
        
        builder.Property(m => m.Nickname)
            .HasMaxLength(64);
        
        builder.HasIndex(m => new { m.UserId, m.ServerId })
            .IsUnique();
        
        builder.HasIndex(m => m.ServerId);
        
        builder.HasIndex(m => m.UserId);
        
        builder.HasOne(m => m.User)
            .WithMany(u => u.Memberships)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(m => m.Server)
            .WithMany(s => s.Memberships)
            .HasForeignKey(m => m.ServerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
