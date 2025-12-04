// auth.js — redirect login + leaderboard (localStorage)
// Versi ini menambahkan seeding: jika leaderboard kosong, akan terisi sample skor (termasuk skor tertinggi).

(function () {
  const LS_USER_KEY = "tetoris_user";
  const LS_LEADERBOARD_KEY = "tetoris_leaderboard";

  // Simpan pemain dan redirect ke halaman game
  function aturPemainDanRedirect(nama) {
    if (!nama) nama = "Guest";
    localStorage.setItem(LS_USER_KEY, nama);
    window.location.href = "game.html";
  }

  // Dapatkan pemain saat ini (atau null)
  function dapatkanPemainSekarang() {
    return localStorage.getItem(LS_USER_KEY);
  }

  // Logout dan redirect ke login
  function logoutDanRedirect() {
    localStorage.removeItem(LS_USER_KEY);
    window.location.href = "index.html";
  }

  // Helper leaderboard
  function tambahSkorKeLeaderboard(nama, skor) {
    if (!nama) nama = "Guest";
    const sekarang = new Date().toISOString();
    const entri = { name: nama, score: Number(skor || 0), date: sekarang };

    const lb = dapatkanLeaderboard();
    lb.push(entri);

    // Urutkan descending berdasarkan skor, simpan top 10
    lb.sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));
    const dipangkas = lb.slice(0, 10);

    localStorage.setItem(LS_LEADERBOARD_KEY, JSON.stringify(dipangkas));
  }

  function dapatkanLeaderboard() {
    const raw = localStorage.getItem(LS_LEADERBOARD_KEY);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function hapusLeaderboard() {
    localStorage.removeItem(LS_LEADERBOARD_KEY);
  }

  function renderLeaderboard() {
    const kontainer = document.getElementById("leaderboard");
    if (!kontainer) return;
    const lb = dapatkanLeaderboard();

    kontainer.innerHTML = "";
    if (!lb.length) {
      kontainer.innerHTML =
        '<p class="leaderboard-empty">Belum ada skor. Mainkan untuk mengisi leaderboard!</p>';
      return;
    }

    const daftar = document.createElement("ol");
    daftar.className = "leaderboard-list";
    lb.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="lb-name">${escapeHtml(
        item.name
      )}</span><span class="lb-score">${item.score}</span>`;
      daftar.appendChild(li);
    });
    kontainer.appendChild(daftar);
  }

  function escapeHtml(tidakAman) {
    return String(tidakAman).replace(/[&<"'>]/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m];
    });
  }

  // Seed sample leaderboard entries (hanya jika leaderboard kosong).
  // Anda dapat mengedit sampleEntries untuk mengubah nama/skor.
  function seedLeaderboardJikaKosong() {
    const existing = dapatkanLeaderboard();
    if (existing && existing.length > 0) return; // sudah ada data

    const sekarang = new Date();
    const entriSample = [
      {
        name: "Champion",
        score: 999999,
        date: new Date(
          sekarang.getTime() - 1000 * 60 * 60 * 24 * 1
        ).toISOString(),
      },
    ];

    // Pastikan terurut dan hanya top 10
    entriSample.sort(
      (a, b) => b.score - a.score || new Date(b.date) - new Date(a.date)
    );
    localStorage.setItem(
      LS_LEADERBOARD_KEY,
      JSON.stringify(entriSample.slice(0, 10))
    );
  }

  // Ekspos fungsi ke global scope yang digunakan oleh halaman / game.js
  // Nama asli (untuk kompatibilitas)
  window.setPlayerAndRedirect = aturPemainDanRedirect;
  window.getCurrentPlayer = dapatkanPemainSekarang;
  window.logoutAndRedirect = logoutDanRedirect;
  window.addScoreToLeaderboard = tambahSkorKeLeaderboard;
  window.renderLeaderboard = renderLeaderboard;
  window.clearLeaderboard = hapusLeaderboard;

  // Alias bahasa Indonesia
  window.aturPemainDanRedirect = aturPemainDanRedirect;
  window.dapatkanPemainSekarang = dapatkanPemainSekarang;
  window.logoutDanRedirect = logoutDanRedirect;
  window.tambahSkorKeLeaderboard = tambahSkorKeLeaderboard;
  window.renderLeaderboard = renderLeaderboard;
  window.hapusLeaderboard = hapusLeaderboard;

  // Inisialisasi saat load
  window.addEventListener("load", () => {
    // Seed leaderboard jika kosong
    seedLeaderboardJikaKosong();

    // Jika di halaman game, pastikan user sudah login, jika tidak redirect ke login
    if (location.pathname.endsWith("game.html")) {
      const pemain = dapatkanPemainSekarang();
      if (!pemain) {
        window.location.href = "index.html";
        return;
      }
      // tampilkan nama pemain, atur tombol logout
      const elNamaPemain = document.getElementById("playerName");
      if (elNamaPemain) elNamaPemain.textContent = pemain;

      const tombolLogout = document.getElementById("logoutBtn");
      if (tombolLogout) {
        tombolLogout.addEventListener("click", () => {
          logoutDanRedirect();
        });
      }

      // aktifkan tombol start (jika game.js menonaktifkannya)
      const tombolMulai = document.getElementById("startBtn");
      if (tombolMulai) tombolMulai.disabled = false;

      // render leaderboard
      renderLeaderboard();

      // tombol hapus leaderboard
      const tombolHapus = document.getElementById("clearLeaderboardBtn");
      if (tombolHapus) {
        tombolHapus.addEventListener("click", () => {
          if (confirm("Hapus semua leaderboard?")) {
            hapusLeaderboard();
            renderLeaderboard();
          }
        });
      }
    }
  });
})();
