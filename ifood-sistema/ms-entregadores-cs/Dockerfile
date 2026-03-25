FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["ms-entregadores-cs/ms-entregadores-cs.csproj", "ms-entregadores-cs/"]
COPY ["protos/", "protos/"]

RUN dotnet restore "ms-entregadores-cs/ms-entregadores-cs.csproj"

COPY . .
WORKDIR "/src/ms-entregadores-cs"
RUN dotnet publish "ms-entregadores-cs.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "ms-entregadores-cs.dll"]