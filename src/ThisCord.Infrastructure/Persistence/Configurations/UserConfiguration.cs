using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ThisCord.Domain.Entities;

namespace ThisCord.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        
        builder.Property(u => u.Username)
            .IsRequired()
            .HasMaxLength(32);
        
        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);
        
        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(512);
        
        builder.Property(u => u.DisplayName)
            .HasMaxLength(64);
        
        builder.Property(u => u.AvatarUrl)
            .HasMaxLength(512);
        
        builder.Property(u => u.Bio)
            .HasMaxLength(500);
        
        builder.Property(u => u.RefreshToken)
            .HasMaxLength(512);
        
        builder.HasIndex(u => u.Username)
            .IsUnique();
        
        builder.HasIndex(u => u.Email)
            .IsUnique();
        
        builder.HasIndex(u => u.IsDeleted);
    }
}
