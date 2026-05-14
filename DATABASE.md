# DATABASE.md

## 🎯 PURPOSE

Dokumen ini mendefinisikan struktur database utama, relasi antar tabel, serta aturan yang harus diikuti oleh sistem.

Semua perubahan schema WAJIB mengacu ke dokumen ini.

---

## 🧱 DATABASE OVERVIEW

Database menggunakan **PostgreSQL** dengan ORM **Prisma**.

Design principle:

- Relasi jelas
- Tidak ada field redundant
- Siap untuk scaling (future multi-tenant)

---

## 📊 MAIN TABLES

### 1. USERS

Menyimpan data utama user (warga & admin)

| Field      | Type     | Notes               |
| ---------- | -------- | ------------------- |
| id         | uuid     | primary key         |
| name       | string   | nama lengkap        |
| phone      | string   | nomor HP            |
| password   | string   | hashed password     |
| status     | enum     | `created`, `active` |
| last_login | datetime | optional            |
| created_at | datetime | auto                |
| updated_at | datetime | auto                |

---

### 2. ROLES

Menyimpan daftar role

| Field | Type   | Notes       |
| ----- | ------ | ----------- |
| id    | uuid   | primary key |
| name  | string | unique      |

---

### 3. PERMISSIONS

Menyimpan daftar permission

| Field | Type   | Notes       |
| ----- | ------ | ----------- |
| id    | uuid   | primary key |
| name  | string | unique      |

---

### 4. USER_ROLES

Relasi many-to-many antara user dan role

| Field   | Type | Notes         |
| ------- | ---- | ------------- |
| user_id | uuid | FK → users.id |
| role_id | uuid | FK → roles.id |

---

### 5. ROLE_PERMISSIONS

Relasi many-to-many antara role dan permission

| Field         | Type | Notes               |
| ------------- | ---- | ------------------- |
| role_id       | uuid | FK → roles.id       |
| permission_id | uuid | FK → permissions.id |

---

### 6. ACTIVATION_TOKENS

Tabel ini menyimpan token unik yang digunakan warga untuk pertama kali aktivasi akun dan set password.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `userId` | String | FK | Reference ke tabel `users` (Cascade delete) |
| `token` | String | UNIQUE | Random string yang dikirim ke user |
| `expiredAt` | DateTime | | Batas waktu berlakunya token (misal: 24 jam) |
| `usedAt` | DateTime? | | Null jika belum dipakai, diisi waktu jika sudah dipakai |
| `createdAt` | DateTime | DEFAULT(now())| Waktu token dibuat |

---

## Fitur Komunikasi (Messages & Announcements)

### Tipe Pesan (`MessageType` Enum)
Digunakan pada tabel `messages` untuk membedakan target pesan.
- `personal`: Dikirim secara personal ke 1 atau beberapa warga tertentu. Masuk ke inbox.
- `broadcast`: Dikirim ke seluruh warga yang berstatus `active`. Masuk ke inbox.
- `announcement`: Pengumuman publik. Tampil di halaman depan Portal warga.

### Pesan (`messages`)
Menyimpan informasi inti dari sebuah pesan atau pengumuman.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `senderId` | String | FK | Reference ke tabel `users` (pengirim pesan) |
| `title` | String | | Judul pesan / pengumuman |
| `content` | String | | Isi lengkap pesan |
| `type` | MessageType | DEFAULT(personal)| Tipe pesan (personal, broadcast, announcement) |
| `createdAt` | DateTime | DEFAULT(now())| Waktu pesan dikirim |
| `updatedAt` | DateTime | updatedAt | Waktu pesan diupdate |

### Penerima Pesan (`message_recipients`)
Menyimpan data penerima pesan (hanya untuk tipe `personal` dan `broadcast`), sekaligus tracking status baca (read receipt).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `messageId` | String | FK | Reference ke `messages` (Cascade delete) |
| `userId` | String | FK | Reference ke `users` sebagai penerima (Cascade delete) |
| `readAt` | DateTime? | | Null jika belum dibaca, diisi waktu pertama kali dibuka |
| `createdAt` | DateTime | DEFAULT(now())| Waktu record dibuat |

**Catatan Relasi:** Kombinasi `[messageId, userId]` bersifat unik. Pesan tipe `announcement` tidak disimpan ke tabel ini.

---

## 🔗 RELATIONSHIP SUMMARY

- User ↔ Role → many-to-many (user_roles)
- Role ↔ Permission → many-to-many (role_permissions)
- User → Activation Token → one-to-many

---

## 🔐 USER STATUS ENUM

```id="7yq9os"
created
active
```

---

## 🔑 PERMISSION NAMING RULE

WAJIB mengikuti format:

```id="d3w8xl"
resource.action
```

Contoh:

- warga.create
- warga.read
- warga.update
- role.manage

---

## ⚠️ CONSTRAINTS (WAJIB)

### USERS

- phone harus unik (opsional tapi disarankan)
- password boleh null saat status `created`
- status default: `created`

---

### ROLES

- name harus unik

---

### PERMISSIONS

- name harus unik
- tidak boleh duplicate logic

---

### USER_ROLES

- kombinasi user_id + role_id harus unik

---

### ROLE_PERMISSIONS

- kombinasi role_id + permission_id harus unik

---

### ACTIVATION_TOKENS

- token harus unik
- hanya boleh digunakan sekali (`used_at`)

---

## 🔄 DEFAULT DATA (SEEDING)

WAJIB ada saat awal setup:

### ROLES

- super_admin
- ketua_rt
- warga

---

### PERMISSIONS (minimal)

- dashboard.view
- warga.create
- warga.read
- warga.update
- warga.delete
- role.manage

---

### SUPER ADMIN

- harus dibuat saat seeding
- memiliki semua permission

---

## 🔐 SECURITY RULES

- Password HARUS di-hash (bcrypt)
- Token activation:
  - random (crypto secure)
  - ada expiry
  - single-use

---

## ⚠️ IMPORTANT DESIGN RULES

### 1. NO HARDCODED ROLE LOGIC

Semua akses berbasis permission, bukan role name

---

### 2. NO REDUNDANT DATA

Jangan simpan:

- role di users
- permission di users

Gunakan relasi

---

### 3. NO DIRECT ACCESS WITHOUT SERVICE

Semua query harus melalui service layer

---

## 🚫 FORBIDDEN CHANGES

Agent TIDAK BOLEH:

- Menambah field tanpa update dokumen ini
- Mengubah relasi tanpa alasan jelas
- Menghapus constraint
- Mengganti tipe data sembarangan

---

## 🚀 FUTURE EXTENSION (REFERENCE)

Belum digunakan sekarang, tapi harus dipertimbangkan:

### Multi-tenant support

Tambahkan:

- `rt_id` di semua tabel utama

---

### Additional Tables (future)

- iuran
- transaksi
- pengumuman

---

## 🎯 FINAL RULE

Jika schema tidak sesuai dokumen ini:

👉 HARUS diperbaiki
👉 BUKAN diabaikan
