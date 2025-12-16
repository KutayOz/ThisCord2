FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ThisCord.sln ./
COPY src/ThisCord.API/ThisCord.API.csproj src/ThisCord.API/
COPY src/ThisCord.Application/ThisCord.Application.csproj src/ThisCord.Application/
COPY src/ThisCord.Domain/ThisCord.Domain.csproj src/ThisCord.Domain/
COPY src/ThisCord.Infrastructure/ThisCord.Infrastructure.csproj src/ThisCord.Infrastructure/

RUN dotnet restore ThisCord.sln

COPY src/ src/

RUN dotnet publish src/ThisCord.API/ThisCord.API.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5284
EXPOSE 5284

COPY --from=build /app/publish ./

RUN mkdir -p uploads

ENTRYPOINT ["dotnet", "ThisCord.API.dll"]
