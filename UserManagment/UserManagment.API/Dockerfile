FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY UserManagment/UserManagment.sln UserManagment/
COPY UserManagment/UserManagment.Domain/UserManagment.Domain.csproj UserManagment/UserManagment.Domain/
COPY UserManagment/UserManagment.Application/UserManagment.Application.csproj UserManagment/UserManagment.Application/
COPY UserManagment/UserManagment.Infrastructure/UserManagment.Infrastructure.csproj UserManagment/UserManagment.Infrastructure/
COPY UserManagment/UserManagment.API/UserManagment.API.csproj UserManagment/UserManagment.API/
RUN dotnet restore UserManagment/UserManagment.API/UserManagment.API.csproj
COPY UserManagment/ UserManagment/
RUN dotnet publish UserManagment/UserManagment.API/UserManagment.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p wwwroot/uploads/profiles wwwroot/uploads/documents \
    && chmod -R 777 wwwroot/uploads

EXPOSE 8085
ENTRYPOINT ["dotnet", "UserManagment.API.dll"]
