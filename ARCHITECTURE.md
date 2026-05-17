# ARCHITECTURE.md

## 🎯 PURPOSE

Dokumen ini menjelaskan arsitektur sistem secara menyeluruh, termasuk alur utama aplikasi, pembagian area (portal vs admin), serta interaksi antar komponen.

Semua implementasi WAJIB mengikuti dokumen ini.

---

## 🧱 SYSTEM OVERVIEW

Aplikasi terdiri dari 3 layer utama:

1. **Public Layer**
   - Landing Page
   - Login

2. **Portal Warga (Authenticated User)**
   - Area setelah login
   - Digunakan oleh semua user aktif

3. **Admin Panel (Restricted Access)**
   - Area khusus untuk role tertentu
   - Digunakan untuk management system

---

## 🗺️ ROUTING STRUCTURE

```id="k2v9zp"
/                → Landing Page
/login           → Login Page
/logout          → Logout

/portal          → Portal Warga (default setelah login)

/admin           → Admin Panel
/admin/warga     → CRUD Warga
/admin/roles     → Role Management
/admin/permissions → Permission Management
```

---

## 🔐 AUTHENTICATION FLOW

### USER CREATION

1. Admin membuat user
2. Status user: `created`
3. Sistem generate activation token
4. Token disimpan di database

---

### ACTIVATION FLOW

1. User membuka link activation
2. User mengisi password
3. Sistem:
   - validasi token
   - cek expiry
   - set password (hashed)
   - update status → `active`
   - tandai token sebagai used

---

### LOGIN FLOW

1. User login dengan credential
2. Sistem:
   - validasi user
   - cek status `active`
   - verifikasi password
   - buat session

3. Redirect ke `/portal`

---

### LOGOUT FLOW

1. Destroy session
2. Redirect ke `/login`

---

## 🧑‍🤝‍🧑 USER STATES

User memiliki status:

- `created` → belum aktivasi
- `active` → sudah bisa login

(Optional future)

- `inactive`
- `blocked`

---

## 🔑 AUTHORIZATION (RBAC)

### PRINCIPLE

Semua akses berbasis **permission**, bukan role.

---

### FLOW

1. User login
2. System load:
   - roles user
   - permissions dari roles

3. Set ke session/context

---

### ACCESS CHECK

Setiap request ke protected route:

1. Check login
2. Check permission

---

### EXAMPLE

```id="jdf8x1"
requirePermission('warga.create')
```

---

## 🧭 ACCESS CONTROL MATRIX

| Area         | Akses                  |
| ------------ | ---------------------- |
| Landing Page | Public                 |
| Portal       | Semua user aktif       |
| Admin Panel  | Berdasarkan permission |

---

## 🧩 PORTAL WARGA

### Tujuan:

Menjadi halaman utama user setelah login

### Saat ini:

- Placeholder (belum ada fitur)

### Future:

- Pengumuman (Dinamis dari DB)
- Pesan Inbox Warga
- Iuran
- Informasi RT

---

## 🛠️ ADMIN PANEL

### Tujuan:

Sebagai control center untuk sistem

### Fitur awal:

- CRUD Warga
- Role Management
- Permission Management
- Message & Announcement Management

---

### Rules:

- Tidak semua user bisa akses
- Harus lolos RBAC

---

## 🔄 DATA FLOW (HIGH LEVEL)

### CREATE WARGA

1. Admin input data warga
2. System:
   - simpan user (status: created)
   - assign role: warga
   - generate activation token

---

### BULK IMPORT WARGA (EXCEL/CSV)

1. Admin membuka modal "Import Bulk Warga" di halaman User Management.
2. Admin mengunduh template CSV (`template_bulk_warga.csv`).
3. Admin mengisi data warga (Nama, Telepon, Role) dan mengunggah berkas CSV tersebut.
4. Sistem mem-parsing berkas CSV di memori (menggunakan custom CSV parser tanpa dependensi eksternal).
5. Sistem menyimpan hasil parsing sementara ke session (`req.session.tempImportData`).
6. Sistem mengalihkan admin ke halaman **Review Bulk Import Warga** (`/admin/users/import/review`).
7. Pada halaman review:
   - Sistem membandingkan data dengan database berdasarkan nomor telepon.
   - Data Baru diberi tanda `Baru` (Hijau) dan otomatis tercentang secara default.
   - Data Sudah Ada diberi tanda `Sudah Ada` (Kuning) dan tidak tercentang secara default.
   - Admin memverifikasi nama lama vs nama baru & role lama vs role baru di halaman review.
   - Admin mencentang data yang ingin dimasukkan atau ditimpa (overwrite).
8. Admin memproses import:
   - Untuk data baru: dibuat user baru (status `created`) dan dibuatkan activation token.
   - Untuk data yang sudah ada (jika dicentang): nama & role warga tersebut diperbarui secara transaksional di database.
9. Sistem mengosongkan session sementara dan mengalihkan admin kembali ke daftar user dengan pesan sukses.

---

### ACTIVATE USER

1. User akses link
2. Submit password
3. System update:
   - password
   - status
   - token

---

### LOGIN

1. User submit login
2. System:
   - validasi
   - create session
   - load roles & permissions

---

## 🧠 LAYERED STRUCTURE

### Controller

- Handle HTTP request/response
- Tidak boleh ada business logic kompleks

---

### Service

- Business logic utama
- Validasi lanjutan
- Orkestrasi data

---

### Middleware

- Auth check
- RBAC check
- Validation

---

### Prisma Layer

- Akses database
- Query & mutation

---

## 🔐 SECURITY DESIGN

- Session-based authentication
- CSRF protection
- Password hashing (bcrypt)
- Token activation dengan expiry
- Rate limiting (login)

---

## 🚫 OUT OF SCOPE (SAAT INI)

- Payment gateway
- Notifikasi (email/WA)
- Mobile app
- Multi-tenant (future)

---

## 🎯 DESIGN PRINCIPLES

1. **Simplicity first**
2. **No over-engineering**
3. **Scalable foundation**
4. **Strict separation of concern**
5. **RBAC as core system**

---

## ⚠️ IMPORTANT NOTES

- Portal dan Admin HARUS dipisah
- Tidak boleh ada hardcoded role
- Semua akses berbasis permission
- Semua flow harus mengikuti dokumen ini

---

## 🚀 FUTURE EXPANSION (REFERENCE ONLY)

- Multi-RT support (tenant system)
- Payment integration
- Notification system
- Mobile integration

---

## 🧾 FINAL RULE

Jika implementasi tidak sesuai dengan dokumen ini:

👉 HARUS diperbaiki
👉 BUKAN diabaikan
