FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY UserManagment/UserManagment.sln UserManagment/
COPY UserManagment/UserManagment.Gateway/UserManagment.Gateway.csproj UserManagment/UserManagment.Gateway/
RUN dotnet restore UserManagment/UserManagment.Gateway/UserManagment.Gateway.csproj
COPY UserManagment/ UserManagment/
RUN dotnet publish UserManagment/UserManagment.Gateway/UserManagment.Gateway.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "UserManagment.Gateway.dll"]
