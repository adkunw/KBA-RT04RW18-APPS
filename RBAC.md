# RBAC.md

## 🎯 PURPOSE

Dokumen ini mendefinisikan sistem Role-Based Access Control (RBAC), termasuk struktur role, permission, serta aturan penggunaannya.

Semua logic akses WAJIB mengikuti dokumen ini.

---

## 🧠 CORE PRINCIPLE

### ✅ Akses berbasis **permission**, bukan role

Role hanya sebagai grouping.

❌ DILARANG:

```id="bad-rbac"
if (role === 'super_admin')
```

✅ WAJIB:

```id="good-rbac"
if (hasPermission('warga.create'))
```

---

## 🧱 RBAC STRUCTURE

### 1. ROLES

Role adalah kumpulan permission

Contoh:

- super_admin
- ketua_rt
- warga

---

### 2. PERMISSIONS

Permission adalah unit akses terkecil

Format:

```id="perm-format"
resource.action
```

---

### 3. RELATION

- User ↔ Role → many-to-many
- Role ↔ Permission → many-to-many

---

## 🔑 PERMISSION LIST (INITIAL)

### DASHBOARD

- dashboard.view

---

### WARGA MANAGEMENT

- warga.create
- warga.read
- warga.update
- warga.delete

---

### RBAC MANAGEMENT

- role.manage
- permission.manage

---

## 🧩 ROLE DEFAULT MAPPING

### SUPER ADMIN

- Semua permission

---

### KETUA RT

- dashboard.view
- warga.create
- warga.read
- warga.update

---

### WARGA

- (saat ini tidak ada permission khusus)
- hanya akses portal

---

## ⚠️ IMPORTANT RULES

### 1. SUPER ADMIN PROTECTION

- Tidak boleh dihapus
- Tidak boleh kehilangan semua permission

---

### 2. PERMISSION CONSISTENCY

- Tidak boleh duplicate
- Tidak boleh overlap tidak jelas

Contoh buruk:

- warga.manage
- warga.create

👉 pilih salah satu pendekatan, jangan campur

---

### 3. NAMING DISCIPLINE

WAJIB konsisten:

```id="perm-example"
resource.action
```

---

### 4. NO DIRECT ROLE CHECK

Semua akses harus lewat permission

---

## 🔐 ACCESS CONTROL IMPLEMENTATION

### Middleware Pattern

Gunakan middleware:

```id="rbac-middleware"
requirePermission('warga.create')
```

---

### Flow:

1. User login
2. Load roles
3. Load permissions dari roles
4. Simpan di session/context
5. Middleware check permission

---

## 🧠 PERMISSION STRATEGY

### Saat ini:

Gunakan **granular permission**

Contoh:

- warga.create
- warga.read
- warga.update

---

### Hindari:

Permission terlalu general seperti:

- warga.manage

👉 ini bikin kontrol tidak fleksibel

---

## ⚠️ COMMON MISTAKES (DILARANG)

### ❌ 1. Hardcode role

```id="mistake1"
if (user.role === 'admin')
```

---

### ❌ 2. Permission tidak digunakan

Role ada tapi tidak dipakai untuk check

---

### ❌ 3. Permission terlalu banyak

Over-engineering tanpa kebutuhan

---

### ❌ 4. Permission tidak terdokumentasi

Menambah permission tanpa update RBAC.md

---

## 🔄 PERMISSION MANAGEMENT RULE

Setiap penambahan permission WAJIB:

1. Ditambahkan ke database
2. Ditambahkan ke RBAC.md
3. Di-assign ke role (jika perlu)

---

## 🧾 ROLE MANAGEMENT RULE

- Role bisa ditambah/dihapus
- Tapi:
  - Tidak boleh merusak sistem
  - Tidak boleh menghapus super_admin

---

## 🧠 UI/UX RULE

### Admin Panel Button:

- Hanya muncul jika user punya permission:
  - dashboard.view

---

### Route Protection:

- `/admin/*` → wajib permission check

---

## 🔐 SECURITY NOTES

- Permission harus dicek di backend
- Frontend hanya untuk UX, bukan security

---

## 🚀 FUTURE EXPANSION

Kemungkinan tambahan:

### 1. Permission per RT (multi-tenant)

- Scoped permission

---

### 2. Custom Role per RT

- Role tidak global

---

### 3. Temporary Permission

- Permission berbasis waktu

---

## 🎯 FINAL RULE

Jika implementasi RBAC tidak sesuai dokumen ini:

👉 HARUS diperbaiki
👉 BUKAN diabaikan
