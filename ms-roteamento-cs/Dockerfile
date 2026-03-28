FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["ms-roteamento-cs/ms-roteamento-cs.csproj", "ms-roteamento-cs/"]
COPY ["protos/", "protos/"]

RUN dotnet restore "ms-roteamento-cs/ms-roteamento-cs.csproj"

COPY . .
WORKDIR "/src/ms-roteamento-cs"
RUN dotnet publish "ms-roteamento-cs.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ms-roteamento-cs.dll"]