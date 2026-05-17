### feat: Step 0 - Full project initialization

- Initialize Node.js project with npm
- Create complete folder structure per ARCHITECTURE.md
- Install all required dependencies (16 packages)
- Create Prisma schema with 7 tables and relationships
- Setup Express.js with middleware (session, logging, CSRF)
- Configure session-based authentication with PostgreSQL
- Implement permission-based RBAC with 3 roles and 7 permissions
- Create controllers for landing, login, portal, logout flows
- Create 7 EJS views with responsive styling
- Create seed script with default admin and all roles/permissions
- Create comprehensive README.md documentation
- Update PROGRESS.md and DECISION_LOG.md

Database:

- Created users, roles, permissions, user_roles, role_permissions, activation_tokens tables
- Default admin: phone=admin, password=admin123 (CHANGE IN PRODUCTION)

RBAC:

- 3 roles: super_admin (all perms), ketua_rt (4 perms), warga (no special perms)
- 7 permissions: dashboard.view, warga.{create/read/update/delete}, role.manage, permission.manage

Next: Admin panel routes and controllers for CRUD operations

### feat: Step 1.1 - Implement login system with authentication service layer

- Create auth.service.js with business logic separation
  - authenticateUser() - Validate phone/password and load roles/permissions
  - createSession() - Store user data in session
  - updateLastLogin() - Record login timestamp
  - getRedirectUrl() - Role-based redirect (admin vs user)
  - destroySession() - Clean session on logout

- Create authController.js with HTTP request handling
  - getLogin() - Render login form with flash messages
  - postLogin() - Authenticate user with Zod validation
  - getLogout() - Handle logout with session destruction

- Create admin infrastructure
  - adminController.js - Admin dashboard controller
  - admin.routes.js - Admin endpoints with dashboard.view permission check
  - admin/dashboard.ejs - Admin dashboard placeholder view

- Create auth.routes.js with dedicated authentication endpoints
  - GET /auth/login - Public login page
  - POST /auth/login - Public login submission
  - GET /auth/logout - Protected logout endpoint

- Implement role-based redirect logic
  - super_admin and ketua_rt → /admin panel
  - warga → /portal dashboard

- Add security and validation
  - Zod schema validation for login inputs
  - Generic error messages (don't reveal user existence)
  - Comprehensive logging for all auth attempts
  - Bcrypt password validation

- Update UI and navigation
  - layout.ejs - Add logout button and user welcome message
  - index.ejs - Update login link to /auth/login
  - Logout button visible for authenticated users (top right)

- Refactor homeController.js
  - Remove auth logic (moved to authController)
  - Keep only landing and portal pages

- Update main routes
  - Mount auth.routes at /auth
  - Mount admin.routes at /admin
  - Maintain existing landing and portal routes

Follows ARCHITECTURE.md service-controller-route pattern
Implements permission-based RBAC per RBAC.md
Uses session-based authentication with PostgreSQL store

### feat: Step 1.2 - Implement user creation and account activation flow

Services:

- Create activation.service.js with token management
  - generateToken() - 64-char crypto-secure random token
  - createActivationToken(userId, expiryHours=24) - Store token with 24hr expiry
  - validateToken(token) - Verify token exists, unused, not expired
  - activateUser(token, password) - Atomic transaction: hash password, activate user, mark token used
  - resendActivationToken(userId) - Invalidate old tokens and create new one

- Create user.service.js with user lifecycle management
  - createUser(userData, roleId) - Create user with status='created', no password, auto-generate activation token
  - getUserById(userId) - Fetch user with roles and permissions
  - getUserByPhone(phone) - User lookup by phone
  - listUsers(skip, take) - Paginated listing (10 per page)
  - countUsers() - Total count for pagination
  - updateUser(userId, updateData) - Generic field updates
  - assignRole(userId, roleId) - Assign role with duplicate prevention
  - removeRole(userId, roleId) - Remove role from user

Controllers:

- Create user.controller.js for admin user management
  - listUsers() - Paginated user list with status badges (green=active, yellow=created)
  - showCreateForm() - Display creation form with available roles
  - createUser() - Handle submission, generate activation token, show confirmation
  - viewUser() - Display user details with roles and permissions
  - All endpoints require warga.read or warga.create permissions

- Create activation.controller.js for public activation flow
  - showActivationForm() - Validate token, show password setup form
  - processActivation() - Validate password match, activate user atomically

Routes:

- Create user.routes.js with admin user management endpoints
  - GET /admin/users - List users (requires warga.read)
  - GET /admin/users/create - Show creation form (requires warga.create)
  - POST /admin/users - Submit new user (requires warga.create)
  - GET /admin/users/:id - View user details (requires warga.read)

- Create activation.routes.js with public activation endpoints
  - GET /activate/:token - Show password setup form
  - POST /activate/:token - Process password submission

Views (8 templates):

- admin/users/index.ejs - User list with pagination and status badges
- admin/users/create.ejs - User creation form with role selector
- admin/users/created.ejs - Creation confirmation with activation link display
- admin/users/view.ejs - User detail view with roles and permissions
- auth/activate.ejs - Account activation form with password fields
- auth/activate-success.ejs - Success confirmation page
- auth/activate-error.ejs - Error handling for invalid/expired/used tokens

Security:

- Implement crypto-secure token generation (32 bytes = 64 hex chars)
- One-time token enforcement via used_at timestamp
- 24-hour token expiry with validation
- Password hashing with bcrypt (10 rounds)
- Atomic Prisma transactions for user activation
- Permission-based access control (warga.create, warga.read)

Configuration:

- Mount user.routes at /admin/users in routes/index.js
- Mount activation.routes at /activate in routes/index.js
- Update admin dashboard link from /admin/members to /admin/users
- Fix create.ejs form action to POST /admin/users (was posting to /admin/users/create)

User Lifecycle:

- Admin creates user (status=created) → Token generated → Link displayed
- User activates via link → Password setup form → Sets password → status=active
- User can login with phone + password → Gets redirected to admin or portal

Implements ARCHITECTURE.md service-controller-route pattern
Follows RBAC.md permission-based access control
Uses session-based authentication
Includes comprehensive error handling and user-friendly messages

### style: Apply UI theme from THEME.md to login, portal, and admin pages

Theme Implementation:

- Define CSS custom properties for consistent color system
  - Primary: #2563EB (blue) with dark/light variants
  - Secondary: #FFFFFF (white)
  - Neutral: grays from #F9FAFB to #111827
  - Status: Success #16A34A, Error #DC2626, Warning #F59E0B

- Update layout.ejs (master template)
  - Add theme color variables for single-source-of-truth
  - Change background: gradient → neutral #F9FAFB
  - Update navigation: shadow, border-bottom, consistent spacing
  - Standardize button styles: primary/secondary with proper hover
  - Improve input focus: blue outline with shadow effect
  - Update typography hierarchy: H1/H2/H3 with proper sizing
  - Fix alert colors: green success, red error, orange warning
  - Update logout button: error red color with hover effect

- Update auth/login.ejs
  - Replace hardcoded colors with theme variables
  - Update demo account info box with theme colors
  - Consistent spacing and typography

- Update portal/index.ejs
  - Welcome card: primary-light background with primary border
  - Feature cards: white background, light shadow, theme colors
  - Coming soon box: warning color for attention
  - Consistent card styling and padding (1.5rem)

- Update admin/dashboard.ejs
  - Welcome card: primary-light background (consistent with portal)
  - All feature cards: standardized colors (removed #ff9800, #764ba2)
  - All action buttons: primary color with hover to primary-dark
  - Warning box: amber color per theme
  - Back button: secondary style with gray theme
  - Better grid layout: minmax(280px) for responsive design

Design Improvements:

- Removed gradient background for professional neutral appearance
- Standardized shadows: light 0 1px 3px instead of heavy shadows
- Modern border-radius: 6-8px instead of 4px
- Consistent spacing system: 4px/8px/16px/24px/32px per THEME.md
- Improved focus states: blue outline for better accessibility
- Card-based layouts: white bg, light shadow, theme border colors
- All components follow THEME.md specification

Follows THEME.md color system, spacing, and component guidelines


### refactor: Enforce strict THEME.md consistency across all UI pages

CRITICAL CHANGES:
- Add mandatory sidebar layout to admin dashboard (260px fixed left)
- Implement admin menu navigation: Dashboard, Warga, Role & Permission
- Add active state styling for menu items (primary blue highlight)

LOGIN PAGE:
- Wrap in centered max-width 420px card container
- Use card-based design with light shadow and border
- Apply THEME colors consistently (no arbitrary colors)

PORTAL PAGE:
- Wrap in max-width 1024px container for proper centering
- Apply consistent 8px/16px/24px spacing grid
- Enforce light shadow (0 1px 3px) on all cards
- Use THEME color palette only

ADMIN DASHBOARD:
- Implement fixed left sidebar (260px width)
- Add admin panel header with "RT Management" title
- Create navigation menu with icons and hover effects
- Reorganize main content with margin-left offset
- Maintain all statistics cards, tools, and activity table

THEME ENFORCEMENT:
- Use only THEME.md color palette (primary, success, error, warning, grays)
- Follow 8px spacing grid consistently (0.5rem, 1rem, 1.5rem, 2rem)
- Apply light shadow (0 1px 3px) to all cards
- Use 8px border-radius for cards, 6px for buttons
- Enforce consistent typography hierarchy (H1/H2/H3)
- All pages feel like same system with unified design language

COMPLIANCE:
✅ All pages follow THEME.md strictly
✅ No colors outside THEME palette
✅ No arbitrary spacing or styling
✅ Sidebar layout per THEME.md requirement
✅ Consistent card design across pages
✅ Professional admin control center with sidebar navigation

### fix: Hotfixes for UI rendering and layout issues

- Remove duplicate content from portal & admin pages caused by malformed HTML replacement
- Fix admin pages CSS not loading by creating a dedicated `admin.css` and converting sidebar to full HTML opener
- Extract sidebar into a reusable partial `_sidebar.ejs` to DRY the code
- Apply consistent theme to all user management pages (create, view, index) following THEME.md guidelines

### feat: Step 2 - Implement Role & Permission Management

- Create role.service.js to handle role CRUD and permission assignment
- Create role.controller.js with validation and proper views
- Setup role.routes.js protected by `role.manage` permission
- Add views for roles list, creation, and detailed view to assign/revoke permissions
- Ensure system safeguards (super_admin cannot be deleted, cannot lose all permissions)

### feat: Step 3 - Implement Messages & Announcements

- Add Message and MessageRecipient models to schema for personal, broadcast, and announcement types
- Update seed.js to include `message.create` and `message.read` permissions
- Create message.service.js and message.controller.js for admin to manage and send messages
- Create portal.controller.js and views for warga to view their inbox and announcements
- Add dynamic unread badges to the portal dashboard
- Setup related routes in message.routes.js and portal.routes.js

### feat: Implement User Profile and Management Enhancements

- Add real-time user statistics and recent members to admin dashboard
- Add Edit User feature in admin panel (update name, phone, status, and role)
- Add Reset Password feature for users to generate new activation tokens
- Create portal profile page view for users

### feat: Step 4 - Implement Document Management System

- Add `Document` model to Prisma schema with relations to `User` (uploader and reviewer)
- Add `DocumentType` (KTP, KK, Surat Keterangan, Other) and `DocumentStatus` (Pending, Approved, Rejected) enums
- Create `document.service.js` and `document.controller.js` to handle document uploads, listing, and approval workflows
- Implement secure file uploads using `multer` with a 5MB size limit and allowed MIME types (JPEG, PNG, PDF)
- Add document submission and viewing interfaces in the Warga Portal (`/portal/documents`)
- Add document management and verification interfaces in the Admin Panel (`/admin/documents`)
- Add new `document.manage` permission and assign it to `super_admin` and `ketua_rt` roles in `seed.js`

### feat: Step 5 - Implement Financial & Dues Management System

- Add `FinancePeriod` and `PaymentReport` models to Prisma schema to handle monthly reporting and user payments.
- Add `finance.manage` permission and a new `bendahara` role in `seed.js`.
- Create `finance.service.js` and `finance.controller.js` handling logic for calculating totals, setting periods, and validating uploads.
- Create `/admin/finance` views for `bendahara` to open/close periods, set fixed dues amount, track paid/unpaid residents, and review payment proofs.
- Create `/portal/finance` views for residents to view their active dues, previous payment history, and dynamically calculate their payments (Fixed Dues, Kas, and Other).
- Configure `multer` for storing payment proofs in `/public/uploads/payments`.

### feat: Step 6 - Implement Lapor RT (Forum) Feature

- Add `Report` and `ReportReply` models to Prisma schema along with `ReportStatus` enum.
- Update `DATABASE.md` and `RBAC.md` to reflect new tables and `report.*` permissions.
- Create `report.service.js` with forum CRUD logic, reply management, and stat aggregation.
- Create `report.controller.js` to handle portal requests for listing, creating, replying, and managing reports.
- Configure routes in `report.routes.js` and mount them at `/portal/reports`.
- Build forum views in `/portal/reports/` (`index.ejs`, `create.ejs`, `detail.ejs`).
- Allow specific roles (super_admin, ketua_rt) and owners to delete/manage posts, while any user can reply.

### feat: Implement RT Expense, Manual Other Income, Upload Proofs, Fuzzy Search, Date-Range CSV Export, Live Date Filter, and Date Range Ordering Validation

- Add `FinanceExpense` and `FinanceIncome` models to Prisma schema to handle RT expense and other manual income records.
- Support `proofFilePath` for both manual other incomes and new expenses as optional transaction receipts.
- Integrate secure file upload logic using `multer` with Allowed MIME Types and size limits to store files securely in `/uploads/payments`.
- Re-architect Admin Finance Dashboard to display interactive glassy widgets for **Total Pemasukan** (citizen payment approvals + other manual incomes), **Total Pengeluaran**, and **Saldo Kas RT**.
- Implement real-time, client-side, interactive fuzzy-search mutations filter box that seamlessly searches through:
  - Tabel Rincian Pemasukan Lain RT
  - Tabel Rincian Pengeluaran Kas RT
  - Mutasi Kas Terbaru Feed
- Add **Live Date-Range Filters** inside the live search panel allowing the user to filter all tables and recent transactions concurrently by start/end dates.
- Enforce strict **Date Range Order Validation** (`endDate >= startDate`) dynamically on client-side (HTML5 `min`/`max` dynamic restriction handlers and live filtering alerts) and server-side (Zod schema `.refine()` check).
- Create form modals with `enctype="multipart/form-data"` and file select support to upload proof of transactions for both incomes and expenses.
- Implement **Date-Range Financial CSV Report Export** (`GET /admin/finance/export`) supporting custom startDate/endDate parameters.
- Generate high-fidelity Excel-compatible CSV reports with Indonesian local date formatting, UTF-8 BOM, and properly formatted semicolons (`;`) for seamless parsing in Microsoft Excel.
- Update `DATABASE.md` and `ARCHITECTURE.md` to document the new manual income schema, live date range searches, and transaction flow updates.