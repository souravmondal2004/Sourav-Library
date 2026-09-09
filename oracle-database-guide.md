# Oracle Database Integration Guide for Scribd Clone

This project is built to seamlessly connect to **Oracle Database** (19c, 21c, 23ai, or Oracle Express Edition XE / Oracle Free) using the official **Oracle JDBC Driver (`ojdbc11`)** and **Hibernate OracleDialect**.

---

## 1. Quick Start with Docker (Recommended)

If you don't have Oracle Database installed locally on Windows, you can launch the lightweight official Oracle Free container in Docker with a single command:

```bash
docker run -d --name oracle-scribd \
  -p 1521:1521 \
  -e ORACLE_PASSWORD=scribd_pass123 \
  gvenzl/oracle-free
```

Wait ~60 seconds for the database service to initialize.

---

## 2. Oracle User & Tablespace Setup

Connect to Oracle using `sqlplus` or Oracle SQL Developer:

```bash
docker exec -it oracle-scribd sqlplus system/scribd_pass123@//localhost:1521/FREEPDB1
```
*(Or for Oracle XE: `@//localhost:1521/XEPDB1`)*

Execute the user setup script:

```sql
ALTER SESSION SET CONTAINER = FREEPDB1;

-- Create application schema user
CREATE USER SCRIBD_USER IDENTIFIED BY scribd_pass123;
GRANT CONNECT, RESOURCE, DBA TO SCRIBD_USER;
GRANT UNLIMITED TABLESPACE TO SCRIBD_USER;
COMMIT;
```

---

## 3. Database Schema (DDL)

The complete Oracle DDL schema is located at:
`backend/src/main/resources/schema-oracle.sql`

It creates the following tables with Oracle sequences, identity columns, foreign keys, and indexes:
- `USERS`: User credentials, roles (`ROLE_ADMIN`, `ROLE_USER`), and profiles.
- `CATEGORIES`: Categorization for books and research papers.
- `DOCUMENTS`: Books and PDFs metadata, file sizes, page counts, streaming paths, and view counts.
- `READING_HISTORY`: Tracks last-read page and reading progress percentage per user.
- `BOOKMARKS`: User bookmarks and notes.

Initial seed categories are in:
`backend/src/main/resources/data-oracle.sql`

---

## 4. Activating Oracle Profile in Spring Boot

Open:
`backend/src/main/resources/application.properties`

Change:
```properties
spring.profiles.active=oracle
```

Review or edit `backend/src/main/resources/application-oracle.properties`:
```properties
spring.datasource.url=jdbc:oracle:thin:@//localhost:1521/FREEPDB1
spring.datasource.username=SCRIBD_USER
spring.datasource.password=scribd_pass123
spring.datasource.driver-class-name=oracle.jdbc.OracleDriver

spring.jpa.database-platform=org.hibernate.dialect.OracleDialect
spring.jpa.hibernate.ddl-auto=update
```

When you start the backend, Spring Boot will automatically connect to your Oracle database instance, verify the tables, and apply any schema migrations.
