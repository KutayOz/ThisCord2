using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ThisCord.Domain.Entities;

namespace ThisCord.Infrastructure.Persistence.Configurations;

public class FriendRequestConfiguration : IEntityTypeConfiguration<FriendRequest>
{
    public void Configure(EntityTypeBuilder<FriendRequest> builder)
    {
        builder.HasKey(fr => fr.Id);

        builder.Property(fr => fr.Status)
            .IsRequired();

        builder.HasIndex(fr => new { fr.RequesterId, fr.AddresseeId })
            .IsUnique();

        builder.HasIndex(fr => new { fr.AddresseeId, fr.Status });
        builder.HasIndex(fr => new { fr.RequesterId, fr.Status });

        builder.HasOne(fr => fr.Requester)
            .WithMany()
            .HasForeignKey(fr => fr.RequesterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(fr => fr.Addressee)
            .WithMany()
            .HasForeignKey(fr => fr.AddresseeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
