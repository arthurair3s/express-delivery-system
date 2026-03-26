FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["ms-entregadores-cs/ms-entregadores-cs.csproj", "ms-entregadores-cs/"]
COPY ["protos/", "protos/"]

RUN dotnet restore "ms-entregadores-cs/ms-entregadores-cs.csproj"

COPY . .
WORKDIR "/src/ms-entregadores-cs"
RUN dotnet build "ms-entregadores-cs.csproj" -c Release -o /app/build

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/build .
ENTRYPOINT ["dotnet", "ms-entregadores-cs.dll"]