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

| Field          | Type     | Notes                                   |
| -------------- | -------- | --------------------------------------- |
| id             | uuid     | primary key                             |
| name           | string   | nama lengkap                            |
| phone          | string   | nomor HP                                |
| password       | string   | hashed password                         |
| status         | enum     | `created`, `active`                     |
| language       | string   | default: `id`                           |
| last_login     | datetime | optional                                |
| houseNumber    | string   | optional, nomor rumah                   |
| familyDetails  | string   | optional, detail anggota keluarga       |
| birthDate      | string   | optional, tanggal lahir warga (YYYY-MM-DD) |
| nik            | string   | optional, 16 digit NIK warga            |
| kkNumber       | string   | optional, 16 digit Nomor Kartu Keluarga  |
| spouseName     | string   | optional, nama lengkap pasangan         |
| spousePhone    | string   | optional, nomor telepon pasangan        |
| spouseBirthDate| string   | optional, tanggal lahir pasangan        |
| spouseNik      | string   | optional, NIK pasangan                  |
| children       | json     | optional, array data anak [{name, birthDate, nik}] |
| corridorId     | string   | optional, FK → corridors.id             |
| created_at     | datetime | auto                                    |
| updated_at     | datetime | auto                                    |

---

### 1B. CORRIDORS

Menyimpan daftar koridor untuk pengelompokan warga.

| Field       | Type     | Notes                                   |
| ----------- | -------- | --------------------------------------- |
| id          | string   | primary key (cuid)                      |
| name        | string   | unique, nama koridor (cth: G Tengah)    |
| description | string   | optional, deskripsi area koridor        |
| created_at  | datetime | auto                                    |
| updated_at  | datetime | auto                                    |

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

## Fitur Keuangan & Rincian Pengeluaran

### 1. Periode Keuangan (`finance_periods`)
Menyimpan periode tagihan iuran bulanan warga.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `name` | String | | Nama periode (cth: "Juni 2026") |
| `month` | Int | | Bulan periode (1-12) |
| `year` | Int | | Tahun periode |
| `fixedDuesAmount` | Int | | Nominal iuran tetap |
| `isActive` | Boolean | DEFAULT(true) | Status keaktifan periode pembayaran |

### 2. Laporan Pembayaran (`payment_reports`)
Menyimpan bukti pembayaran iuran bulanan dari warga.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `userId` | String | FK | Warga yang mengunggah |
| `periodId` | String | FK | Periode iuran terkait |
| `corridorId`| String?| FK | Mengunci data koridor warga saat iuran dibayar |
| `hasFixedDues` | Boolean | DEFAULT(false) | Bayar iuran tetap bulanan |
| `fixedDuesAmount` | Int | DEFAULT(0) | Nominal iuran tetap dibayar |
| `hasKas` | Boolean | DEFAULT(false) | Bayar kas sukarela |
| `kasAmount` | Int | DEFAULT(0) | Nominal uang kas dibayar |
| `otherDescription` | String? | | Keterangan pembayaran lain |
| `otherAmount` | Int | DEFAULT(0) | Nominal pembayaran lain |
| `totalAmount` | Int | | Total pembayaran |
| `proofFilePath` | String | | Path file bukti transfer |
| `status` | PaymentStatus | DEFAULT(pending) | Status (pending, approved, rejected) |
| `notes` | String? | | Catatan penilai / bendahara |
| `reviewedBy` | String? | FK | Admin/bendahara penilai |
| `reviewedAt` | DateTime? | | Tanggal penilaian |

### 3. Pengeluaran Keuangan (`finance_expenses`)
Menyimpan rincian pencatatan pengeluaran dana kas RT.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `amount` | Int | | Nominal pengeluaran dana kas |
| `description` | String | | Rincian / Keterangan pengeluaran |
| `category` | String | | Kategori (Kebersihan, Keamanan, dll) |
| `recipient` | String | | Penerima dana pengeluaran |
| `date` | DateTime | | Tanggal transaksi pengeluaran |
| `proofFilePath` | String? | | Bukti transaksi pengeluaran (path berkas) |
| `createdById` | String | FK | ID pembuat data (warga/admin) |
| `corridorId` | String?| FK | FK ke `corridors.id` jika pengeluaran koridor |
| `handoverId` | String?| FK | FK ke `finance_handovers.id` jika transaksi dihasilkan dari penyerahan kas |

### 4. Pemasukan Lain-lain (`finance_incomes`)
Menyimpan rincian pencatatan pemasukan manual lain di luar iuran bulanan.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `amount` | Int | | Nominal pemasukan dana |
| `description` | String | | Rincian / Keterangan pemasukan |
| `category` | String | | Kategori (Donasi, Sponsorship, dll) |
| `source` | String | | Sumber dana pemasukan |
| `date` | DateTime | | Tanggal transaksi pemasukan |
| `proofFilePath` | String? | | Bukti transaksi pemasukan (path berkas) |
| `createdById` | String | FK | ID pembuat data (warga/admin) |
| `corridorId` | String?| FK | FK ke `corridors.id` jika pemasukan koridor |
| `handoverId` | String?| FK | FK ke `finance_handovers.id` jika transaksi dihasilkan dari penyerahan kas |

### 4B. Penyerahan Kas Koridor (`finance_handovers`)
Menyimpan data transaksi penyerahan kas dari bendahara/RT ke koordinator koridor per periode tertentu.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `periodId` | String | FK | Reference ke `finance_periods.id` |
| `corridorId` | String | FK | Reference ke `corridors.id` |
| `amountKas` | Int | DEFAULT(0) | Nominal iuran kas sukarela yang diserahkan |
| `amountFixed` | Int | DEFAULT(0) | Nominal iuran wajib tetap yang diserahkan |
| `amountOther` | Int | DEFAULT(0) | Nominal iuran rincian lain yang diserahkan |
| `otherDetails` | Json? | | Rincian detail iuran lain (cth: {"Agustusan": 50000}) |
| `totalAmount` | Int | | Total keseluruhan nominal penyerahan |
| `notes` | String? | | Catatan opsional |
| `handedOverAt` | DateTime | DEFAULT(now()) | Waktu transaksi dilakukan |
| `handedOverBy` | String | FK | Reference ke `users.id` (Bendahara) |

### 5. Sesi Login PostgreSQL (`session`)
Menyimpan sesi login aplikasi untuk keamanan persisten.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `sid` | String | PK | ID Sesi unik |
| `sess` | Json | | Payload detail sesi |
| `expire` | DateTime | | Tanggal kedaluwarsa sesi |

---

## Fitur Lapor RT (Forum)

### Tipe Status Laporan (`ReportStatus` Enum)
- `open`: Laporan baru
- `in_progress`: Sedang ditindaklanjuti
- `resolved`: Sudah diselesaikan
- `closed`: Ditutup (misal karena duplikat atau selesai)

### Laporan (`reports`)
Menyimpan post laporan warga.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `authorId` | String | FK | Reference ke tabel `users` (Cascade delete) |
| `title` | String | | Judul laporan |
| `content` | String | | Isi laporan |
| `mediaPath` | String? | | Path file media (foto/video) jika ada |
| `isAnonymous`| Boolean| DEFAULT(false)| Tampilkan laporan sebagai anonymous (kecuali admin) |
| `status` | ReportStatus | DEFAULT(open)| Status penanganan laporan |
| `createdAt` | DateTime | DEFAULT(now())| Waktu post dibuat |
| `updatedAt` | DateTime | updatedAt | Waktu post diupdate |

### Balasan Laporan (`report_replies`)
Menyimpan komentar/balasan pada sebuah laporan.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, cuid | Primary key |
| `reportId` | String | FK | Reference ke `reports` (Cascade delete) |
| `authorId` | String | FK | Reference ke `users` (Cascade delete) |
| `content` | String | | Isi balasan |
| `mediaPath` | String? | | Path file media (foto/video) jika ada |
| `createdAt` | DateTime | DEFAULT(now())| Waktu balasan dibuat |
| `updatedAt` | DateTime | updatedAt | Waktu balasan diupdate |

---

## System Settings

### Setting (`settings`)
Menyimpan konfigurasi web dinamis seperti info darurat.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `key` | String | PK | Kunci setting (cth: `emergency_phone`) |
| `value` | String | | Nilai setting |
| `updatedAt` | DateTime | updatedAt | |

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
