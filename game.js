
// game.js — Logika permainan Tetris (perbaikan tombol mulai + bug pembuatan piece)

// --- Konstanta dan state ---
const LS_USER_KEY = 'tetoris_user'; // harus sama dengan auth.js
const COLS = 10;
const ROWS = 20;
const UKURAN_BLOK = 30;
const UKURAN_BLOK_BERIKUTNYA = 30;

const WARNA = {
    I: '#88C0D0',
    O: '#EBCB8B',
    T: '#B48EAD',
    S: '#A3BE8C',
    Z: '#BF616A',
    J: '#5E81AC',
    L: '#D08770',
    KOSONG: '#2E3440',
    GRID: '#3B4252',
    OPASITAS_BAYANGAN: 0.3
};

const BENTUK = {
    I: [
        [[1, 1, 1, 1]],
        [[0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0]]
    ],
    O: [
        [[1, 1],
        [1, 1]]
    ],
    T: [
        [[0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]],
        [[0, 1, 0],
        [0, 1, 1],
        [0, 1, 0]],
        [[0, 0, 0],
        [1, 1, 1],
        [0, 1, 0]],
        [[0, 1, 0],
        [1, 1, 0],
        [0, 1, 0]]
    ],
    S: [
        [[0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]],
        [[0, 1, 0],
        [0, 1, 1],
        [0, 0, 1]]
    ],
    Z: [
        [[1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]],
        [[0, 0, 1],
        [0, 1, 1],
        [0, 1, 0]]
    ],
    J: [
        [[1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]],
        [[0, 1, 1],
        [0, 1, 0],
        [0, 1, 0]],
        [[0, 0, 0],
        [1, 1, 1],
        [0, 0, 1]],
        [[0, 1, 0],
        [0, 1, 0],
        [1, 1, 0]]
    ],
    L: [
        [[0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]],
        [[0, 1, 0],
        [0, 1, 0],
        [0, 1, 1]],
        [[0, 0, 0],
        [1, 1, 1],
        [1, 0, 0]],
        [[1, 1, 0],
        [0, 1, 0],
        [0, 1, 0]]
    ]
};

let canvas, ctx, canvasBerikutnya, ctxBerikutnya;
let papan = [];
let pieceSekarang = null;
let pieceBerikutnya = null;
let skor = 0;
let level = 1;
let baris = 0;
let permainanBerjalan = false;
let permainanDijeda = false;
let loopPermainan = null;
let penghitungJatuh = 0;
let intervalJatuh = 1000;
let waktuTerakhir = 0;
let tingkatKesulitan = 5;
let modePermainan = 'classic';

let penghitungMutasi = 0;
let intervalMutasi = 2000;

let musikLatar = null;
let musikSedangDiputar = false;

let kantongPiece = [];

// Inisialisasi
function inisialisasi() {
    // Hanya inisialisasi jika kita berada di halaman game
    if (!location.pathname.endsWith('game.html')) return;

    canvas = document.getElementById('gameCanvas');
    ctx = canvas ? canvas.getContext('2d') : null;
    canvasBerikutnya = document.getElementById('nextCanvas');
    ctxBerikutnya = canvasBerikutnya ? canvasBerikutnya.getContext('2d') : null;

    if (!canvas || !ctx || !canvasBerikutnya || !ctxBerikutnya) {
        console.error('Elemen canvas permainan tidak ditemukan.');
        return;
    }

    papan = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

    const tombolMulai = document.getElementById('startBtn');
    const tombolUlang = document.getElementById('restartBtn');
    const sliderKesulitan = document.getElementById('difficultySlider');

    if (tombolMulai) tombolMulai.addEventListener('click', mulaiPermainan);
    if (tombolUlang) tombolUlang.addEventListener('click', ulangPermainan);
    if (sliderKesulitan) sliderKesulitan.addEventListener('input', perbaruiKesulitan);
    document.addEventListener('keydown', tanganiTekanTombol);

    document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            modePermainan = e.target.value;
        });
    });

    // Aktifkan tombol mulai hanya jika pengguna sudah login (cek localStorage key yang digunakan oleh auth.js)
    if (tombolMulai) {
        const sudahLogin = !!localStorage.getItem(LS_USER_KEY);
        tombolMulai.disabled = !sudahLogin;
        if (!sudahLogin) console.info('Tombol mulai dinonaktifkan: pengguna belum login.');
    }

    gambarPapan();
    gambarPieceBerikutnya();
}

// --- fungsi-fungsi lainnya (logika sama, hanya nama yang diubah) ---

function perbaruiKesulitan(e) {
    tingkatKesulitan = parseInt(e.target.value);
    const elKesulitan = document.getElementById('difficultyValue');
    if (elKesulitan) elKesulitan.textContent = tingkatKesulitan;
    if (permainanBerjalan) perbaruiIntervalJatuh();
}

function perbaruiIntervalJatuh() {
    const intervalDasar = 1100 - (tingkatKesulitan * 100);
    intervalJatuh = Math.max(100, intervalDasar - (level - 1) * 50);
}

function mulaiPermainan() {
    if (permainanBerjalan) return;

    papan = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    skor = 0;
    level = 1;
    baris = 0;
    permainanBerjalan = true;
    permainanDijeda = false;
    penghitungJatuh = 0;
    penghitungMutasi = 0;
    waktuTerakhir = 0;

    perbaruiSkor();
    perbaruiLevel();
    perbaruiBaris();
    perbaruiIntervalJatuh();

    const elGameOver = document.getElementById('gameOver');
    if (elGameOver) elGameOver.classList.add('hidden');

    // Perbaikan: buat pieceSekarang kemudian pieceBerikutnya
    pieceSekarang = buatPiece();
    pieceBerikutnya = buatPiece();

    gambarPieceBerikutnya();

    putarMusikLatar();

    requestAnimationFrame(perbarui);
}

function ulangPermainan() {
    mulaiPermainan();
}

function buatPiece() {
    if (kantongPiece.length === 0) {
        kantongPiece = Object.keys(BENTUK);
        for (let i = kantongPiece.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [kantongPiece[i], kantongPiece[j]] = [kantongPiece[j], kantongPiece[i]];
        }
    }

    const tipe = kantongPiece.pop();
    const bentukArray = BENTUK[tipe];

    return {
        type: tipe,
        shape: bentukArray[0],
        rotation: 0,
        x: Math.floor(COLS / 2) - Math.floor(bentukArray[0][0].length / 2),
        y: 0,
        color: WARNA[tipe]
    };
}

function mutasiPieceSekarang() {
    if (modePermainan !== 'random' || !pieceSekarang) return;

    const tipeTipe = Object.keys(BENTUK);
    const tipeBaru = tipeTipe[Math.floor(Math.random() * tipeTipe.length)];
    const bentukBaru = BENTUK[tipeBaru];
    const rotasiBaru = Math.floor(Math.random() * bentukBaru.length);

    const xLama = pieceSekarang.x;
    const yLama = pieceSekarang.y;

    pieceSekarang.type = tipeBaru;
    pieceSekarang.shape = bentukBaru[rotasiBaru];
    pieceSekarang.rotation = rotasiBaru;
    pieceSekarang.color = WARNA[tipeBaru];

    if (cekTabrakan()) {
        let disesuaikan = false;
        for (let offset = -2; offset <= 2; offset++) {
            pieceSekarang.x = xLama + offset;
            if (!cekTabrakan()) {
                disesuaikan = true;
                break;
            }
        }
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
        if (!disesuaikan) {
            pieceSekarang.y = yLama;
        }
    }

    tampilkanPeringatanMutasi();
}

let elemenPeringatanMutasi = null;
function tampilkanPeringatanMutasi() {
    if (elemenPeringatanMutasi) elemenPeringatanMutasi.remove();

    elemenPeringatanMutasi = document.createElement('div');
    elemenPeringatanMutasi.className = 'mutation-warning';
    elemenPeringatanMutasi.textContent = '⚡ BENTUK BERUBAH!';
    const ga = document.querySelector('.game-area');
    if (ga) ga.appendChild(elemenPeringatanMutasi);

    setTimeout(() => {
        if (elemenPeringatanMutasi) {
            elemenPeringatanMutasi.remove();
            elemenPeringatanMutasi = null;
        }
    }, 1000);
}

function perbarui(waktu = 0) {
    if (!permainanBerjalan || permainanDijeda) return;

    const deltaWaktu = waktu - waktuTerakhir;
    waktuTerakhir = waktu;
    penghitungJatuh += deltaWaktu;

    if (modePermainan === 'random') {
        penghitungMutasi += deltaWaktu;
        if (penghitungMutasi >= intervalMutasi) {
            mutasiPieceSekarang();
            penghitungMutasi = 0;
        }
    }

    if (penghitungJatuh > intervalJatuh) {
        gerakKeBawah();
        penghitungJatuh = 0;
    }

    gambarPapan();
    if (pieceSekarang) {
        gambarPieceBayangan(pieceSekarang);
        gambarPiece(pieceSekarang);
    }

    loopPermainan = requestAnimationFrame(perbarui);
}

function tanganiTekanTombol(e) {
    if (!permainanBerjalan || permainanDijeda) {
        if (e.key === 'p' || e.key === 'P') toggleJeda();
        return;
    }

    switch (e.key) {
        case 'ArrowLeft': gerakKeKiri(); break;
        case 'ArrowRight': gerakKeKanan(); break;
        case 'ArrowDown': gerakKeBawah(); break;
        case 'ArrowUp': putar(); break;
        case ' ': jatuhCepat(); break;
        case 'p': case 'P': toggleJeda(); break;
    }
    e.preventDefault();
}

function toggleJeda() {
    if (!permainanBerjalan) return;
    permainanDijeda = !permainanDijeda;
    if (!permainanDijeda) {
        waktuTerakhir = performance.now();
        requestAnimationFrame(perbarui);
    }
}

function gerakKeKiri() {
    if (!pieceSekarang) return;
    pieceSekarang.x--;
    if (cekTabrakan()) pieceSekarang.x++;
    else { gambarPapan(); gambarPieceBayangan(pieceSekarang); gambarPiece(pieceSekarang); }
}

function gerakKeKanan() {
    if (!pieceSekarang) return;
    pieceSekarang.x++;
    if (cekTabrakan()) pieceSekarang.x--;
    else { gambarPapan(); gambarPieceBayangan(pieceSekarang); gambarPiece(pieceSekarang); }
}

function gerakKeBawah() {
    if (!pieceSekarang) return;
    pieceSekarang.y++;
    if (cekTabrakan()) {
        pieceSekarang.y--;
        kunciPiece();
        hapusBaris();
        munculkanPieceBaru();
    }
}

function putar() {
    if (!pieceSekarang) return;
    const bentukArray = BENTUK[pieceSekarang.type];
    const rotasiBerikutnya = (pieceSekarang.rotation + 1) % bentukArray.length;
    const bentukSebelumnya = pieceSekarang.shape;

    pieceSekarang.shape = bentukArray[rotasiBerikutnya];
    pieceSekarang.rotation = rotasiBerikutnya;

    if (cekTabrakan()) {
        pieceSekarang.shape = bentukSebelumnya;
        pieceSekarang.rotation = (rotasiBerikutnya - 1 + bentukArray.length) % bentukArray.length;
    } else {
        gambarPapan();
        gambarPieceBayangan(pieceSekarang);
        gambarPiece(pieceSekarang);
    }
}

function jatuhCepat() {
    if (!pieceSekarang) return;
    while (!cekTabrakan()) pieceSekarang.y++;
    pieceSekarang.y--;
    kunciPiece();
    hapusBaris();
    munculkanPieceBaru();
}

function cekTabrakan() {
    const bentuk = pieceSekarang.shape;
    for (let y = 0; y < bentuk.length; y++) {
        for (let x = 0; x < bentuk[y].length; x++) {
            if (bentuk[y][x]) {
                const xBaru = pieceSekarang.x + x;
                const yBaru = pieceSekarang.y + y;
                if (xBaru < 0 || xBaru >= COLS || yBaru >= ROWS) return true;
                if (yBaru >= 0 && papan[yBaru][xBaru]) return true;
            }
        }
    }
    return false;
}

function kunciPiece() {
    const bentuk = pieceSekarang.shape;
    for (let y = 0; y < bentuk.length; y++) {
        for (let x = 0; x < bentuk[y].length; x++) {
            if (bentuk[y][x]) {
                const yPapan = pieceSekarang.y + y;
                const xPapan = pieceSekarang.x + x;
                if (yPapan >= 0) papan[yPapan][xPapan] = pieceSekarang.color;
            }
        }
    }
}

function hapusBaris() {
    let barisDihapus = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (papan[y].every(sel => sel !== 0)) {
            papan.splice(y, 1);
            papan.unshift(Array(COLS).fill(0));
            barisDihapus++;
            y++;
        }
    }

    if (barisDihapus > 0) {
        baris += barisDihapus;
        const poin = [0, 100, 300, 500, 800];
        const penggandaKesulitan = 1 + (tingkatKesulitan - 1) * 0.2;
        skor += Math.floor(poin[barisDihapus] * level * penggandaKesulitan);
        level = Math.floor(baris / 10) + 1;

        perbaruiSkor();
        perbaruiLevel();
        perbaruiBaris();
        perbaruiIntervalJatuh();
    }
}

function munculkanPieceBaru() {
    pieceSekarang = pieceBerikutnya;
    pieceBerikutnya = buatPiece();

    if (modePermainan === 'random') penghitungMutasi = 0;
    gambarPieceBerikutnya();

    if (cekTabrakan()) permainanSelesai();
}

function permainanSelesai() {
    permainanBerjalan = false;
    permainanDijeda = false;
    if (loopPermainan) cancelAnimationFrame(loopPermainan);
    hentikanMusikLatar();
    if (elemenPeringatanMutasi) { elemenPeringatanMutasi.remove(); elemenPeringatanMutasi = null; }

    const elSkorAkhir = document.getElementById('finalScore');
    if (elSkorAkhir) elSkorAkhir.textContent = skor;
    const elGameOver = document.getElementById('gameOver');
    if (elGameOver) elGameOver.classList.remove('hidden');

    // Simpan ke leaderboard via auth.js (atau fallback localStorage)
    try {
        const pemain = (window.getCurrentPlayer && window.getCurrentPlayer()) || localStorage.getItem(LS_USER_KEY) || 'Guest';
        if (typeof window.addScoreToLeaderboard === 'function') {
            window.addScoreToLeaderboard(pemain || 'Guest', skor);
            if (typeof window.renderLeaderboard === 'function') window.renderLeaderboard();
        } else {
            // fallback: simpan langsung (format sama dengan auth.js)
            const raw = localStorage.getItem('tetoris_leaderboard');
            let lb = [];
            try { lb = raw ? JSON.parse(raw) : []; } catch (e) { lb = []; }
            lb.push({ name: pemain, score: skor, date: new Date().toISOString() });
            lb.sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));
            localStorage.setItem('tetoris_leaderboard', JSON.stringify(lb.slice(0, 10)));
        }
    } catch (err) {
        console.warn('Error menyimpan leaderboard', err);
    }
}

function gambarPapan() {
    if (!ctx) return;
    ctx.fillStyle = WARNA.KOSONG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = WARNA.GRID;
    ctx.lineWidth = 1;

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            ctx.strokeRect(x * UKURAN_BLOK, y * UKURAN_BLOK, UKURAN_BLOK, UKURAN_BLOK);
            if (papan[y][x]) gambarBlok(x, y, papan[y][x], ctx, UKURAN_BLOK);
        }
    }
}

function gambarPiece(piece) {
    if (!piece) return;
    const bentuk = piece.shape;
    for (let y = 0; y < bentuk.length; y++) {
        for (let x = 0; x < bentuk[y].length; x++) {
            if (bentuk[y][x]) gambarBlok(piece.x + x, piece.y + y, piece.color, ctx, UKURAN_BLOK);
        }
    }
}

function dapatkanPosisiPieceBayangan(piece) {
    const pieceBayangan = { ...piece, y: piece.y };
    while (!cekTabrakanUntukPiece(pieceBayangan)) pieceBayangan.y++;
    pieceBayangan.y--;
    return pieceBayangan;
}

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

function gambarPieceBayangan(piece) {
    if (!piece) return;
    const pieceBayangan = dapatkanPosisiPieceBayangan(piece);
    if (pieceBayangan.y <= piece.y) return;

    const bentuk = pieceBayangan.shape;
    ctx.globalAlpha = WARNA.OPASITAS_BAYANGAN;
    for (let y = 0; y < bentuk.length; y++) {
        for (let x = 0; x < bentuk[y].length; x++) {
            if (bentuk[y][x]) gambarBlok(pieceBayangan.x + x, pieceBayangan.y + y, piece.color, ctx, UKURAN_BLOK);
        }
    }
    ctx.globalAlpha = 1.0;
}

function gambarBlok(x, y, warna, konteks, ukuran) {
    konteks.fillStyle = warna;
    konteks.fillRect(x * ukuran + 1, y * ukuran + 1, ukuran - 2, ukuran - 2);

    const gradien = konteks.createLinearGradient(x * ukuran, y * ukuran, x * ukuran + ukuran, y * ukuran + ukuran);
    gradien.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradien.addColorStop(1, 'rgba(0,0,0,0.3)');
    konteks.fillStyle = gradien;
    konteks.fillRect(x * ukuran + 1, y * ukuran + 1, ukuran - 2, ukuran - 2);
}

function gambarPieceBerikutnya() {
    if (!ctxBerikutnya) return;
    ctxBerikutnya.fillStyle = WARNA.KOSONG;
    ctxBerikutnya.fillRect(0, 0, canvasBerikutnya.width, canvasBerikutnya.height);
    if (!pieceBerikutnya) return;
    const bentuk = pieceBerikutnya.shape;
    const offsetX = (4 - bentuk[0].length) / 2;
    const offsetY = (4 - bentuk.length) / 2;
    for (let y = 0; y < bentuk.length; y++) {
        for (let x = 0; x < bentuk[y].length; x++) {
            if (bentuk[y][x]) gambarBlok(offsetX + x, offsetY + y, pieceBerikutnya.color, ctxBerikutnya, UKURAN_BLOK_BERIKUTNYA);
        }
    }
}

function perbaruiSkor() {
    const el = document.getElementById('score');
    if (el) el.textContent = skor;
}

function perbaruiLevel() {
    const el = document.getElementById('level');
    if (el) el.textContent = level;
}

function perbaruiBaris() {
    const el = document.getElementById('lines');
    if (el) el.textContent = baris;
}

function inisialisasiMusikLatar() {
    musikLatar = new Audio('music/01 Tetoris.flac');
    musikLatar.loop = true;
    musikLatar.volume = 0.5;
    musikLatar.addEventListener('error', function (e) {
        console.log('Error memuat musik latar:', e);
    });
}

function putarMusikLatar() {
    if (!musikLatar) inisialisasiMusikLatar();
    if (musikLatar && !musikSedangDiputar) {
        musikLatar.play().then(() => { musikSedangDiputar = true; }).catch(error => { console.log('Tidak dapat memutar musik:', error); });
    }
}

function hentikanMusikLatar() {
    if (musikLatar && musikSedangDiputar) {
        musikLatar.pause();
        musikLatar.currentTime = 0;
        musikSedangDiputar = false;
    }
}

// Mulai inisialisasi
window.addEventListener('load', inisialisasi);
