# DECISION_LOG.md

## 🎯 PURPOSE

Dokumen ini mencatat keputusan penting dalam pengembangan sistem beserta alasannya.

Tujuan:

- Menjaga konsistensi arah pengembangan
- Mencegah perubahan keputusan tanpa alasan jelas
- Memberikan konteks bagi AI agent dan developer

---

## 🧭 FORMAT RULE

Setiap entry harus berisi:

- Tanggal
- Keputusan
- Alasan
- Alternatif yang Dipertimbangkan
- Dampak

---

## 📌 DECISION LIST

---

### 🗓️ 2026-03-19

**Keputusan:**
Menggunakan session-based authentication dengan PostgreSQL session store

**Alasan:**

- Lebih sederhana untuk arsitektur SSR dengan EJS templates
- Tidak membutuhkan token management kompleks
- Session disimpan di PostgreSQL untuk persistence
- Lebih mudah untuk logout dan session invalidation
- Cocok untuk early-stage MVP

**Alternatif yang Dipertimbangkan:**

- JWT → lebih fleksibel untuk API dan mobile, tapi overkill untuk MVP
- In-memory session → tidak persist across restarts, tidak production-ready

**Dampak:**

- Positif:
  - Implementasi lebih cepat
  - Lebih mudah dipahami dan di-maintain
  - Server-side control penuh atas session
  - Cocok dengan EJS rendering

- Negatif:
  - Kurang fleksibel untuk API eksternal di masa depan
  - Memerlukan database untuk session storage

---

### 🗓️ 2026-03-19

**Keputusan:**
Permission-based RBAC (bukan role-based) sejak awal

**Alasan:**

- Memberikan fleksibilitas maksimal untuk permission management
- Tidak tergantung pada hardcoded role names
- Lebih scalable untuk future expansion
- Sesuai dengan best practices dalam sistem keamanan modern

**Alternatif yang Dipertimbangkan:**

- Role-based checks → sederhana tapi tidak fleksibel jika perlu custom permissions

**Dampak:**

- Positif:
  - Granular control atas akses user
  - Mudah menambah/mengurangi permission tanpa code change
  - Sesuai RBAC.md specification

- Negatif:
  - Sedikit lebih kompleks dalam setup awal

---

### 🗓️ 2026-03-19

**Keputusan:**
Menggunakan Prisma ORM untuk database abstraction

**Alasan:**

- Type-safe queries (dengan TypeScript di future)
- Advanced relationship handling dengan clean syntax
- Built-in migration system
- Excellent tooling (Prisma Studio)
- Active community dan good documentation

**Alternatif yang Dipertimbangkan:**

- Raw SQL → lebih performan tapi rentan SQL injection, harder to maintain
- Sequelize → less modern, heavier
- TypeORM → requires TypeScript setup

**Dampak:**

- Positif:
  - Type safety bahkan dengan JavaScript
  - Easy to manage relationships
  - Built-in seed functionality
  - Developer experience yang baik

- Negatif:
  - Sedikit overhead performa tapi negligible untuk MVP

---

### 🗓️ 2026-03-19

**Keputusan:**
Memisahkan struct antara Public Layer, Portal Warga, dan Admin Panel

**Alasan:**

- Clear separation of concerns per ARCHITECTURE.md
- Different permission requirements per area
- Easier to scale each area independently
- Better security isolation

**Alternatif yang Dipertimbangkan:**

- Single monolithic structure → harder to manage different access levels

**Dampak:**

- Positif:
  - Clear boundaries per area
  - Easier RBAC enforcement
  - Better for future scaling

- Negatif:
  - Slightly more routing complexity

---

### 🗓️ 2026-03-19

**Keputusan:**
Memisahkan auth service layer untuk business logic dan auth controller untuk HTTP handling

**Alasan:**

- Clean architecture: separation of concerns
- Business logic bisa di-test tanpa HTTP context
- Service bisa di-reuse oleh controller/CLI/API
- Lebih mudah di-maintain dan extend

**Alternatif yang Dipertimbangkan:**

- Menaruh semua logic di controller → tapi controller akan terlalu kompleks
- Tidak ada service layer → tapi tidak scalable untuk features besar

**Dampak:**

- Positif:
  - Clean separation: service = logic, controller = HTTP
  - Easy to test and maintain
  - Matches ARCHITECTURE.md spec

- Negatif:
  - Sedikit lebih banyak file untuk feature sederhana

---

### 🗓️ 2026-03-19

**Keputusan:**
Redirect berdasarkan role presence (admin → /admin, user → /portal)

**Alasan:**

- Simple implementation sesuai task requirement
- Admin users (super_admin, ketua_rt) memiliki akses ke /admin
- Regular users (warga) pergi ke /portal
- Mudah di-extend di masa depan dengan permission checks

**Alternatif yang Dipertimbangkan:**

- Redirect based on specific permission → lebih granular tapi overcomplicated untuk MVP
- Semua user ke /portal → tidak membedakan admin access

**Dampak:**

- Positif:
  - Clear separation between admin dan user experience
  - Matches ARCHITECTURE.md design

- Negatif:
  - /admin masih placeholder, belum full featured

---

### 🗓️ 2026-03-19

**Keputusan:**
Admin membuat user dengan status='created', user mengaktivasi account via token

**Alasan:**

- Admin tidak perlu tahu password user
- User memiliki control penuh atas password mereka
- Memastikan user punya working email/phone (bisa receive activation link)
- Common pattern di enterprise applications
- Sesuai dengan workflow yang dijelaskan di ARCHITECTURE.md

**Alternatif yang Dipertimbangkan:**

- Auto-generate password dan kirim via email → lebih risky (password in transit), tergantung email system
- User signup sendiri → tidak sesuai requirement (no public registration)

**Dampak:**

- Positif:
  - User password security lebih baik
  - Admin tidak perlu handle password
  - User memiliki activation verification step
  - Flexible activation link delivery (admin bisa share manual)

- Negatif:
  - Memerlukan activation flow implementation

---

### 🗓️ 2026-03-19

**Keputusan:**
Activation token: 64-char crypto-secure random, single-use, 24-hour expiry

**Alasan:**

- 64-char (32 bytes hex) = 2^256 combinations → brute-force impossible
- crypto.randomBytes() = cryptographically secure random
- Single-use (marked used_at) = prevents token replay attacks
- 24-hour expiry = good balance between convenience dan security
- Matches industry standards untuk activation tokens

**Alternatif yang Dipertimbangkan:**

- Shorter token (32 chars) → lebih mudah di-type tapi less secure
- Unlimited expiry → security risk (old tokens bisa activate accounts)
- 1-hour expiry → terlalu ketat, users miss deadline
- Store password in token → security nightmare

**Dampak:**

- Positif:
  - Secure activation workflow
  - Impossible to brute-force
  - Time-limited prevents stale tokens
  - One-time use prevents replay

- Negatif:
  - User perlu activation dalam 24 jam (bisa request resend)
  - Slightly more infrastructure (token storage)

---

### 🗓️ 2026-03-19

**Keputusan:**
Activate user menggunakan Prisma atomic transaction

**Alasan:**

- Ensures user activation dan token marking happen together
- Prevents race condition: activation succeeds tapi token not marked → allow reuse
- ACID guarantees: either both succeed or both fail, no partial update
- Prisma transaction API simple dan reliable

**Alternatif yang Dipertimbangkan:**

- Separate queries → race condition risk
- Database-level triggers → lebih kompleks, harder to test
- Multi-step process dengan retry logic → overcomplicated

**Dampak:**

- Positif:
  - Data consistency guaranteed
  - No race condition risk
  - Simple implementation dengan Prisma

- Negatif:
  - Requires understanding Prisma transaction API

---

### 🗓️ 2026-03-19

**Keputusan:**
User listing pagination: 10 users per page

**Alasan:**

- 10 per page = good balance antara load time dan scrolling
- Matches common web UI patterns
- Easy to adjust later jika needed
- Prevents loading 1000s of users per request

**Alternatif yang Dipertimbangkan:**

- 25 per page → lebih banyak data, tapi heavier page load
- 5 per page → banyak pagination, tapi faster initial load
- No pagination → not scalable jika banyak users

**Dampak:**

- Positif:
  - Fast page load
  - Good UX dengan reasonable data chunks
  - Easy to navigate

- Negatif:
  - Users dengan 10+ users perlu pagination (minor inconvenience)

---

## 🧠 UPDATE RULES

### WAJIB dicatat jika:

- Mengubah arsitektur
- Mengubah flow utama
- Mengganti teknologi
- Mengubah struktur database
- Mengubah RBAC design

---

### TIDAK PERLU dicatat jika:

- Perubahan kecil (UI, typo, dll)
- Refactor minor tanpa perubahan logic

---

## ⚠️ IMPORTANT RULES

### 1. DECISION TIDAK BOLEH DIUBAH SEMBARANGAN

Jika ingin mengubah keputusan lama:

- Harus buat entry baru
- Tidak boleh edit history

---

### 2. AGENT HARUS MENGHORMATI DECISION

Agent tidak boleh:

- Mengganti pendekatan tanpa alasan
- Mengabaikan keputusan yang sudah ada

---

### 3. HARUS JELAS DAN JUJUR

- Jangan terlalu umum
- Jangan terlalu panjang
- Fokus pada inti keputusan

---

## 🎯 EXAMPLE

---

### 🗓️ 2026-03-19

**Keputusan:**
Menggunakan session-based authentication, bukan JWT

**Alasan:**

- Lebih sederhana untuk arsitektur SSR (EJS)
- Tidak membutuhkan token management tambahan
- Lebih mudah di-maintain untuk MVP

**Alternatif yang Dipertimbangkan:**

- JWT → lebih fleksibel untuk API, tapi overkill untuk kebutuhan saat ini

**Dampak:**

- Positif:
  - Implementasi lebih cepat
  - Lebih mudah dipahami

- Negatif:
  - Kurang fleksibel untuk mobile/API di masa depan

---

## 🚀 FINAL RULE

Jika ada perubahan besar tanpa entry di DECISION_LOG.md:

👉 dianggap tidak valid
