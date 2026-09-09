# Scribd Clone: Full-Stack Digital Library & Admin Channel

A full-stack, production-grade document and book reading platform inspired by **Scribd**. Built with **React** (frontend), **Spring Boot 3.3.4** (backend), and persistence powered by **Oracle Database** (with an instant out-of-the-box in-memory fallback for immediate zero-config testing).

---

## 🌟 Highlights & Features

### 1. 🛡️ Dedicated Admin Control Channel
- **Full Administrative Control**: Only accessible by accounts with `ROLE_ADMIN`.
- **Book & PDF Upload Studio**:
  - Drag-and-drop PDF file upload supporting up to 100MB documents.
  - Optional custom book cover image upload.
  - Automatic PDF inspection via **Apache PDFBox** to detect and record page count.
  - Metadata controls: Title, Author, Category, Description, Language, Publication Year.
  - Instant visibility toggle (*Publish Immediately* vs. *Draft*) and homepage showcase (*Feature on Homepage*).
- **Catalog Management Console**:
  - Searchable, filterable table of all uploaded publications.
  - In-place metadata editing.
  - 1-click status toggles: Publish/Unpublish (Eye), Feature on Homepage (Star).
  - Secure deletion of document metadata and physical files.
- **System & Storage Analytics**:
  - Real-time counters: Total Uploaded Books, Published Titles, Total Reads/Views, Total Downloads, and Storage Usage.
- **Category Creator**:
  - Add custom reading categories on the fly.

### 2. 📖 Scribd-Style Interactive Reader
- **Chunked HTTP 206 Byte-Range Streaming**: Books load and start rendering immediately without requiring the client to wait for a 50MB PDF to download entirely.
- **Reader Controls**:
  - Page Navigation: Previous / Next buttons and direct Jump-to-Page number input.
  - Zoom Engine: Zoom Out (-), Reset (100%), Zoom In (+).
  - Reading Modes / Themes:
    - ☀️ **Light Mode**: Crisp white background for daylight reading.
    - ☕ **Sepia Mode**: Warm, eye-friendly paper tone.
    - 🌙 **Night / Dark Mode**: Deep slate background for night reading.
  - Fullscreen viewing toggle.
  - Quick bookmarking & PDF download button.
  - Automatic reading progress tracker that remembers your last read page.

### 3. 📚 Personal Library
- **Saved Books**: Bookmark any book across the catalog to keep in your personal reading list.
- **Reading History**: Automatically tracks every book opened and your progress percentage.

---

## 🚀 Quick Start (Running the Application)

### Option A: 1-Click Launch (Windows)
Double-click `start-all.bat` in the project root:
- Starts Spring Boot on `http://localhost:8080`
- Starts React Vite on `http://localhost:5173`

### Option B: Command Line

#### Terminal 1: Backend
```powershell
cd backend
& "C:\Users\soura\.maven\maven-3.9.16\bin\mvn.cmd" spring-boot:run
```
*(Backend runs on `http://localhost:8080`)*

#### Terminal 2: Frontend
```powershell
cd frontend
npm run dev
```
*(Frontend opens at `http://localhost:5173`)*

---

## 🔑 Pre-Configured Credentials

| Role | Username | Password | Access Capabilities |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full access to Admin Channel, PDF uploads, catalog control, metrics, and reader |
| **Reader** | `user` | `user123` | Explore catalog, full-screen reading, bookmarks, personal library |

> **Tip**: You can also use the **"Demo Admin"** or **"Sign In -> 1-Click Demo Login"** buttons in the navigation bar to log in with zero typing.

---

## 🗄️ Database: Oracle Database Setup

1. **Schema DDL**: `backend/src/main/resources/schema-oracle.sql`
2. **Initial Data**: `backend/src/main/resources/data-oracle.sql`
3. **Oracle Configuration**: `backend/src/main/resources/application-oracle.properties`
4. **Detailed Setup Guide**: See [oracle-database-guide.md](./oracle-database-guide.md) for Docker commands (`gvenzl/oracle-free`), user privileges, and switching `spring.profiles.active=oracle`.

---

## 📂 Project Architecture

```
scribd-clone/
├── backend/
│   ├── src/main/java/com/scribd/clone/
│   │   ├── config/          # WebConfig (CORS), DataInitializer, GlobalExceptionHandler
│   │   ├── controller/      # AdminDocumentController, DocumentController, AuthController, etc.
│   │   ├── dto/             # Request & Response DTOs
│   │   ├── model/           # JPA Entities: User, Document, Category, Bookmark, ReadingHistory
│   │   ├── repository/      # Spring Data JPA Repositories
│   │   ├── security/        # Spring Security, JwtService, JwtAuthenticationFilter
│   │   └── service/         # AdminService, DocumentService, FileStorageService (PDF streaming)
│   ├── src/main/resources/
│   │   ├── application.properties          # Profiles & upload limits
│   │   ├── application-dev.properties      # In-memory H2 Oracle-mode (for zero-setup dev)
│   │   ├── application-oracle.properties   # Production Oracle connection & HikariCP
│   │   ├── schema-oracle.sql               # Complete Oracle DDL
│   │   └── data-oracle.sql                 # Starter seed categories
│   └── pom.xml                             # Spring Boot 3.3.4, Oracle JDBC (ojdbc11), PDFBox, JJWT
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/       # AdminDashboard (Upload Studio, Catalog Table, Stats, Categories)
│   │   │   ├── auth/        # AuthModal (1-Click Demo Logins, Sign In & Sign Up)
│   │   │   ├── catalog/     # BookCard, HeroBanner, CategoryTabs
│   │   │   ├── layout/      # Navbar (Search, Library, Admin Channel toggle)
│   │   │   ├── library/     # UserLibrary (Saved Books, Reading History)
│   │   │   └── reader/      # PdfReaderModal (Interactive Reader, Themes, Zoom, Page Nav)
│   │   ├── services/        # api.js (JWT Axios/Fetch wrapper)
│   │   ├── App.jsx          # Root State Coordinator
│   │   └── index.css        # Scribd-inspired responsive design & themes
│   └── package.json
│
├── run-backend.bat
├── run-frontend.bat
├── start-all.bat
├── oracle-database-guide.md
└── README.md
```
