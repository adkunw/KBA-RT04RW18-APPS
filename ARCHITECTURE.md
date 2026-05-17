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

### HOUSE-BASED FINANCE TRACKING & MANUAL PAYMENT MARKING (BENDAHARA)

1. Warga dapat mengisikan detail keluarga dan nomor rumah di menu "My Profile" pada Portal.
2. Bendahara / Super Admin membuka halaman Detail Periode Keuangan (`/admin/finance/period/:id`).
3. Sistem mengelompokkan data warga dan laporan pembayaran secara dinamis **berdasarkan nomor rumah**, bukan berdasarkan individu warga.
4. Sistem menampilkan daftar rekapitulasi iuran per nomor rumah, beserta status pembayarannya (Lunas jika ada salah satu anggota rumah yang lunas, Menunggu, Ditolak, Belum Bayar).
5. Bendahara memilih nomor rumah yang berstatus selain `Lunas` lalu menekan tombol **Tandai Lunas** (sistem menggunakan data warga pertama di rumah tersebut sebagai perwakilan transaksi).
6. Sistem memverifikasi hak akses pengguna (`finance.manage`).
7. Sistem memproses penandaan secara manual:
   - Jika belum pernah melaporkan pembayaran: Sistem membuat data pembayaran baru dengan nominal iuran tetap periode tersebut, metode pembayaran `"manual"`, status `approved`, dan mencatat peninjau (`reviewedBy`) sebagai Bendahara yang sedang bertindak.
   - Jika sudah memiliki laporan pembayaran: Sistem memperbarui data pembayaran terbaru menjadi `approved` dan mencatat bendahara bersangkutan sebagai peninjau beserta waktu persetujuan.
8. Sistem mengalihkan Bendahara kembali ke halaman Detail Periode dengan pesan sukses yang di-flash.

---

### RT FINANCE EXPENSE RECORDING (BENDAHARA)

1. Bendahara / Super Admin masuk ke Admin Finance Dashboard (`/admin/finance`).
2. Sistem menampilkan rekap keuangan RT secara detail:
   - **Total Pemasukan**: Jumlah total nominal pembayaran iuran bulanan warga yang disetujui (`status: "approved"`) ditambah dengan seluruh pemasukan manual lain yang tercatat.
   - **Total Pengeluaran**: Jumlah total nominal pengeluaran dana kas RT yang tercatat.
   - **Saldo Kas RT**: Selisih dari Total Pemasukan dikurangi dengan Total Pengeluaran.
3. Bendahara menekan tombol **Catat Pengeluaran Baru**.
4. Bendahara mengisi rincian pengeluaran di form modal: Nominal (Amount), Kategori, Penerima Dana, Tanggal, Rincian, serta mengunggah **Bukti Transaksi (File Upload - Opsional)** menggunakan `multer`.
5. Sistem memvalidasi data menggunakan **Zod** (`createExpenseSchema`).
6. Sistem memproses unggahan file secara aman ke server lokal `/uploads/payments/` dan menyimpan berkas tersebut.
7. Sistem menyimpan data pengeluaran baru (`FinanceExpense`) dengan tautan file bukti (`proofFilePath`) ke database PostgreSQL.
8. Sistem secara otomatis meregenerasi Mutasi Kas Terbaru dan memperbarui nominal rekap kartu pada dashboard secara real-time.
9. Sistem menampilkan pesan sukses di-flash ke halaman utama keuangan.

---

### RT OTHER MANUAL INCOME RECORDING (BENDAHARA)

1. Bendahara / Super Admin masuk ke Admin Finance Dashboard (`/admin/finance`).
2. Bendahara menekan tombol **Catat Pemasukan Lain**.
3. Bendahara mengisi rincian pemasukan di form modal: Nominal (Amount), Kategori (Donasi, Sponsorship, Dana Hibah, Kas Mandiri, Lain-lain), Sumber Dana, Tanggal, Rincian/Keterangan, serta mengunggah **Bukti Transaksi (File Upload - Opsional)** menggunakan `multer`.
4. Sistem memvalidasi data menggunakan **Zod** (`createIncomeSchema`).
5. Sistem memproses unggahan file secara aman ke server lokal `/uploads/payments/` dan menyimpan berkas tersebut.
6. Sistem menyimpan data pemasukan manual baru (`FinanceIncome`) dengan tautan file bukti (`proofFilePath`) ke database PostgreSQL.
7. Sistem memperbarui Total Pemasukan, Saldo Kas RT, dan meregenerasi linimasa Mutasi Kas Terbaru secara otomatis.
8. Sistem menampilkan pesan sukses di-flash ke halaman utama keuangan.

---

### DYNAMIC CLIENT-SIDE MUTATION SEARCH & LIVE DATE FILTER (BENDAHARA)

1. Bendahara dapat memasukkan kata kunci pencarian di bar input pencarian dan/atau memilih filter **Tanggal Mulai s/d Tanggal Akhir** di bagian kanan atas bar pencarian.
2. Sistem secara instan (*real-time, client-side, zero-latency*) melakukan pencocokan (*matching*):
   - Mencocokkan teks kueri fuzzy terhadap data baris/item.
   - Mencocokkan atribut data tanggal (`data-date="YYYY-MM-DD"`) pada baris/item terhadap rentang tanggal live filter.
3. Sistem menyembunyikan item yang tidak memenuhi kedua kriteria filter di atas dan menyajikan sisa data secara dinamis pada:
   - Tabel Rincian Pemasukan Lain RT
   - Tabel Rincian Pengeluaran Kas RT
   - Lini Masa Mutasi Kas Terbaru
4. Bendahara dapat mengeklik tombol **Reset** untuk langsung membersihkan kata kunci dan live filter tanggal secara serempak.

---

### DATE-RANGE FINANCIAL REPORT EXPORT (BENDAHARA)

1. Bendahara memilih rentang tanggal pencatatan (Tanggal Mulai s/d Tanggal Akhir) di panel ekspor laporan pada dashboard Keuangan.
2. Bendahara menekan tombol **Unduh Laporan (CSV)**.
3. Sistem mengirimkan request `GET /admin/finance/export` dengan parameter query `startDate` dan `endDate`.
4. Sistem memvalidasi parameter menggunakan **Zod** (`exportReportSchema`).
5. Sistem mengambil seluruh mutasi kas terverifikasi yang berada dalam rentang tanggal tersebut:
   - Iuran bulanan warga (`PaymentReport` berstatus `approved` berdasarkan `createdAt`)
   - Pemasukan manual lain (`FinanceIncome` berdasarkan `date`)
   - Pengeluaran dana kas (`FinanceExpense` berdasarkan `date`)
6. Sistem menggabungkan dan menyortir data secara kronologis menaik (ascending) agar mempermudah pembukuan.
7. Sistem menyusun payload berformat CSV menggunakan delimiter titik koma (`;`) yang kompatibel penuh dengan pembacaan tabel Microsoft Excel, menyisipkan UTF-8 BOM (`\uFEFF`) agar huruf tercetak bersih, dan mengembalikan file unduhan sebagai lampiran attachment.

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
