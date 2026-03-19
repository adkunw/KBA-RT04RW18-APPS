# THEME.md

## 🎯 PURPOSE

Dokumen ini mendefinisikan tema visual dan gaya desain aplikasi.

Tujuan:

- Menjaga konsistensi UI
- Membuat tampilan profesional dan estetik
- Memberikan guideline jelas untuk semua halaman (portal & admin)

---

## 🎨 DESIGN PRINCIPLE

Aplikasi harus memiliki tampilan:

- Profesional
- Modern (tidak kaku)
- Clean tapi tetap “hidup”
- Informative (tidak kosong / tidak terlalu minimal)
- Nyaman digunakan oleh warga

---

## 🎨 COLOR SYSTEM

### Primary (Biru)

- primary: #2563EB
- primary-dark: #1E40AF
- primary-light: #DBEAFE

Digunakan untuk:

- Hero section
- Button utama
- Highlight penting

---

### Secondary (Putih)

- white: #FFFFFF
- background: #F9FAFB

---

### Neutral (Gray)

- gray-900 → teks utama
- gray-600 → teks sekunder
- gray-300 → border
- gray-100 → background section

---

### Status

- Success → #16A34A
- Error → #DC2626
- Warning → #F59E0B

---

## 🎨 AESTHETIC RULES (PENTING)

Untuk menjaga estetika:

- Gunakan **card-based layout**
- Gunakan **shadow ringan (soft shadow)**
- Gunakan **border radius medium (rounded-xl)**
- Hindari tampilan flat tanpa depth
- Gunakan whitespace dengan bijak (tidak terlalu rapat, tidak terlalu kosong)

---

## 🔤 TYPOGRAPHY

### Font

- Inter / system-ui

---

### Hierarchy

- H1 → Judul utama (tegas)
- H2 → Subjudul
- Body → teks normal
- Small → informasi tambahan

---

### Rules

- Jangan lebih dari 3 ukuran utama
- Gunakan font weight untuk hierarchy, bukan warna berlebihan

---

## 📐 LAYOUT SYSTEM

### Container

- Max width: 1024px – 1280px
- Centered (untuk portal)

---

### Spacing

Gunakan konsisten:

- 8px / 16px / 24px / 32px

---

### Sectioning

Setiap halaman harus terdiri dari:

- Section jelas
- Tidak satu blok panjang
- Gunakan card untuk grouping

---

## 🧩 COMPONENT STYLE

### Button

Primary:

- Background: biru
- Text: putih
- Hover: lebih gelap

Secondary:

- Border: biru
- Text: biru

---

### Input

- Border: gray-300
- Focus: biru
- Rounded
- Padding cukup

---

### Card

- Background: putih
- Shadow ringan
- Rounded-xl
- Padding cukup (16–24px)

---

### Table

- Clean
- Header tegas
- Row hover effect

---

## 🖥️ PAGE STRUCTURE

---

### 🟢 PORTAL PAGE

Harus memiliki:

1. **Hero Section**
   - Background biru
   - Judul + deskripsi
   - Button action

2. **Quick Action**
   - Grid card (3–4 item)
   - Icon + label

3. **Content Section**
   - Pengumuman / informasi
   - Card list

4. **Optional Side Panel**
   - Kontak darurat
   - Info tambahan

---

### 🔵 ADMIN PANEL (WAJIB SIDEBAR)

Admin TIDAK boleh pakai layout portal.

---

## 🧭 ADMIN LAYOUT

### Structure:

```id="admin-layout"
[ Sidebar ] [ Main Content ]
```

---

### Sidebar

Harus:

- Fixed di kiri
- Background putih / light gray
- Width: 240px – 280px

Isi:

- Logo / Title
- Menu:
  - Dashboard
  - Warga
  - Role & Permission

Style:

- Active menu → highlight biru
- Hover → subtle background

---

### Main Content

- Top bar (opsional: user info)
- Content area:
  - Card-based
  - Section jelas

---

### Dashboard Admin

Minimal:

1. **Summary Cards**
   - Total warga
   - Active
   - Pending

2. **Table / List**
   - Data warga (placeholder)

---

## 🖱️ INTERACTION

### Hover

- Sedikit lebih gelap / highlight

---

### Focus

- Outline biru

---

### Disabled

- Opacity turun
- Cursor not-allowed

---

## 🧠 UX RULES

- Setiap halaman harus punya struktur
- Jangan kosong tanpa purpose
- Jangan over-design
- Prioritaskan clarity

---

## 🚫 FORBIDDEN

- Warna di luar palette
- Layout tanpa struktur
- Sidebar tidak konsisten
- Card tanpa spacing
- UI terlalu kosong

---

## 🚀 FUTURE IMPROVEMENT

- Dark mode
- Custom branding per RT
- Responsive optimization (mobile)

---

## 🎯 FINAL RULE

Semua tampilan WAJIB mengikuti theme ini.

Jika tidak:
👉 dianggap tidak valid
