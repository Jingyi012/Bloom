# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore using project files first so source-only changes keep the NuGet cache.
COPY Bloom.slnx ./
COPY src/Bloom.Api/Bloom.Api.csproj src/Bloom.Api/
COPY src/Bloom.Application/Bloom.Application.csproj src/Bloom.Application/
COPY src/Bloom.Contracts/Bloom.Contracts.csproj src/Bloom.Contracts/
COPY src/Bloom.Domain/Bloom.Domain.csproj src/Bloom.Domain/
COPY src/Bloom.Infrastructure/Bloom.Infrastructure.csproj src/Bloom.Infrastructure/
RUN dotnet restore src/Bloom.Api/Bloom.Api.csproj

COPY src ./src
RUN dotnet publish src/Bloom.Api/Bloom.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080 \
    ImageStorage__RootPath=/data/uploads

COPY --from=build /app/publish .

# The upload directory and Data Protection keys should be mounted by the
# deployment environment so files remain available across container updates.
RUN mkdir -p /data/uploads /app/App_Data/keys
VOLUME ["/data/uploads", "/app/App_Data/keys"]

EXPOSE 8080
ENTRYPOINT ["dotnet", "Bloom.Api.dll"]
