# 📐 Admin Layout & Component Guidelines (ADMIN_TEMPLATE.md)

Dokumen ini menjelaskan struktur layout, komponen, dan kelas CSS (Tailwind) yang terstandardisasi untuk panel admin **RT 04 RW 18 Kota Baru Arjasari**. 

Seluruh halaman admin baru wajib mengikuti panduan ini agar memiliki visual terpadu, premium, dan responsif.

---

## 🧱 1. Struktur Layout Dasar

Setiap halaman admin terdiri dari komponen sidebar (`_sidebar.ejs`) di bagian kiri dan area konten utama di kanan. Gunakan wrapper standard berikut:

```html
<%- include('../_sidebar.ejs', { currentPage: 'nama_halaman' }) %>

<!-- MAIN CONTENT -->
<main class="admin-main flex flex-col">
  
  <!-- TOP HEADER -->
  <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-40">
    <div class="flex items-center gap-4">
      <h2 class="font-display font-bold text-xl"><%= typeof title !== 'undefined' ? title : 'Admin Panel' %></h2>
    </div>

    <!-- Right Side Actions & Avatar -->
    <div class="flex items-center gap-4">
      <a href="/admin/messages" class="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
        <i data-lucide="bell" class="w-5 h-5"></i>
        <% if (typeof unreadMessages !== 'undefined' && unreadMessages > 0) { %>
          <span class="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
        <% } %>
      </a>
      <div class="h-8 w-px bg-slate-200 mx-1"></div>
      <div class="flex items-center gap-2">
        <% if (typeof user !== 'undefined' && user && user.name) { %>
          <div class="w-8 h-8 rounded-full bg-brand-100 border border-slate-200 flex items-center justify-center text-brand-700 font-bold text-sm">
            <%= user.name.charAt(0).toUpperCase() %>
          </div>
          <span class="text-sm font-semibold hidden lg:block"><%= user.name %></span>
        <% } %>
      </div>
    </div>
  </header>

  <!-- INNER CONTENT CONTAINER (WITH SCROLL) -->
  <div class="p-6 lg:p-8 flex-1 overflow-y-auto">
    <!-- Konten halaman ditaruh di sini -->
  </div>
</main>
```

---

## 🎴 2. Komponen Heading & Breadcrumbs

Untuk navigasi yang jelas dan tombol aksi utama, gunakan format berikut di bagian atas konten halaman:

```html
<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
  <div>
    <!-- Breadcrumb -->
    <a href="/admin/parent" class="text-xs font-semibold text-slate-400 hover:text-brand-600 flex items-center gap-1 mb-1 transition-colors">
      <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i> Kembali ke Parent
    </a>
    <h1 class="text-2xl font-bold tracking-tight text-slate-900">Nama Halaman Detail</h1>
  </div>
  
  <!-- Aksi Utama (Optional) -->
  <div class="flex items-center gap-3">
    <a href="/admin/create" class="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm">
      <i data-lucide="plus" class="w-4 h-4"></i> Tambah Baru
    </a>
  </div>
</div>
```

---

## 📊 3. Grid Statistik Bento (Bento Grid Stats)

Tampilkan metrik data dengan bento grid yang modern dan interaktif:

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <!-- Card Stats -->
  <div class="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
    <div class="flex justify-between items-start mb-4">
      <div class="p-3 bg-brand-50 rounded-2xl">
        <i data-lucide="users" class="text-brand-600 w-6 h-6"></i>
      </div>
    </div>
    <p class="text-2xl font-bold tracking-tight text-slate-900"><%= total %></p>
    <p class="text-sm font-semibold text-slate-900 mb-1">Total Metrik</p>
    <p class="text-xs text-slate-400 font-medium">Metrik tambahan</p>
  </div>
</div>
```

---

## 🗃️ 4. Layout 2 Kolom (Detail / Form / Verifikasi)

Gunakan pembagian layout grid 2 kolom (`2/3` kiri untuk konten/preview, `1/3` kanan untuk aksi & data pendukung) agar mempermudah fokus kerja admin:

```html
<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
  <!-- Sisi Kiri (Kolom Utama - Lebar 2/3) -->
  <div class="lg:col-span-2 space-y-6">
    <div class="bg-white rounded-3xl p-6 lg:p-8 border border-slate-200 shadow-sm">
      <!-- Isi Konten Utama -->
    </div>
  </div>
  
  <!-- Sisi Kanan (Kolom Aksi - Lebar 1/3) -->
  <div class="space-y-6">
    <div class="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
      <!-- Tombol Aksi / Form Review / Formulir Kanan -->
    </div>
  </div>
</div>
```

---

## 🧾 5. Tabel Modern (Modern Clean Tables)

Hapus semua styling tabel berbasis border kaku, ganti dengan tabel modern berlatar belakang putih, padding luas, hover effect, dan container bundar (`overflow-hidden`):

```html
<div class="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-slate-50 border-b border-slate-200">
          <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kolom Utama</th>
          <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
          <th class="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr class="hover:bg-slate-50/50 transition-colors">
          <td class="px-6 py-4">
            <div class="font-semibold text-slate-900">Nama Item</div>
            <div class="text-xs text-slate-400">Deskripsi/Meta item</div>
          </td>
          <td class="px-6 py-4">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Sukses
            </span>
          </td>
          <td class="px-6 py-4 text-right">
            <a href="/admin/view" class="text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors">Detail</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

## 📢 6. Banners & Flash Alerts

Pesan sukses atau error menggunakan desain rounded premium dengan integrasi Lucide Icons:

```html
<!-- Alert Error -->
<% if (typeof error !== 'undefined' && error) { %>
  <div class="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium flex gap-3 items-start">
    <i data-lucide="alert-circle" class="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500"></i>
    <span><%= error %></span>
  </div>
<% } %>

<!-- Alert Sukses -->
<% if (typeof success !== 'undefined' && success) { %>
  <div class="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium flex gap-3 items-start">
    <i data-lucide="check-circle" class="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500"></i>
    <span><%= success %></span>
  </div>
<% } %>
```

---

## 🎨 7. Desain Tombol (Buttons Style Guide)

*   **Tombol Utama (Primary Button)**:
    `bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm`
*   **Tombol Sekunder (Secondary Button)**:
    `bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm`
*   **Tombol Bahaya (Danger Button)**:
    `bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm`
*   **Tombol Filter Kapsul (Pill Filters)**:
    `px-4 py-2 rounded-full text-xs font-semibold border transition-all ...`
