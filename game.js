// game.js — Logika permainan Tetris (perbaikan tombol mulai + bug pembuatan piece)

// --- Konstanta dan state ---
// Kunci untuk mengambil data user dari localStorage (harus sama dengan auth.js)
const LS_USER_KEY = "tetoris_user"; // harus sama dengan auth.js
// Jumlah kolom grid Tetris (lebar papan)
const COLS = 10;
// Jumlah baris grid Tetris (tinggi papan)
const ROWS = 20;
// Ukuran satu blok dalam pixel saat permainan (untuk canvas utama)
const UKURAN_BLOK = 30;
// Ukuran satu blok dalam pixel untuk preview piece berikutnya
const UKURAN_BLOK_BERIKUTNYA = 30;

// Objek yang menyimpan warna untuk setiap tipe piece dan elemen UI
const WARNA = {
  I: "#88C0D0", // Warna untuk piece I (biru muda)
  O: "#EBCB8B", // Warna untuk piece O (kuning)
  T: "#B48EAD", // Warna untuk piece T (ungu)
  S: "#A3BE8C", // Warna untuk piece S (hijau)
  Z: "#BF616A", // Warna untuk piece Z (merah)
  J: "#5E81AC", // Warna untuk piece J (biru gelap)
  L: "#D08770", // Warna untuk piece L (oranye)
  KOSONG: "#2E3440", // Warna background grid (gelap)
  GRID: "#3B4252", // Warna garis grid
  OPASITAS_BAYANGAN: 0.3, // Transparansi untuk shadow piece (bayangan)
};

// Objek yang menyimpan bentuk-bentuk Tetris piece beserta rotasinya
// Setiap piece memiliki array berisi berbagai rotasi (0°, 90°, 180°, 270°)
// 1 = blok terisi, 0 = kosong
const BENTUK = {
  // Piece I (garis panjang) - hanya 2 rotasi unik
  I: [
    [[1, 1, 1, 1]], // Rotasi 0: horizontal
    [
      [0, 1, 0, 0], // Rotasi 1: vertical
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
  // Piece O (kotak) - sama di semua rotasi
  O: [
    [
      [1, 1], // Rotasi 0 (dan seterusnya): kotak 2x2
      [1, 1],
    ],
  ],
  // Piece T (bentuk T) - 4 rotasi
  T: [
    [
      [0, 1, 0], // Rotasi 0: T menghadap atas
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0], // Rotasi 1: T menghadap kanan
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0], // Rotasi 2: T menghadap bawah
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0], // Rotasi 3: T menghadap kiri
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  // Piece S (zigzag ke kanan) - 2 rotasi unik
  S: [
    [
      [0, 1, 1], // Rotasi 0: horizontal
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0], // Rotasi 1: vertical
      [0, 1, 1],
      [0, 0, 1],
    ],
  ],
  // Piece Z (zigzag ke kiri) - 2 rotasi unik
  Z: [
    [
      [1, 1, 0], // Rotasi 0: horizontal
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1], // Rotasi 1: vertical
      [0, 1, 1],
      [0, 1, 0],
    ],
  ],
  // Piece J (bentuk L terbalik) - 4 rotasi
  J: [
    [
      [1, 0, 0], // Rotasi 0
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 1], // Rotasi 1
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0], // Rotasi 2
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1, 0], // Rotasi 3
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],
  // Piece L (bentuk L) - 4 rotasi
  L: [
    [
      [0, 0, 1], // Rotasi 0
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0], // Rotasi 1
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0], // Rotasi 2
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 0], // Rotasi 3
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
};

// --- Deklarasi canvas dan konteks rendering ---
let canvas, ctx, canvasBerikutnya, ctxBerikutnya;

// --- State Papan dan Piece ---
let papan = []; // Array 2D berisi grid permainan (ROWS x COLS)
let pieceSekarang = null; // Object piece yang sedang jatuh
let pieceBerikutnya = null; // Object piece yang akan muncul setelah piece sekarang

// --- Statistik Permainan ---
let skor = 0; // Total skor pemain
let level = 1; // Level permainan (meningkat setiap 10 baris)
let baris = 0; // Total baris yang sudah dihapus

// --- State Permainan ---
let permainanBerjalan = false; // Flag: apakah permainan sedang berlangsung
let permainanDijeda = false; // Flag: apakah permainan sedang dijeda

// --- Timing dan Loop ---
let loopPermainan = null; // ID dari requestAnimationFrame untuk game loop
let penghitungJatuh = 0; // Counter untuk timing jatuh piece
let intervalJatuh = 1000; // Interval jatuh dalam ms (semakin besar = lebih lambat)
let waktuTerakhir = 0; // Waktu frame terakhir (untuk delta time)

// --- Kontrol Kesulitan ---
let tingkatKesulitan = 5; // Level 1-10 (10 = tercepat)
let modePermainan = "classic"; // Mode: 'classic' atau 'random' (mutation mode)

// --- Mode Random (Mutation) ---
let penghitungMutasi = 0; // Counter untuk timing mutasi piece
let intervalMutasi = 2000; // Interval mutasi dalam ms

// --- Audio/Musik ---
let musikLatar = null; // Object Audio untuk musik latar
let musikSedangDiputar = false; // Flag: apakah musik sedang diputar

// --- Bag of Pieces (random distribusi) ---
let kantongPiece = []; // Array untuk random distribusi piece (7-bag system)

// Fungsi inisialisasi - dipanggil saat halaman game.html dimuat
function inisialisasi() {
  // Cek apakah kita berada di halaman game.html, jika tidak return
  // Ini untuk menghindari error jika script dijalankan di halaman lain
  if (!location.pathname.endsWith("game.html")) return;

  // Ambil elemen canvas utama dan konteks 2D untuk rendering
  canvas = document.getElementById("gameCanvas");
  ctx = canvas ? canvas.getContext("2d") : null;

  // Ambil elemen canvas preview dan konteks 2D untuk next piece
  canvasBerikutnya = document.getElementById("nextCanvas");
  ctxBerikutnya = canvasBerikutnya ? canvasBerikutnya.getContext("2d") : null;

  // Validasi: pastikan semua canvas ditemukan
  if (!canvas || !ctx || !canvasBerikutnya || !ctxBerikutnya) {
    console.error("Elemen canvas permainan tidak ditemukan.");
    return;
  }

  // Inisialisasi papan permainan dengan array 2D kosong (ROWS x COLS)
  // 0 = kosong, warna = terisi
  papan = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(0));

  // Ambil referensi button-button UI
  const tombolMulai = document.getElementById("startBtn");
  const tombolUlang = document.getElementById("restartBtn");
  const sliderKesulitan = document.getElementById("difficultySlider");

  // Attach event listeners untuk button dan slider
  if (tombolMulai) tombolMulai.addEventListener("click", mulaiPermainan);
  if (tombolUlang) tombolUlang.addEventListener("click", ulangPermainan);
  if (sliderKesulitan)
    sliderKesulitan.addEventListener("input", perbaruiKesulitan);

  // Attach keyboard listener untuk kontrol permainan
  document.addEventListener("keydown", tanganiTekanTombol);

  // Attach event listener untuk radio button mode permainan
  document.querySelectorAll('input[name="gameMode"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      modePermainan = e.target.value;
    });
  });

  // Cek apakah user sudah login (hanya user yang login bisa bermain)
  // Jika user belum login, disable tombol mulai
  if (tombolMulai) {
    const sudahLogin = !!localStorage.getItem(LS_USER_KEY);
    tombolMulai.disabled = !sudahLogin;
    if (!sudahLogin)
      console.info("Tombol mulai dinonaktifkan: pengguna belum login.");
  }

  // Gambar papan dan preview piece pertama
  gambarPapan();
  gambarPieceBerikutnya();
}

// --- Fungsi-Fungsi Utility dan Kontrol ---

// Fungsi callback untuk slider kesulitan - update tingkat kesulitan dan interval jatuh
function perbaruiKesulitan(e) {
  // Parse nilai slider (1-10)
  tingkatKesulitan = parseInt(e.target.value);

  // Update tampilan nilai difficulty di UI
  const elKesulitan = document.getElementById("difficultyValue");
  if (elKesulitan) elKesulitan.textContent = tingkatKesulitan;

  // Jika permainan sedang berjalan, recalculate interval jatuh
  if (permainanBerjalan) perbaruiIntervalJatuh();
}

// Hitung interval jatuh berdasarkan tingkat kesulitan dan level
function perbaruiIntervalJatuh() {
  // Base interval berkurang seiring dengan kesulitan (kesulitan 5 = 600ms, kesulitan 10 = 100ms)
  const intervalDasar = 1100 - tingkatKesulitan * 100;
  // Lebih tinggi level, semakin cepat jatuh (max interval = 100ms minimum)
  intervalJatuh = Math.max(100, intervalDasar - (level - 1) * 50);
}

// Fungsi untuk memulai permainan baru
function mulaiPermainan() {
  // Jika permainan sudah berjalan, jangan mulai lagi
  if (permainanBerjalan) return;

  // Reset papan permainan ke state awal
  papan = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(0));

  // Reset statistik permainan
  skor = 0;
  level = 1;
  baris = 0;

  // Set flag status permainan
  permainanBerjalan = true;
  permainanDijeda = false;

  // Reset counter untuk timing
  penghitungJatuh = 0;
  penghitungMutasi = 0;
  waktuTerakhir = 0;

  // Update tampilan statistik di UI
  perbaruiSkor();
  perbaruiLevel();
  perbaruiBaris();

  // Hitung interval jatuh berdasarkan kesulitan dan level
  perbaruiIntervalJatuh();

  // Sembunyikan game over screen jika ada dari permainan sebelumnya
  const elGameOver = document.getElementById("gameOver");
  if (elGameOver) elGameOver.classList.add("hidden");

  // Perbaikan: buat pieceSekarang kemudian pieceBerikutnya
  // (urutan penting agar preview menampilkan piece yang benar)
  pieceSekarang = buatPiece();
  pieceBerikutnya = buatPiece();

  // Gambar preview piece berikutnya
  gambarPieceBerikutnya();

  // Mulai putar musik latar
  putarMusikLatar();

  // Mulai game loop dengan requestAnimationFrame
  requestAnimationFrame(perbarui);
}

// Fungsi untuk restart permainan (tombol restart)
function ulangPermainan() {
  // Cukup panggil mulaiPermainan lagi
  mulaiPermainan();
}

// Fungsi untuk membuat piece baru dengan random distribusi (7-bag system)
function buatPiece() {
  // Jika kantong kosong, isi dengan semua 7 tipe piece dalam urutan random
  if (kantongPiece.length === 0) {
    // Ambil semua tipe piece (I, O, T, S, Z, J, L)
    kantongPiece = Object.keys(BENTUK);

    // Fisher-Yates shuffle: randomize urutan piece
    for (let i = kantongPiece.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kantongPiece[i], kantongPiece[j]] = [kantongPiece[j], kantongPiece[i]];
    }
  }

  // Pop (ambil) piece dari kantong
  const tipe = kantongPiece.pop();

  // Ambil array bentuk dari konstanta BENTUK
  const bentukArray = BENTUK[tipe];

  // Return object piece dengan properti:
  return {
    type: tipe, // Tipe piece (I, O, T, S, Z, J, L)
    shape: bentukArray[0], // Bentuk awal (rotasi 0)
    rotation: 0, // Indeks rotasi saat ini
    x: Math.floor(COLS / 2) - Math.floor(bentukArray[0][0].length / 2), // Spawn di tengah
    y: 0, // Spawn di atas
    color: WARNA[tipe], // Warna sesuai tipe
  };
}

// Fungsi untuk mengubah piece sekarang secara random (mode random mutation)
function mutasiPieceSekarang() {
  // Hanya berjalan jika mode adalah 'random' dan piece ada
  if (modePermainan !== "random" || !pieceSekarang) return;

  // Pilih tipe piece random dari semua 7 tipe
  const tipeTipe = Object.keys(BENTUK);
  const tipeBaru = tipeTipe[Math.floor(Math.random() * tipeTipe.length)];

  // Ambil bentuk baru dan rotasi random dari tipe baru
  const bentukBaru = BENTUK[tipeBaru];
  const rotasiBaru = Math.floor(Math.random() * bentukBaru.length);

  // Simpan posisi lama jika mutasi menyebabkan tabrakan
  const xLama = pieceSekarang.x;
  const yLama = pieceSekarang.y;

  // Update piece dengan tipe dan bentuk baru
  pieceSekarang.type = tipeBaru;
  pieceSekarang.shape = bentukBaru[rotasiBaru];
  pieceSekarang.rotation = rotasiBaru;
  pieceSekarang.color = WARNA[tipeBaru];

  // Cek apakah mutasi menyebabkan tabrakan
  if (cekTabrakan()) {
    let disesuaikan = false;

    // Coba offset horizontal (-2 sampai +2) untuk menghindari tabrakan
    for (let offset = -2; offset <= 2; offset++) {
      pieceSekarang.x = xLama + offset;
      if (!cekTabrakan()) {
        disesuaikan = true;
        break;
      }
    }

    // Jika masih tabrakan, coba offset vertikal
    if (!disesuaikan) {
      pieceSekarang.x = xLama;
      for (let offset = -2; offset <= 0; offset++) {
        pieceSekarang.y = yLama + offset;
        if (!cekTabrakan()) {
          disesuaikan = true;
          break;
        }
      }
    }

    // Jika masih tabrakan juga, kembalikan ke posisi lama
    if (!disesuaikan) {
      pieceSekarang.y = yLama;
    }
  }

  // Tampilkan warning visual kepada player tentang mutasi
  tampilkanPeringatanMutasi();
}

// Variabel global untuk menyimpan elemen warning mutasi
let elemenPeringatanMutasi = null;

// Fungsi untuk menampilkan visual warning ketika piece bermutasi
function tampilkanPeringatanMutasi() {
  // Hapus warning lama jika masih ada
  if (elemenPeringatanMutasi) elemenPeringatanMutasi.remove();

  // Buat elemen div untuk warning
  elemenPeringatanMutasi = document.createElement("div");
  elemenPeringatanMutasi.className = "mutation-warning";
  elemenPeringatanMutasi.textContent = "⚡ BENTUK BERUBAH!";

  // Tambahkan ke game-area agar muncul di atas game
  const ga = document.querySelector(".game-area");
  if (ga) ga.appendChild(elemenPeringatanMutasi);

  // Auto-remove warning setelah 1 detik
  setTimeout(() => {
    if (elemenPeringatanMutasi) {
      elemenPeringatanMutasi.remove();
      elemenPeringatanMutasi = null;
    }
  }, 1000);
}

// Fungsi main game loop - dipanggil setiap frame dengan requestAnimationFrame
function perbarui(waktu = 0) {
  // Jika permainan tidak berjalan atau sedang dijeda, stop loop
  if (!permainanBerjalan || permainanDijeda) return;

  // Hitung delta time sejak frame terakhir
  const deltaWaktu = waktu - waktuTerakhir;
  waktuTerakhir = waktu;

  // Tambah counter jatuh dengan delta time
  penghitungJatuh += deltaWaktu;

  // Jika mode random, handle mutasi
  if (modePermainan === "random") {
    penghitungMutasi += deltaWaktu;
    if (penghitungMutasi >= intervalMutasi) {
      mutasiPieceSekarang();
      penghitungMutasi = 0; // Reset counter
    }
  }

  // Jika counter jatuh exceed interval, gerakkan piece ke bawah
  if (penghitungJatuh > intervalJatuh) {
    gerakKeBawah();
    penghitungJatuh = 0; // Reset counter
  }

  // Rendering: gambar papan, shadow, dan piece
  gambarPapan();
  if (pieceSekarang) {
    gambarPieceBayangan(pieceSekarang); // Gambar shadow/preview posisi akhir
    gambarPiece(pieceSekarang); // Gambar piece aktual
  }

  // Lanjutkan game loop di frame berikutnya
  loopPermainan = requestAnimationFrame(perbarui);
}

// Fungsi handler untuk keyboard input
function tanganiTekanTombol(e) {
  // Jika permainan tidak berjalan atau dijeda, hanya bisa tekan 'P' untuk pause
  if (!permainanBerjalan || permainanDijeda) {
    if (e.key === "p" || e.key === "P") toggleJeda();
    return;
  }

  // Switch berdasarkan tombol yang ditekan
  switch (e.key) {
    case "ArrowLeft": // Panah kiri: gerak ke kiri
      gerakKeKiri();
      break;
    case "ArrowRight": // Panah kanan: gerak ke kanan
      gerakKeKanan();
      break;
    case "ArrowDown": // Panah bawah: soft drop (gerak ke bawah 1 langkah)
      gerakKeBawah();
      break;
    case "ArrowUp": // Panah atas: rotate piece
      putar();
      break;
    case " ": // Spacebar: hard drop (jatuh langsung ke bawah)
      jatuhCepat();
      break;
    case "p":
    case "P": // 'P': toggle pause
      toggleJeda();
      break;
  }
  // Prevent default behavior (scrolling, dll)
  e.preventDefault();
}

// Fungsi untuk toggle pause/resume
function toggleJeda() {
  // Jika permainan tidak berjalan, return
  if (!permainanBerjalan) return;

  // Toggle flag dijeda
  permainanDijeda = !permainanDijeda;

  // Jika di-resume, reset timer dan lanjutkan loop
  if (!permainanDijeda) {
    waktuTerakhir = performance.now();
    requestAnimationFrame(perbarui);
  }
}

// --- Fungsi-Fungsi Pergerakan Piece ---

// Gerakkan piece ke kiri
function gerakKeKiri() {
  if (!pieceSekarang) return;

  // Kurangi x koordinat
  pieceSekarang.x--;

  // Jika ada tabrakan, kembalikan ke posisi sebelumnya
  if (cekTabrakan()) pieceSekarang.x++;
  else {
    // Jika berhasil, redraw
    gambarPapan();
    gambarPieceBayangan(pieceSekarang);
    gambarPiece(pieceSekarang);
  }
}

// Gerakkan piece ke kanan
function gerakKeKanan() {
  if (!pieceSekarang) return;

  // Tambah x koordinat
  pieceSekarang.x++;

  // Jika ada tabrakan, kembalikan ke posisi sebelumnya
  if (cekTabrakan()) pieceSekarang.x--;
  else {
    // Jika berhasil, redraw
    gambarPapan();
    gambarPieceBayangan(pieceSekarang);
    gambarPiece(pieceSekarang);
  }
}

// Gerakkan piece ke bawah (soft drop / step down)
function gerakKeBawah() {
  if (!pieceSekarang) return;

  // Tambah y koordinat (move down)
  pieceSekarang.y++;

  // Cek apakah terjadi tabrakan
  if (cekTabrakan()) {
    // Jika tabrakan, mundur 1 langkah (piece berhenti)
    pieceSekarang.y--;

    // Lock piece (masukkan ke papan)
    kunciPiece();

    // Cek dan hapus completed lines
    hapusBaris();

    // Munculkan piece baru
    munculkanPieceBaru();
  }
}

// Rotate piece ke arah clockwise
function putar() {
  if (!pieceSekarang) return;

  // Ambil array bentuk dari konstanta
  const bentukArray = BENTUK[pieceSekarang.type];

  // Hitung indeks rotasi berikutnya (0->1->2->3->0)
  const rotasiBerikutnya = (pieceSekarang.rotation + 1) % bentukArray.length;

  // Simpan bentuk lama untuk restore jika ada tabrakan
  const bentukSebelumnya = pieceSekarang.shape;

  // Update shape dan rotation
  pieceSekarang.shape = bentukArray[rotasiBerikutnya];
  pieceSekarang.rotation = rotasiBerikutnya;

  // Jika ada tabrakan setelah rotate, revert kembali
  if (cekTabrakan()) {
    pieceSekarang.shape = bentukSebelumnya;
    pieceSekarang.rotation =
      (rotasiBerikutnya - 1 + bentukArray.length) % bentukArray.length;
  } else {
    // Jika rotate berhasil, redraw
    gambarPapan();
    gambarPieceBayangan(pieceSekarang);
    gambarPiece(pieceSekarang);
  }
}

// Hard drop: langsung jatuh ke bawah sampai akhir
function jatuhCepat() {
  if (!pieceSekarang) return;

  // Loop: gerakkan ke bawah sampai ada tabrakan
  while (!cekTabrakan()) pieceSekarang.y++;

  // Mundur 1 (agar tidak overlapping dengan piece lain)
  pieceSekarang.y--;

  // Lock piece
  kunciPiece();

  // Hapus lines dan spawn piece baru
  hapusBaris();
  munculkanPieceBaru();
}

// --- Fungsi-Fungsi Logic Papan ---

// Cek apakah piece sekarang bertabrakan dengan papan atau batas
function cekTabrakan() {
  const bentuk = pieceSekarang.shape;

  // Loop setiap blok dalam shape
  for (let y = 0; y < bentuk.length; y++) {
    for (let x = 0; x < bentuk[y].length; x++) {
      // Hanya cek jika ada blok (1 dalam array)
      if (bentuk[y][x]) {
        const xBaru = pieceSekarang.x + x;
        const yBaru = pieceSekarang.y + y;

        // Cek out of bounds (kiri, kanan, bawah)
        if (xBaru < 0 || xBaru >= COLS || yBaru >= ROWS) return true;

        // Cek collision dengan piece yang sudah locked
        if (yBaru >= 0 && papan[yBaru][xBaru]) return true;
      }
    }
  }
  return false;
}

// Lock piece sekarang ke papan (tetap permanen di papan)
function kunciPiece() {
  const bentuk = pieceSekarang.shape;

  // Loop setiap blok dalam shape
  for (let y = 0; y < bentuk.length; y++) {
    for (let x = 0; x < bentuk[y].length; x++) {
      // Jika ada blok, masukkan ke papan
      if (bentuk[y][x]) {
        const yPapan = pieceSekarang.y + y;
        const xPapan = pieceSekarang.x + x;

        // Pastikan koordinat valid sebelum assign
        if (yPapan >= 0) papan[yPapan][xPapan] = pieceSekarang.color;
      }
    }
  }
}

// Cek dan hapus completed lines (full rows)
function hapusBaris() {
  let barisDihapus = 0;

  // Loop dari bawah ke atas (untuk hindari skip rows saat splice)
  for (let y = ROWS - 1; y >= 0; y--) {
    // Cek apakah semua kolom dalam baris y penuh (tidak ada 0)
    if (papan[y].every((sel) => sel !== 0)) {
      // Hapus baris yang penuh
      papan.splice(y, 1);

      // Tambah baris kosong di atas
      papan.unshift(Array(COLS).fill(0));

      // Increment counter baris dihapus
      barisDihapus++;

      // Decrement y agar tidak skip (karena splice menggeser array)
      y++;
    }
  }

  // Jika ada baris dihapus, update skor dan level
  if (barisDihapus > 0) {
    baris += barisDihapus;

    // Tabel poin: [0, 1-line, 2-line, 3-line, 4-line]
    const poin = [0, 100, 300, 500, 800];

    // Kesulitan multiplier: semakin tinggi kesulitan, semakin besar poin
    const penggandaKesulitan = 1 + (tingkatKesulitan - 1) * 0.2;

    // Hitung total skor dengan multiplier level
    skor += Math.floor(poin[barisDihapus] * level * penggandaKesulitan);

    // Update level (naik 1 level setiap 10 baris)
    level = Math.floor(baris / 10) + 1;

    // Update tampilan UI
    perbaruiSkor();
    perbaruiLevel();
    perbaruiBaris();

    // Recalculate interval jatuh (semakin tinggi level, semakin cepat)
    perbaruiIntervalJatuh();
  }
}

// Munculkan piece baru dan cek game over
function munculkanPieceBaru() {
  // Set piece sekarang = piece berikutnya
  pieceSekarang = pieceBerikutnya;

  // Generate piece berikutnya
  pieceBerikutnya = buatPiece();

  // Reset mutation counter jika mode random
  if (modePermainan === "random") penghitungMutasi = 0;

  // Update preview tampilan
  gambarPieceBerikutnya();

  // Cek apakah piece baru langsung bertabrakan (game over condition)
  if (cekTabrakan()) permainanSelesai();
}

// Fungsi saat permainan selesai (game over)
function permainanSelesai() {
  // Set flag permainan berhenti
  permainanBerjalan = false;
  permainanDijeda = false;

  // Cancel animation frame loop
  if (loopPermainan) cancelAnimationFrame(loopPermainan);

  // Hentikan musik latar
  hentikanMusikLatar();

  // Hapus mutation warning jika masih ada
  if (elemenPeringatanMutasi) {
    elemenPeringatanMutasi.remove();
    elemenPeringatanMutasi = null;
  }

  // Update final score di game over screen
  const elSkorAkhir = document.getElementById("finalScore");
  if (elSkorAkhir) elSkorAkhir.textContent = skor;

  // Tampilkan game over screen
  const elGameOver = document.getElementById("gameOver");
  if (elGameOver) elGameOver.classList.remove("hidden");

  // Simpan skor ke leaderboard via auth.js
  try {
    // Cek user sekarang dari auth.js function atau fallback localStorage
    const pemain =
      (window.getCurrentPlayer && window.getCurrentPlayer()) ||
      localStorage.getItem(LS_USER_KEY) ||
      "Guest";

    // Jika function addScoreToLeaderboard ada (dari auth.js), gunakan
    if (typeof window.addScoreToLeaderboard === "function") {
      window.addScoreToLeaderboard(pemain || "Guest", skor);
      // Update tampilan leaderboard
      if (typeof window.renderLeaderboard === "function")
        window.renderLeaderboard();
    } else {
      // Fallback: simpan langsung ke localStorage dengan format sama seperti auth.js
      const raw = localStorage.getItem("tetoris_leaderboard");
      let lb = [];
      try {
        lb = raw ? JSON.parse(raw) : [];
      } catch (e) {
        lb = [];
      }

      // Tambah entry baru
      lb.push({
        name: pemain,
        score: skor,
        date: new Date().toISOString(),
      });

      // Sort by score desc, kemudian by date desc
      lb.sort(
        (a, b) => b.score - a.score || new Date(b.date) - new Date(a.date)
      );

      // Ambil hanya top 10
      localStorage.setItem(
        "tetoris_leaderboard",
        JSON.stringify(lb.slice(0, 10))
      );
    }
  } catch (err) {
    console.warn("Error menyimpan leaderboard", err);
  }
}

// --- Fungsi-Fungsi Rendering ---

// Gambar papan permainan beserta grid
function gambarPapan() {
  if (!ctx) return;

  // Clear canvas dengan warna background
  ctx.fillStyle = WARNA.KOSONG;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gambar garis grid
  ctx.strokeStyle = WARNA.GRID;
  ctx.lineWidth = 1;

  // Loop setiap cell dan gambar
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      // Gambar border grid
      ctx.strokeRect(
        x * UKURAN_BLOK,
        y * UKURAN_BLOK,
        UKURAN_BLOK,
        UKURAN_BLOK
      );

      // Jika ada piece di cell ini, gambar blok
      if (papan[y][x]) gambarBlok(x, y, papan[y][x], ctx, UKURAN_BLOK);
    }
  }
}

// Gambar piece yang sedang jatuh
function gambarPiece(piece) {
  if (!piece) return;

  const bentuk = piece.shape;

  // Loop setiap blok dalam shape
  for (let y = 0; y < bentuk.length; y++) {
    for (let x = 0; x < bentuk[y].length; x++) {
      // Hanya gambar jika ada blok (1)
      if (bentuk[y][x])
        gambarBlok(piece.x + x, piece.y + y, piece.color, ctx, UKURAN_BLOK);
    }
  }
}

// Fungsi helper untuk mendapatkan posisi final piece jika hard drop
function dapatkanPosisiPieceBayangan(piece) {
  // Buat copy piece untuk testing
  const pieceBayangan = { ...piece, y: piece.y };

  // Gerakkan ke bawah sampai ada tabrakan
  while (!cekTabrakanUntukPiece(pieceBayangan)) pieceBayangan.y++;

  // Mundur 1 langkah
  pieceBayangan.y--;
  return pieceBayangan;
}

// Cek tabrakan untuk piece arbitrary (untuk shadow calculation)
function cekTabrakanUntukPiece(piece) {
  const bentuk = piece.shape;
  for (let y = 0; y < bentuk.length; y++) {
    for (let x = 0; x < bentuk[y].length; x++) {
      if (bentuk[y][x]) {
        const xBaru = piece.x + x;
        const yBaru = piece.y + y;
        if (xBaru < 0 || xBaru >= COLS || yBaru >= ROWS) return true;
        if (yBaru >= 0 && papan[yBaru][xBaru]) return true;
      }
    }
  }
  return false;
}

// Gambar shadow/preview dari piece (tempat piece akan jatuh)
function gambarPieceBayangan(piece) {
  if (!piece) return;

  // Dapatkan posisi akhir piece jika hard drop
  const pieceBayangan = dapatkanPosisiPieceBayangan(piece);

  // Jika shadow di atas piece, skip (tidak perlu gambar)
  if (pieceBayangan.y <= piece.y) return;

  const bentuk = pieceBayangan.shape;

  // Set transparansi untuk shadow
  ctx.globalAlpha = WARNA.OPASITAS_BAYANGAN;

  // Gambar shadow di posisi final
  for (let y = 0; y < bentuk.length; y++) {
    for (let x = 0; x < bentuk[y].length; x++) {
      if (bentuk[y][x])
        gambarBlok(
          pieceBayangan.x + x,
          pieceBayangan.y + y,
          piece.color,
          ctx,
          UKURAN_BLOK
        );
    }
  }

  // Reset transparansi
  ctx.globalAlpha = 1.0;
}

// Fungsi helper untuk gambar satu blok dengan gradient
function gambarBlok(x, y, warna, konteks, ukuran) {
  // Gambar warna solid
  konteks.fillStyle = warna;
  konteks.fillRect(x * ukuran + 1, y * ukuran + 1, ukuran - 2, ukuran - 2);

  // Buat gradient untuk efek 3D
  const gradien = konteks.createLinearGradient(
    x * ukuran,
    y * ukuran,
    x * ukuran + ukuran,
    y * ukuran + ukuran
  );

  // Highlight di atas kiri
  gradien.addColorStop(0, "rgba(255,255,255,0.3)");

  // Shadow di bawah kanan
  gradien.addColorStop(1, "rgba(0,0,0,0.3)");

  // Apply gradient
  konteks.fillStyle = gradien;
  konteks.fillRect(x * ukuran + 1, y * ukuran + 1, ukuran - 2, ukuran - 2);
}

// Gambar preview piece berikutnya di next canvas
function gambarPieceBerikutnya() {
  if (!ctxBerikutnya) return;

  // Clear canvas
  ctxBerikutnya.fillStyle = WARNA.KOSONG;
  ctxBerikutnya.fillRect(0, 0, canvasBerikutnya.width, canvasBerikutnya.height);

  // Jika tidak ada piece berikutnya, return
  if (!pieceBerikutnya) return;

  const bentuk = pieceBerikutnya.shape;

  // Hitung offset untuk center piece di preview canvas (4x4 grid)
  const offsetX = (4 - bentuk[0].length) / 2;
  const offsetY = (4 - bentuk.length) / 2;

  // Gambar blok-blok piece berikutnya
  for (let y = 0; y < bentuk.length; y++) {
    for (let x = 0; x < bentuk[y].length; x++) {
      if (bentuk[y][x])
        gambarBlok(
          offsetX + x,
          offsetY + y,
          pieceBerikutnya.color,
          ctxBerikutnya,
          UKURAN_BLOK_BERIKUTNYA
        );
    }
  }
}

// --- Fungsi-Fungsi Update UI ---

// Update tampilan skor di UI
function perbaruiSkor() {
  const el = document.getElementById("score");
  if (el) el.textContent = skor;
}

// Update tampilan level di UI
function perbaruiLevel() {
  const el = document.getElementById("level");
  if (el) el.textContent = level;
}

// Update tampilan total baris di UI
function perbaruiBaris() {
  const el = document.getElementById("lines");
  if (el) el.textContent = baris;
}

// --- Fungsi-Fungsi Audio/Musik ---

// Inisialisasi object Audio untuk musik latar
function inisialisasiMusikLatar() {
  // Buat Audio object dengan file musik dari folder music/
  musikLatar = new Audio("music/01 Tetoris.flac");

  // Set untuk loop otomatis
  musikLatar.loop = true;

  // Set volume 50%
  musikLatar.volume = 0.5;

  // Add error handler untuk troubleshoot loading issue
  musikLatar.addEventListener("error", function (e) {
    console.log("Error memuat musik latar:", e);
  });
}

// Putar musik latar
function putarMusikLatar() {
  // Inisialisasi jika belum ada
  if (!musikLatar) inisialisasiMusikLatar();

  // Putar jika belum sedang diputar
  if (musikLatar && !musikSedangDiputar) {
    // .play() return Promise di modern browser
    musikLatar
      .play()
      .then(() => {
        musikSedangDiputar = true;
      })
      .catch((error) => {
        console.log("Tidak dapat memutar musik:", error);
      });
  }
}

// Hentikan musik latar
function hentikanMusikLatar() {
  // Jika musik sedang diputar, hentikan dan reset
  if (musikLatar && musikSedangDiputar) {
    musikLatar.pause(); // Pause audio
    musikLatar.currentTime = 0; // Reset ke awal
    musikSedangDiputar = false; // Update flag
  }
}

// --- Inisialisasi Game ---

// Event listener: saat halaman game.html selesai dimuat
window.addEventListener("load", inisialisasi);
