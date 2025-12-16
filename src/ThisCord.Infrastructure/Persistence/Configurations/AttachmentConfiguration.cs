using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ThisCord.Domain.Entities;

namespace ThisCord.Infrastructure.Persistence.Configurations;

public class AttachmentConfiguration : IEntityTypeConfiguration<Attachment>
{
    public void Configure(EntityTypeBuilder<Attachment> builder)
    {
        builder.HasKey(a => a.Id);
        
        builder.Property(a => a.FileName)
            .IsRequired()
            .HasMaxLength(256);
        
        builder.Property(a => a.FileUrl)
            .IsRequired()
            .HasMaxLength(1024);
        
        builder.Property(a => a.ContentType)
            .IsRequired()
            .HasMaxLength(128);
        
        builder.HasIndex(a => a.MessageId);
        
        builder.HasOne(a => a.Message)
            .WithMany(m => m.Attachments)
            .HasForeignKey(a => a.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
