# Stage 1: Build JAR using Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Runtime Container
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Create uploads and data directories
RUN mkdir -p /app/uploads/documents /app/uploads/covers /app/data

EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=dev
ENV MALLOC_ARENA_MAX=2
ENTRYPOINT ["java", "-XX:+UseSerialGC", "-Xms64m", "-Xmx192m", "-XX:MaxMetaspaceSize=110m", "-XX:ReservedCodeCacheSize=40m", "-XX:MaxDirectMemorySize=32m", "-XX:CompressedClassSpaceSize=24m", "-Xss384k", "-Dfile.encoding=UTF-8", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
