# AGENTS.md

## 🎯 PURPOSE

Dokumen ini adalah **aturan utama** yang harus diikuti oleh AI agent saat membaca, menulis, dan mengubah kode dalam project ini.

Agent WAJIB membaca dokumen ini sebelum melakukan task apapun.

---

## 📚 REQUIRED DOCUMENTS TO READ

Sebelum melakukan perubahan kode, agent WAJIB membaca:

- AGENTS.md
- ARCHITECTURE.md
- DATABASE.md
- RBAC.md
- API_SPEC.md

Jika agent tidak membaca dokumen ini → hasil dianggap tidak valid.

---

## 🧱 TECH STACK (LOCKED)

Agent TIDAK BOLEH mengubah atau menambahkan stack tanpa instruksi eksplisit.

- Backend: Node.js (Express)
- View Engine: EJS
- Database: PostgreSQL
- ORM: Prisma

Additional Libraries:

- express-session
- connect-pg-simple
- bcrypt
- zod
- dotenv
- morgan
- winston
- csurf
- express-rate-limit
- connect-flash
- tailwindcss

❌ DILARANG:

- Menambahkan React, Next.js, Vue, atau framework FE lain
- Mengganti session dengan JWT
- Menambahkan dependency tanpa alasan jelas

---

## 🗂️ PROJECT STRUCTURE (WAJIB DIIKUTI)

```
src/
  controllers/
  services/
  routes/
  middlewares/
  views/
  utils/
  prisma/
  config/
```

❌ DILARANG:

- Membuat struktur folder baru tanpa instruksi
- Menaruh semua logic di satu file

---

## 🔐 AUTHENTICATION RULES

- Sistem menggunakan **session-based authentication**
- Password harus di-hash menggunakan bcrypt
- Tidak ada public registration

### User Flow:

1. Admin membuat user (status: `created`)
2. Sistem generate activation token
3. User set password melalui link
4. Status berubah menjadi `active`

---

## 🔑 RBAC (ROLE-BASED ACCESS CONTROL)

### PRINCIPLE:

- Semua akses berbasis **permission**, bukan role

❌ DILARANG:

```
if (role === 'admin')
```

✅ WAJIB:

```
if (hasPermission('warga.create'))
```

---

### PERMISSION NAMING RULE:

Gunakan format:

```
resource.action
```

Contoh:

- warga.create
- warga.read
- warga.update
- role.manage

---

### DEFAULT ROLES:

- super_admin (full access)
- ketua_rt
- warga

---

### CRITICAL RULES:

- super_admin tidak boleh dihapus
- super_admin tidak boleh kehilangan semua permission

---

## 🧠 CODING RULES

### 1. NO IMPROVISATION

Agent TIDAK BOLEH:

- Mengubah struktur tanpa izin
- Mengganti naming convention
- Menambahkan field tanpa referensi DATABASE.md

---

### 2. FOLLOW DOCUMENTATION

Semua logic harus sesuai dengan:

- ARCHITECTURE.md
- DATABASE.md
- RBAC.md

Jika tidak sesuai → harus diperbaiki, bukan diabaikan

---

### 3. CLEAN SEPARATION

- Controller → handle request/response
- Service → business logic
- Middleware → auth, RBAC, validation

❌ DILARANG:

- Business logic di controller
- Query langsung di controller (gunakan service)

---

## 🧪 VALIDATION RULES

Semua input harus divalidasi menggunakan **zod**

❌ DILARANG:

- Menggunakan input langsung tanpa validasi

---

## 🔐 SECURITY RULES

WAJIB:

- CSRF protection aktif untuk semua form
- Rate limit untuk endpoint sensitif (login)
- Session disimpan di PostgreSQL

---

## 🔄 ACTIVATION TOKEN RULES

Token harus:

- Random (crypto secure)
- Memiliki expiry
- Single-use

---

## 🧾 DOCUMENTATION UPDATE RULE

Setiap perubahan WAJIB diikuti update dokumentasi:

| Perubahan  | Dokumen yang harus diupdate |
| ---------- | --------------------------- |
| Schema DB  | DATABASE.md                 |
| Permission | RBAC.md                     |
| Flow       | ARCHITECTURE.md             |
| Endpoint   | API_SPEC.md                 |

---

## 🧪 BEFORE COMMIT CHECKLIST

Agent WAJIB memastikan:

- Tidak ada error
- Code sesuai struktur
- Tidak ada dependency baru tanpa izin
- Dokumentasi sudah update
- Tidak ada file tidak relevan

---

## 🧾 COMMIT RULE

Gunakan format:

```
feat: ...
fix: ...
refactor: ...
```

---

## 🚫 STRICTLY FORBIDDEN

Agent TIDAK BOLEH:

- Menambahkan framework baru
- Mengubah arsitektur tanpa instruksi
- Menghapus fitur existing tanpa alasan jelas
- Mengabaikan dokumentasi
- Membuat asumsi tanpa konfirmasi

---

## 🎯 FINAL PRINCIPLE

Agent harus:

- Konsisten
- Tidak kreatif tanpa arah
- Mengikuti sistem, bukan membuat sistem baru

Jika ragu → STOP dan minta klarifikasi
