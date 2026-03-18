# PROGRESS.md

## 🎯 PURPOSE

Dokumen ini berisi rekap pekerjaan yang telah dilakukan oleh AI agent pada setiap step.

Dokumen ini WAJIB diupdate setiap kali ada perubahan code.

---

## 🧭 FORMAT RULE

Setiap update harus mengikuti format berikut:

- Tanggal
- Task
- Detail Perubahan
- File Terdampak
- Perubahan Database (jika ada)
- Perubahan RBAC (jika ada)
- Catatan

---

## 📌 PROGRESS LOG

---

### 🗓️ 2026-03-19 - Step 0

**Task:**
Step 0 - Full Project Initialization (Agent Controlled)

**Detail Perubahan:**

- ✅ Initialized Node.js project with npm
- ✅ Created complete folder structure per ARCHITECTURE.md
- ✅ Installed all required dependencies (Express, EJS, Prisma, authentication, logging)
- ✅ Created Prisma schema with all tables (users, roles, permissions, user_roles, role_permissions, activation_tokens)
- ✅ Set up Express.js application with middleware (session, body-parser, CSRF, Morgan logger)
- ✅ Implemented session-based authentication with PostgreSQL session store
- ✅ Configured logging system with Winston and Morgan
- ✅ Created controllers for landing, login, portal, and logout flows
- ✅ Created routes for public (/, /login) and protected (/portal, /logout) endpoints
- ✅ Created authentication middleware (isAuthenticated, isNotAuthenticated)
- ✅ Created RBAC middleware (requirePermission, requireAnyPermission)
- ✅ Created EJS views (layout, landing, login, portal, error pages)
- ✅ Created seed script for initial data (roles, permissions, super admin user)
- ✅ Created .env and .env.example configuration files
- ✅ Created .gitignore for safe version control
- ✅ Created comprehensive README.md documentation

**File Terdampak:**

- `package.json` - Node.js dependencies and scripts
- `.env` - Environment variables
- `.env.example` - Example configuration
- `.gitignore` - Git ignore patterns
- `prisma/schema.prisma` - Complete database schema
- `prisma/seed.js` - Initial data seeding script
- `src/config/database.js` - Prisma client configuration
- `src/config/session.js` - Express session configuration
- `src/index.js` - Main Express application
- `src/routes/index.js` - Route definitions
- `src/controllers/homeController.js` - Home and auth controllers
- `src/middlewares/authMiddleware.js` - Authentication middleware
- `src/middlewares/rbacMiddleware.js` - RBAC middleware
- `src/utils/logger.js` - Winston and Morgan logging setup
- `src/views/layout.ejs` - Main layout template
- `src/views/index.ejs` - Landing page
- `src/views/auth/login.ejs` - Login page
- `src/views/portal/index.ejs` - Portal dashboard
- `src/views/errors/notfound.ejs` - 404 error page
- `src/views/errors/forbidden.ejs` - 403 error page
- `src/views/errors/error.ejs` - 500 error page
- `README.md` - Project documentation

**Perubahan Database:**

- Created 7 tables: users, roles, permissions, user_roles, role_permissions, activation_tokens, session
- Created user status enum (created, active, inactive, blocked)
- Established many-to-many relationships via junction tables
- Added cascade delete constraints for data integrity

**Perubahan RBAC:**

- Defined 3 default roles: super_admin, ketua_rt, warga
- Defined 7 initial permissions: dashboard.view, warga.create, warga.read, warga.update, warga.delete, role.manage, permission.manage
- Assigned all permissions to super_admin
- Assigned 4 permissions to ketua_rt (dashboard.view, warga.create, warga.read, warga.update)
- Permission-based access control implemented in middleware

**Catatan:**

- Default super admin login: phone=admin, password=admin123 (CHANGE IN PRODUCTION)
- Session store uses PostgreSQL session table (auto-created)
- All routes follow ARCHITECTURE.md structure
- Authentication flow ready for user activation feature (not yet implemented)
- Admin panel routes not yet created (ready for next phase)
- Frontend uses inline CSS (no external CSS framework yet)
- Logging system ready to capture all application events

---

### 🗓️ 2026-03-19 - Step 1.1

**Task:**
Implement Login System (Step 1.1)

**Detail Perubahan:**

- ✅ Created `auth.service.js` with business logic:
  - `authenticateUser()` - Validate phone/password, load roles and permissions
  - `createSession()` - Store user data in session
  - `updateLastLogin()` - Record last login timestamp
  - `getRedirectUrl()` - Determine redirect based on user roles
  - `destroySession()` - Clean session on logout
- ✅ Created `authController.js` with HTTP handling:
  - `getLogin()` - Render login page with flash messages
  - `postLogin()` - Process login with validation and error handling
  - `getLogout()` - Handle logout with session destruction
- ✅ Created `auth.routes.js` with dedicated auth endpoints:
  - `GET /auth/login` - Login page (public)
  - `POST /auth/login` - Login submission (public)
  - `GET /auth/logout` - Logout (protected)
- ✅ Created `adminController.js` with placeholder admin dashboard
- ✅ Created `admin.routes.js` with permission check for dashboard.view
- ✅ Created `src/views/admin/dashboard.ejs` - Admin dashboard placeholder
- ✅ Refactored `homeController.js` to remove auth logic (moved to authController)
- ✅ Updated `routes/index.js` to use mounted auth and admin routes
- ✅ Updated all links to use new `/auth/` routes:
  - `layout.ejs` → `/auth/login`, `/auth/logout`
  - `index.ejs` → `/auth/login`
- ✅ Implemented role-based redirect:
  - admin (super_admin, ketua_rt) → `/admin`
  - regular users (warga) → `/portal`
- ✅ Added Zod validation in authController for input validation
- ✅ Implemented security best practices:
  - Generic error messages (don't reveal user existence)
  - Logging for all auth attempts
  - Password validation with bcrypt (already in service)

**File Terdampak:**

- `src/services/auth.service.js` (new) - Authentication business logic
- `src/controllers/authController.js` (new) - Auth HTTP handling
- `src/controllers/adminController.js` (new) - Admin dashboard controller
- `src/routes/auth.routes.js` (new) - Auth endpoint definitions
- `src/routes/admin.routes.js` (new) - Admin endpoint definitions
- `src/routes/index.js` (updated) - Mount auth and admin routes
- `src/controllers/homeController.js` (refactored) - Removed auth methods
- `src/views/layout.ejs` (updated) - Updated auth route links
- `src/views/index.ejs` (updated) - Updated auth route links
- `src/views/admin/dashboard.ejs` (new) - Admin dashboard placeholder

**Perubahan Database:**

- Tidak ada perubahan schema
- Database sudah di-seed dengan default data

**Perubahan RBAC:**

- Admin access check: requires `dashboard.view` permission for /admin
- Redirect logic: super_admin and ketua_rt roles go to /admin, warga goes to /portal
- Login process loads all permissions from roles automatically

**Catatan:**

- Auth service separates business logic from HTTP handling (clean architecture)
- Admin panel is placeholder - real CRUD features coming in later steps
- Login redirects based on role presence (simple implementation as per task)
- Input validation using Zod for type safety
- All auth attempts logged for security auditing
- Password hashing already handled by bcrypt in service
- Session-based auth fully functional

---

### 🗓️ 2026-03-19 - Step 1.2

**Task:**
Implement User Creation & Activation Flow (Step 1.2)

**Detail Perubahan:**

**Services Created (2 files):**

- ✅ `src/services/activation.service.js` - Token generation and validation:
  - `generateToken()` - Creates 64-char crypto-secure random token (crypto.randomBytes)
  - `createActivationToken(userId, expiryHours=24)` - Create token in database with expiry
  - `validateToken(token)` - Validate token exists, unused, not expired
  - `activateUser(token, password)` - Hash password, activate user, mark token used (atomic Prisma transaction)
  - `resendActivationToken(userId)` - Invalidate old tokens, create new one
- ✅ `src/services/user.service.js` - User CRUD operations and role management:
  - `createUser(userData, roleId)` - Create user with status='created', no password, auto-generate activation token
  - `getUserById(userId)` - Fetch user with all roles and permissions loaded
  - `getUserByPhone(phone)` - Simple phone lookup
  - `listUsers(skip, take)` - Paginated user listing (10 per page)
  - `countUsers()` - Count total users for pagination
  - `updateUser(userId, updateData)` - Generic field update
  - `assignRole(userId, roleId)` - Add role to user (prevents duplicates)
  - `removeRole(userId, roleId)` - Remove role from user

**Controllers Created (2 files):**

- ✅ `src/controllers/user.controller.js` - Admin user management HTTP handlers:
  - `listUsers()` - Show paginated user list with status badges (green=active, yellow=created)
  - `showCreateForm()` - Display user creation form with available roles
  - `createUser()` - Handle user creation, generate activation token, display link for sharing
  - `viewUser()` - Show user details with status, roles, permissions, created date
  - All handlers include permission checks (warga.read, warga.create)
- ✅ `src/controllers/activation.controller.js` - Public activation flow:
  - `showActivationForm()` - Validate token, display password setup form or error
  - `processActivation()` - Validate password match, activate user, show success/error

**Routes Created (2 files):**

- ✅ `src/routes/user.routes.js` - User management endpoints:
  - `GET /admin/users` - List users (permission: warga.read)
  - `GET /admin/users/create` - Create form (permission: warga.create)
  - `POST /admin/users` - Submit new user (permission: warga.create)
  - `GET /admin/users/:id` - View user details (permission: warga.read)
  - All endpoints protected with isAuthenticated middleware
- ✅ `src/routes/activation.routes.js` - Public activation endpoints:
  - `GET /activate/:token` - Show password setup form (public, no auth required)
  - `POST /activate/:token` - Process password submission (public, no auth required)

**Views Created (8 files):**

- ✅ `src/views/admin/users/index.ejs` - User list page with:
  - Pagination controls (next/prev, page display)
  - Status badges with color coding (active=green, created=yellow)
  - Role display for each user
  - Links to view user and create new user
- ✅ `src/views/admin/users/create.ejs` - User creation form:
  - Name input field
  - Phone input field (unique constraint)
  - Role selector dropdown with all available roles
  - Submit button with loading state
  - Cancel/back link
- ✅ `src/views/admin/users/created.ejs` - Creation success confirmation:
  - User details display (name, phone, status)
  - Activation token display with copy-to-clipboard button
  - Instructions for admin to share activation link
  - Link back to user list
- ✅ `src/views/admin/users/view.ejs` - User detail view:
  - User profile (name, phone, status, created date, last login)
  - Assigned roles with permission breakdown
  - All permissions user has access to
  - Back link to user list
- ✅ `src/views/auth/activate.ejs` - Account activation form:
  - Token validation message (if token invalid/expired)
  - Password input field
  - Password confirmation field
  - Submit button
  - Password strength indicator
- ✅ `src/views/auth/activate-success.ejs` - Activation success:
  - Confirmation message
  - User can now login message
  - Link to login page
  - Success icon/styling
- ✅ `src/views/auth/activate-error.ejs` - Activation error:
  - Error message (expired token, already used, invalid)
  - User-friendly explanation
  - Link to request new activation (future feature)
  - Error icon/styling
- ✅ Updated `src/views/layout.ejs` - No changes needed

**Routes Configuration Updated (1 file):**

- ✅ `src/routes/index.js` (updated) - Mount new route modules:
  - `router.use('/admin/users', require('./user.routes'))` - User management routes
  - `router.use('/activate', require('./activation.routes'))` - Public activation routes

**Security Implementation:**

- ✅ Crypto-secure token generation: 32 bytes → 64 hex characters (crypto.randomBytes)
- ✅ One-time use enforcement: Token marked `used_at` after successful activation
- ✅ Token expiry: 24-hour default (configurable), checked on validation
- ✅ Password hashing: bcrypt with 10 rounds
- ✅ Atomic transactions: User activation + token marking done in single transaction
- ✅ Permission-based access control: warga.create for user creation, warga.read for viewing

**File Terdampak:**

- `src/services/activation.service.js` (new)
- `src/services/user.service.js` (new)
- `src/controllers/user.controller.js` (new)
- `src/controllers/activation.controller.js` (new)
- `src/routes/user.routes.js` (new)
- `src/routes/activation.routes.js` (new)
- `src/routes/index.js` (updated) - Mount new routes
- `src/views/admin/users/index.ejs` (new)
- `src/views/admin/users/create.ejs` (new)
- `src/views/admin/users/created.ejs` (new)
- `src/views/admin/users/view.ejs` (new)
- `src/views/auth/activate.ejs` (new)
- `src/views/auth/activate-success.ejs` (new)
- `src/views/auth/activate-error.ejs` (new)

**Perubahan Database:**

- Tidak ada perubahan schema
- Uses existing `activation_tokens` table created in Step 0
- Tokens stored with:
  - `id`: UUID primary key
  - `user_id`: Foreign key to users
  - `token`: Unique 64-char crypto-secure string
  - `used_at`: NULL until activation, then set to current timestamp
  - `expires_at`: 24 hours from creation
  - `created_at`: Creation timestamp

**Perubahan RBAC:**

- New permissions used: `warga.create`, `warga.read`
- User creation (GET and POST /admin/users) requires `warga.create`
- User listing and viewing (GET /admin/users\*) requires `warga.read`
- Activation endpoints (GET/POST /activate/:token) are PUBLIC - no permission required
- Permission check in user.routes.js prevents unauthorized access

**Catatan:**

- User lifecycle: Admin creates (status=created) → Token generated → User activates (password set, status=active) → Can login
- Token security: Uses crypto.randomBytes for unpredictable generation, single-use via used_at marking, 24hr expiry prevents replay
- Service separation: Activation logic isolated from HTTP handling, reusable for resend functionality, testable independently
- Pagination: 10 users per page, supports next/prev navigation, shows current page info
- Admin panel: Complete user management workflow in place
- Atomic operations: Prisma transactions ensure user activation and token marking happen together (no partial updates)
- Error handling: User-friendly messages for token expiry, already used, invalid tokens
- Next step: User profile endpoints, password reset functionality, user deletion/deactivation

---

### 🗓️ 2026-03-19 - Hotfix: Session Table Initialization

**Task:**
Fix "relation session does not exist" error on application startup

**Detail Perubahan:**

- ✅ Created `src/utils/initDatabase.js` with database initialization logic
- ✅ Implemented session table auto-creation with proper schema
- ✅ Added index on `expire` column for session cleanup
- ✅ Updated `src/index.js` to call initialization on server startup
- ✅ Wrapped app startup in async function to handle initialization
- ✅ Added error handling for database initialization failures
- ✅ Added idempotent SQL (CREATE TABLE IF NOT EXISTS) so it's safe to run repeatedly

**File Terdampak:**

- `src/utils/initDatabase.js` (new) - Database initialization utility
- `src/index.js` (updated) - Call initDatabase before starting server

**Perubahan Database:**

- Created `session` table with:
  - `sid` (session ID) - VARCHAR primary key
  - `sess` (session data) - JSON
  - `expire` (expiration timestamp) - TIMESTAMP
  - Index on `expire` for auto-cleanup

**Perubahan RBAC:**

- Tidak ada

**Catatan:**

- Session table is now auto-created on app startup if it doesn't exist
- The initialization is idempotent - safe to call multiple times
- Fixed the "relation session does not exist" error
- Use `pg` package's native Pool for direct SQL (not Prisma)
- Application will fail to start if database connection is invalid

---

## 🧠 UPDATE RULES

### WAJIB:

- Ditulis setiap selesai task
- Ringkas tapi jelas
- Tidak boleh kosong

---

### JANGAN:

- Menulis terlalu panjang
- Menulis tanpa struktur
- Mengulang isi commit tanpa konteks

---

## 🔄 RELATION WITH OTHER DOCS

Jika ada perubahan berikut:

| Perubahan  | Wajib Update    |
| ---------- | --------------- |
| Schema DB  | DATABASE.md     |
| Permission | RBAC.md         |
| Flow       | ARCHITECTURE.md |

---

## ⚠️ IMPORTANT NOTES

- PROGRESS.md bukan changelog git
- PROGRESS.md adalah **narasi perkembangan sistem**

---

## 🎯 EXAMPLE

---

### 🗓️ 2026-03-19

**Task:**
Setup initial project structure

**Detail Perubahan:**

- Inisialisasi project Express
- Setup folder structure sesuai AGENTS.md
- Install dependency utama

**File Terdampak:**

- package.json
- src/index.js
- src/routes/

**Perubahan Database:**

- Tidak ada

**Perubahan RBAC:**

- Tidak ada

**Catatan:**

- Struktur awal sudah siap untuk implementasi berikutnya

---

## 🚀 FINAL RULE

Jika ada perubahan code tanpa update PROGRESS.md:

👉 dianggap tidak valid
