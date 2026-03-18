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

Digunakan untuk aktivasi akun user

| Field      | Type     | Notes         |
| ---------- | -------- | ------------- |
| id         | uuid     | primary key   |
| user_id    | uuid     | FK → users.id |
| token      | string   | unique        |
| expired_at | datetime | wajib         |
| used_at    | datetime | nullable      |
| created_at | datetime | auto          |

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
