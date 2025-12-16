# ThisCord Deployment Guide

## Proje Yapısı

| Bileşen | Teknoloji | Port |
|---------|-----------|------|
| **Backend API** | .NET 8 + SignalR | 5284 |
| **Frontend** | React + Vite | 5173 |
| **Database** | PostgreSQL | 5432 |

---

## 1. Ücretsiz/Düşük Maliyetli Seçenekler

### Backend (.NET API)

| Platform | Ücretsiz Tier | Özellikler | Dezavantajlar |
|----------|---------------|------------|---------------|
| **Railway** | $5 kredi/ay | PostgreSQL dahil, kolay deploy | Kredi bitince durur |
| **Render** | 750 saat/ay | Auto-deploy, PostgreSQL free | Cold start (spin down) |
| **Fly.io** | 3 VM free | Global edge, WebSocket desteği | Karmaşık config |
| **Azure App Service** | F1 tier free | .NET native, SignalR desteği | 60 dk/gün limit |

### Frontend (React)

| Platform | Ücretsiz | Özellikler |
|----------|----------|------------|
| **Vercel** | ✅ Sınırsız | Auto-deploy, CDN, preview URLs |
| **Netlify** | ✅ Sınırsız | Form handling, functions |
| **Cloudflare Pages** | ✅ Sınırsız | En hızlı CDN, unlimited bandwidth |
| **GitHub Pages** | ✅ Sınırsız | Basit, sadece static |

### Database (PostgreSQL)

| Platform | Ücretsiz Tier |
|----------|---------------|
| **Supabase** | 500MB, 2 projeler |
| **Neon** | 512MB, auto-suspend |
| **Railway** | $5 kredi içinde |
| **ElephantSQL** | 20MB (çok az) |

---

## 2. Önerilen Deployment Stratejisi

### 🏆 En İyi Ücretsiz Kombinasyon

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cloudflare    │────▶│     Render      │────▶│     Neon        │
│     Pages       │     │   (.NET API)    │     │  (PostgreSQL)   │
│   (Frontend)    │     │   + SignalR     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Neden Bu Kombinasyon?
1. **Cloudflare Pages**: Tamamen ücretsiz, en hızlı CDN
2. **Render**: .NET desteği, WebSocket/SignalR çalışır
3. **Neon**: Serverless PostgreSQL, auto-scale

---

## 3. Production Yapılandırması

### Backend için Gerekli Değişiklikler

**`appsettings.Production.json`**
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "${DATABASE_URL}"
  },
  "Jwt": {
    "SecretKey": "${JWT_SECRET}",
    "Issuer": "https://api.thiscord.com",
    "Audience": "https://thiscord.com"
  },
  "AllowedOrigins": [
    "https://thiscord.com",
    "https://www.thiscord.com"
  ]
}
```

**`Program.cs` CORS Güncellemesi**
```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // SignalR için gerekli
    });
});
```

### Frontend için Gerekli Değişiklikler

**`.env.production`**
```env
VITE_API_URL=https://api.thiscord.com
```

**`vite.config.ts`** - Proxy kaldırılmalı (production'da ayrı domain)
```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
```

---

## 4. Render Deployment Adımları

### Backend (Render Web Service)

1. GitHub repo bağla
2. Build Command:
   ```bash
   cd src/ThisCord.API && dotnet publish -c Release -o out
   ```
3. Start Command:
   ```bash
   cd src/ThisCord.API/out && dotnet ThisCord.API.dll
   ```
4. Environment Variables:
   ```
   ASPNETCORE_ENVIRONMENT=Production
   DATABASE_URL=<neon-connection-string>
   JWT_SECRET=<random-256-bit-key>
   ```

### Frontend (Cloudflare Pages)

1. GitHub repo bağla
2. Build settings:
   - Framework preset: Vite
   - Build command: `cd thiscord-client && npm install && npm run build`
   - Build output: `thiscord-client/dist`
3. Environment Variables:
   ```
   VITE_API_URL=https://your-render-app.onrender.com
   ```

---

## 5. Docker ile Self-Hosted

**`docker-compose.production.yml`**
```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: src/ThisCord.API/Dockerfile
    ports:
      - "5000:80"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ConnectionStrings__DefaultConnection=Host=db;Database=thiscord;Username=postgres;Password=${DB_PASSWORD}
    depends_on:
      - db

  frontend:
    build:
      context: ./thiscord-client
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - api

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=thiscord
      - POSTGRES_PASSWORD=${DB_PASSWORD}

volumes:
  postgres_data:
```

### Self-Hosted Platformlar

| Platform | Fiyat | Özellik |
|----------|-------|---------|
| **DigitalOcean** | $4/ay | Basit, Docker ready |
| **Hetzner** | €4/ay | Avrupa'da ucuz |
| **Oracle Cloud** | Free tier | ARM VM free forever |
| **Contabo** | €5/ay | En ucuz VPS |

---

## 6. Güvenlik Kontrol Listesi

- [ ] JWT secret key en az 256-bit
- [ ] HTTPS zorunlu (Cloudflare/Let's Encrypt)
- [ ] CORS doğru yapılandırılmış
- [ ] Rate limiting aktif
- [ ] Database connection string şifreli
- [ ] Environment variables kullanılıyor (hardcode yok)
- [ ] SQL injection koruması (EF Core zaten koruyor)
- [ ] SignalR authentication aktif

---

## 7. Tahmini Maliyetler

### Ücretsiz Başlangıç

| Servis | Maliyet |
|--------|---------|
| Cloudflare Pages | $0 |
| Render (Free) | $0 |
| Neon (Free) | $0 |
| **Toplam** | **$0/ay** |

### Production (100-500 kullanıcı)

| Servis | Maliyet |
|--------|---------|
| Cloudflare Pages | $0 |
| Render (Starter) | $7/ay |
| Neon (Launch) | $19/ay |
| **Toplam** | **~$26/ay** |

### Ölçeklenmiş (1000+ kullanıcı)

| Servis | Maliyet |
|--------|---------|
| Cloudflare Pro | $20/ay |
| Render (Pro) | $25/ay |
| Managed PostgreSQL | $50/ay |
| **Toplam** | **~$95/ay** |

---

## 8. Önerilen İlk Adımlar

1. **Hemen**: Neon'da ücretsiz PostgreSQL oluştur
2. **Hemen**: Environment variables'ı ayarla
3. **1. Hafta**: Render'da backend deploy et
4. **1. Hafta**: Cloudflare Pages'da frontend deploy et
5. **2. Hafta**: Custom domain bağla
6. **2. Hafta**: SSL/HTTPS yapılandır

---

## 9. Faydalı Linkler

- [Render Documentation](https://render.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [Neon PostgreSQL](https://neon.tech/docs)
- [.NET Deployment Guide](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy)
