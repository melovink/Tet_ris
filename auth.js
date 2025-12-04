// auth.js — login redirect + leaderboard (localStorage)
// Versi ini menambahkan seeding: jika leaderboard kosong, akan terisi sample skor (termasuk skor tertinggi).

(function () {
  const LS_USER_KEY = "tetoris_user";
  const LS_LEADERBOARD_KEY = "tetoris_leaderboard";

  // Save player and redirect to game page
  function setPlayerAndRedirect(name) {
    if (!name) name = "Guest";
    localStorage.setItem(LS_USER_KEY, name);
    window.location.href = "game.html";
  }

  // Get current player (or null)
  function getCurrentPlayer() {
    return localStorage.getItem(LS_USER_KEY);
  }

  // Logout and redirect to login
  function logoutAndRedirect() {
    localStorage.removeItem(LS_USER_KEY);
    window.location.href = "index.html";
  }

  // Leaderboard helpers
  function addScoreToLeaderboard(name, score) {
    if (!name) name = "Guest";
    const now = new Date().toISOString();
    const entry = { name, score: Number(score || 0), date: now };

    const lb = getLeaderboard();
    lb.push(entry);

    // Sort descending by score, keep top 10
    lb.sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));
    const trimmed = lb.slice(0, 10);

    localStorage.setItem(LS_LEADERBOARD_KEY, JSON.stringify(trimmed));
  }

  function getLeaderboard() {
    const raw = localStorage.getItem(LS_LEADERBOARD_KEY);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function clearLeaderboard() {
    localStorage.removeItem(LS_LEADERBOARD_KEY);
  }

  function renderLeaderboard() {
    const container = document.getElementById("leaderboard");
    if (!container) return;
    const lb = getLeaderboard();

    container.innerHTML = "";
    if (!lb.length) {
      container.innerHTML =
        '<p class="leaderboard-empty">No scores yet. Mainkan untuk mengisi leaderboard!</p>';
      return;
    }

    const list = document.createElement("ol");
    list.className = "leaderboard-list";
    lb.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="lb-name">${escapeHtml(
        item.name
      )}</span><span class="lb-score">${item.score}</span>`;
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  function escapeHtml(unsafe) {
    return String(unsafe).replace(/[&<"'>]/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      }[m];
    });
  }

  // Seed sample leaderboard entries (only if leaderboard empty).
  // You can edit sampleEntries to change names/scores.
  function seedLeaderboardIfEmpty() {
    const existing = getLeaderboard();
    if (existing && existing.length > 0) return; // already has data

    const now = new Date();
    const sampleEntries = [
      {
        name: "Champion",
        score: 999999,
        date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1).toISOString(),
      }, // tertinggi
    ];

    // Ensure sorted and top 10 only
    sampleEntries.sort(
      (a, b) => b.score - a.score || new Date(b.date) - new Date(a.date)
    );
    localStorage.setItem(
      LS_LEADERBOARD_KEY,
      JSON.stringify(sampleEntries.slice(0, 10))
    );
  }

  // Expose functions to global scope used by pages / game.js
  window.setPlayerAndRedirect = setPlayerAndRedirect;
  window.getCurrentPlayer = getCurrentPlayer;
  window.logoutAndRedirect = logoutAndRedirect;
  window.addScoreToLeaderboard = addScoreToLeaderboard;
  window.renderLeaderboard = renderLeaderboard;
  window.clearLeaderboard = clearLeaderboard;

  // Initialize on load
  window.addEventListener("load", () => {
    // Seed leaderboard if empty
    seedLeaderboardIfEmpty();

    // If on game page, ensure user is logged in, otherwise redirect to login
    if (location.pathname.endsWith("game.html")) {
      const player = getCurrentPlayer();
      if (!player) {
        window.location.href = "index.html";
        return;
      }
      // show player name, set logout button
      const playerNameEl = document.getElementById("playerName");
      if (playerNameEl) playerNameEl.textContent = player;

      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
          logoutAndRedirect();
        });
      }

      // enable start button (in case game.js disabled it)
      const startBtn = document.getElementById("startBtn");
      if (startBtn) startBtn.disabled = false;

      // render leaderboard
      renderLeaderboard();

      // clear leaderboard button
      const clearBtn = document.getElementById("clearLeaderboardBtn");
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          if (confirm("Hapus semua leaderboard?")) {
            clearLeaderboard();
            renderLeaderboard();
          }
        });
      }
    }
  });
})();
