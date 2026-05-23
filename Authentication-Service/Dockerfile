FROM eclipse-temurin:21-jre
WORKDIR /app
COPY Authentication-Service/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
