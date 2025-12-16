using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ThisCord.Domain.Entities;

namespace ThisCord.Infrastructure.Persistence.Configurations;

public class MemberRoleConfiguration : IEntityTypeConfiguration<MemberRole>
{
    public void Configure(EntityTypeBuilder<MemberRole> builder)
    {
        builder.HasKey(mr => new { mr.MembershipId, mr.RoleId });
        
        builder.HasIndex(mr => mr.RoleId);
        
        builder.HasOne(mr => mr.Membership)
            .WithMany(m => m.MemberRoles)
            .HasForeignKey(mr => mr.MembershipId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(mr => mr.Role)
            .WithMany(r => r.MemberRoles)
            .HasForeignKey(mr => mr.RoleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
