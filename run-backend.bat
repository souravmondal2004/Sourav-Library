@echo off
echo ===================================================
echo Starting Scribd Clone Backend (Spring Boot 3.3.4)
echo Java Version: JDK 25 / Target Java 17
echo ===================================================
cd /d "%~dp0backend"
set "MAVEN_OPTS=-Xmx1024m -XX:+UseG1GC"
set "MAVEN_CMD=C:\Users\soura\.maven\maven-3.9.16\bin\mvn.cmd"
if exist "%MAVEN_CMD%" (
    "%MAVEN_CMD%" spring-boot:run
) else (
    mvn spring-boot:run
)
pause
