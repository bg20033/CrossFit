FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["StandUpFitness.csproj", "./"]
RUN dotnet restore "StandUpFitness.csproj"
COPY . .
RUN dotnet build "StandUpFitness.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "StandUpFitness.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=publish /app/publish .
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000
ENTRYPOINT ["dotnet", "StandUpFitness.dll"]
