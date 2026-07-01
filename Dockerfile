FROM node:20-alpine AS frontend
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps

COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/StandUpFitness.csproj backend/
RUN dotnet restore "backend/StandUpFitness.csproj"

COPY backend/ backend/
WORKDIR /src/backend
RUN dotnet publish "StandUpFitness.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

COPY --from=build /app/publish .
COPY --from=frontend /frontend/dist ./wwwroot

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

EXPOSE 8080
ENTRYPOINT ["dotnet", "StandUpFitness.dll"]
