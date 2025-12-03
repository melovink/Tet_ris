
// game.js — Tetris game logic (perbaikan start button + piece creation bug)

// --- Konstanta dan state ---
const LS_USER_KEY = 'tetoris_user'; // harus sama dengan auth.js
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 30;

const COLORS = {
    I: '#88C0D0',
    O: '#EBCB8B',
    T: '#B48EAD',
    S: '#A3BE8C',
    Z: '#BF616A',
    J: '#5E81AC',
    L: '#D08770',
    EMPTY: '#2E3440',
    GRID: '#3B4252',
    GHOST_OPACITY: 0.3
};

const SHAPES = {
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

let canvas, ctx, nextCanvas, nextCtx;
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameRunning = false;
let gamePaused = false;
let gameLoop = null;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let difficulty = 5;
let gameMode = 'classic';

let mutationCounter = 0;
let mutationInterval = 2000;

let backgroundMusic = null;
let isMusicPlaying = false;

let pieceBag = [];

// Initialization
function init() {
    // Only initialize if we are on the game page
    if (!location.pathname.endsWith('game.html')) return;

    canvas = document.getElementById('gameCanvas');
    ctx = canvas ? canvas.getContext('2d') : null;
    nextCanvas = document.getElementById('nextCanvas');
    nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;

    if (!canvas || !ctx || !nextCanvas || !nextCtx) {
        console.error('Game canvas elements not found.');
        return;
    }

    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const difficultySlider = document.getElementById('difficultySlider');

    if (startBtn) startBtn.addEventListener('click', startGame);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    if (difficultySlider) difficultySlider.addEventListener('input', updateDifficulty);
    document.addEventListener('keydown', handleKeyPress);

    document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameMode = e.target.value;
        });
    });

    // Enable start button only if user is logged in (check localStorage key used by auth.js)
    if (startBtn) {
        const logged = !!localStorage.getItem(LS_USER_KEY);
        startBtn.disabled = !logged;
        if (!logged) console.info('Start button disabled: user not logged in.');
    }

    drawBoard();
    drawNextPiece();
}

// --- remaining functions (same logic, unchanged except fixed piece creation order) ---

function updateDifficulty(e) {
    difficulty = parseInt(e.target.value);
    const diffEl = document.getElementById('difficultyValue');
    if (diffEl) diffEl.textContent = difficulty;
    if (gameRunning) updateDropInterval();
}

function updateDropInterval() {
    const baseInterval = 1100 - (difficulty * 100);
    dropInterval = Math.max(100, baseInterval - (level - 1) * 50);
}

function startGame() {
    if (gameRunning) return;

    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    score = 0;
    level = 1;
    lines = 0;
    gameRunning = true;
    gamePaused = false;
    dropCounter = 0;
    mutationCounter = 0;
    lastTime = 0;

    updateScore();
    updateLevel();
    updateLines();
    updateDropInterval();

    const gameOverEl = document.getElementById('gameOver');
    if (gameOverEl) gameOverEl.classList.add('hidden');

    // Fix: create currentPiece then nextPiece
    currentPiece = createPiece();
    nextPiece = createPiece();

    drawNextPiece();

    playBackgroundMusic();

    requestAnimationFrame(update);
}

function restartGame() {
    startGame();
}

function createPiece() {
    if (pieceBag.length === 0) {
        pieceBag = Object.keys(SHAPES);
        for (let i = pieceBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
        }
    }

    const type = pieceBag.pop();
    const shapes = SHAPES[type];

    return {
        type: type,
        shape: shapes[0],
        rotation: 0,
        x: Math.floor(COLS / 2) - Math.floor(shapes[0][0].length / 2),
        y: 0,
        color: COLORS[type]
    };
}

function mutateCurrentPiece() {
    if (gameMode !== 'random' || !currentPiece) return;

    const types = Object.keys(SHAPES);
    const newType = types[Math.floor(Math.random() * types.length)];
    const newShapes = SHAPES[newType];
    const newRotation = Math.floor(Math.random() * newShapes.length);

    const oldX = currentPiece.x;
    const oldY = currentPiece.y;

    currentPiece.type = newType;
    currentPiece.shape = newShapes[newRotation];
    currentPiece.rotation = newRotation;
    currentPiece.color = COLORS[newType];

    if (checkCollision()) {
        let adjusted = false;
        for (let offset = -2; offset <= 2; offset++) {
            currentPiece.x = oldX + offset;
            if (!checkCollision()) {
                adjusted = true;
                break;
            }
        }
        if (!adjusted) {
            currentPiece.x = oldX;
            for (let offset = -2; offset <= 0; offset++) {
                currentPiece.y = oldY + offset;
                if (!checkCollision()) {
                    adjusted = true;
                    break;
                }
            }
        }
        if (!adjusted) {
            currentPiece.y = oldY;
        }
    }

    showMutationWarning();
}

let mutationWarningElement = null;
function showMutationWarning() {
    if (mutationWarningElement) mutationWarningElement.remove();

    mutationWarningElement = document.createElement('div');
    mutationWarningElement.className = 'mutation-warning';
    mutationWarningElement.textContent = '⚡ SHAPE CHANGED!';
    const ga = document.querySelector('.game-area');
    if (ga) ga.appendChild(mutationWarningElement);

    setTimeout(() => {
        if (mutationWarningElement) {
            mutationWarningElement.remove();
            mutationWarningElement = null;
        }
    }, 1000);
}

function update(time = 0) {
    if (!gameRunning || gamePaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (gameMode === 'random') {
        mutationCounter += deltaTime;
        if (mutationCounter >= mutationInterval) {
            mutateCurrentPiece();
            mutationCounter = 0;
        }
    }

    if (dropCounter > dropInterval) {
        moveDown();
        dropCounter = 0;
    }

    drawBoard();
    if (currentPiece) {
        drawGhostPiece(currentPiece);
        drawPiece(currentPiece);
    }

    gameLoop = requestAnimationFrame(update);
}

function handleKeyPress(e) {
    if (!gameRunning || gamePaused) {
        if (e.key === 'p' || e.key === 'P') togglePause();
        return;
    }

    switch (e.key) {
        case 'ArrowLeft': moveLeft(); break;
        case 'ArrowRight': moveRight(); break;
        case 'ArrowDown': moveDown(); break;
        case 'ArrowUp': rotate(); break;
        case ' ': hardDrop(); break;
        case 'p': case 'P': togglePause(); break;
    }
    e.preventDefault();
}

function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;
    if (!gamePaused) {
        lastTime = performance.now();
        requestAnimationFrame(update);
    }
}

function moveLeft() {
    if (!currentPiece) return;
    currentPiece.x--;
    if (checkCollision()) currentPiece.x++;
    else { drawBoard(); drawGhostPiece(currentPiece); drawPiece(currentPiece); }
}

function moveRight() {
    if (!currentPiece) return;
    currentPiece.x++;
    if (checkCollision()) currentPiece.x--;
    else { drawBoard(); drawGhostPiece(currentPiece); drawPiece(currentPiece); }
}

function moveDown() {
    if (!currentPiece) return;
    currentPiece.y++;
    if (checkCollision()) {
        currentPiece.y--;
        lockPiece();
        clearLines();
        spawnNewPiece();
    }
}

function rotate() {
    if (!currentPiece) return;
    const shapes = SHAPES[currentPiece.type];
    const nextRotation = (currentPiece.rotation + 1) % shapes.length;
    const previousShape = currentPiece.shape;

    currentPiece.shape = shapes[nextRotation];
    currentPiece.rotation = nextRotation;

    if (checkCollision()) {
        currentPiece.shape = previousShape;
        currentPiece.rotation = (nextRotation - 1 + shapes.length) % shapes.length;
    } else {
        drawBoard();
        drawGhostPiece(currentPiece);
        drawPiece(currentPiece);
    }
}

function hardDrop() {
    if (!currentPiece) return;
    while (!checkCollision()) currentPiece.y++;
    currentPiece.y--;
    lockPiece();
    clearLines();
    spawnNewPiece();
}

function checkCollision() {
    const shape = currentPiece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = currentPiece.x + x;
                const newY = currentPiece.y + y;
                if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                if (newY >= 0 && board[newY][newX]) return true;
            }
        }
    }
    return false;
}

function lockPiece() {
    const shape = currentPiece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) board[boardY][boardX] = currentPiece.color;
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++;
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;
        const points = [0, 100, 300, 500, 800];
        const difficultyMultiplier = 1 + (difficulty - 1) * 0.2;
        score += Math.floor(points[linesCleared] * level * difficultyMultiplier);
        level = Math.floor(lines / 10) + 1;

        updateScore();
        updateLevel();
        updateLines();
        updateDropInterval();
    }
}

function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createPiece();

    if (gameMode === 'random') mutationCounter = 0;
    drawNextPiece();

    if (checkCollision()) gameOver();
}

function gameOver() {
    gameRunning = false;
    gamePaused = false;
    if (gameLoop) cancelAnimationFrame(gameLoop);
    stopBackgroundMusic();
    if (mutationWarningElement) { mutationWarningElement.remove(); mutationWarningElement = null; }

    const finalScoreEl = document.getElementById('finalScore');
    if (finalScoreEl) finalScoreEl.textContent = score;
    const gameOverEl = document.getElementById('gameOver');
    if (gameOverEl) gameOverEl.classList.remove('hidden');

    // Save to leaderboard via auth.js (or localStorage fallback)
    try {
        const player = (window.getCurrentPlayer && window.getCurrentPlayer()) || localStorage.getItem(LS_USER_KEY) || 'Guest';
        if (typeof window.addScoreToLeaderboard === 'function') {
            window.addScoreToLeaderboard(player || 'Guest', score);
            if (typeof window.renderLeaderboard === 'function') window.renderLeaderboard();
        } else {
            // fallback: store directly (same format as auth.js)
            const raw = localStorage.getItem('tetoris_leaderboard');
            let lb = [];
            try { lb = raw ? JSON.parse(raw) : []; } catch (e) { lb = []; }
            lb.push({ name: player, score, date: new Date().toISOString() });
            lb.sort((a,b) => b.score - a.score || new Date(b.date) - new Date(a.date));
            localStorage.setItem('tetoris_leaderboard', JSON.stringify(lb.slice(0,10)));
        }
    } catch (err) {
        console.warn('Leaderboard save error', err);
    }
}

function drawBoard() {
    if (!ctx) return;
    ctx.fillStyle = COLORS.EMPTY;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            if (board[y][x]) drawBlock(x, y, board[y][x], ctx, BLOCK_SIZE);
        }
    }
}

function drawPiece(piece) {
    if (!piece) return;
    const shape = piece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) drawBlock(piece.x + x, piece.y + y, piece.color, ctx, BLOCK_SIZE);
        }
    }
}

function getGhostPiecePosition(piece) {
    const ghostPiece = { ...piece, y: piece.y };
    while (!checkCollisionForPiece(ghostPiece)) ghostPiece.y++;
    ghostPiece.y--;
    return ghostPiece;
}

function checkCollisionForPiece(piece) {
    const shape = piece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = piece.x + x;
                const newY = piece.y + y;
                if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
                if (newY >= 0 && board[newY][newX]) return true;
            }
        }
    }
    return false;
}

function drawGhostPiece(piece) {
    if (!piece) return;
    const ghostPiece = getGhostPiecePosition(piece);
    if (ghostPiece.y <= piece.y) return;

    const shape = ghostPiece.shape;
    ctx.globalAlpha = COLORS.GHOST_OPACITY;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) drawBlock(ghostPiece.x + x, ghostPiece.y + y, piece.color, ctx, BLOCK_SIZE);
        }
    }
    ctx.globalAlpha = 1.0;
}

function drawBlock(x, y, color, context, size) {
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);

    const gradient = context.createLinearGradient(x * size, y * size, x * size + size, y * size + size);
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
    context.fillStyle = gradient;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawNextPiece() {
    if (!nextCtx) return;
    nextCtx.fillStyle = COLORS.EMPTY;
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;
    const shape = nextPiece.shape;
    const offsetX = (4 - shape[0].length) / 2;
    const offsetY = (4 - shape.length) / 2;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) drawBlock(offsetX + x, offsetY + y, nextPiece.color, nextCtx, NEXT_BLOCK_SIZE);
        }
    }
}

function updateScore() {
    const el = document.getElementById('score');
    if (el) el.textContent = score;
}

function updateLevel() {
    const el = document.getElementById('level');
    if (el) el.textContent = level;
}

function updateLines() {
    const el = document.getElementById('lines');
    if (el) el.textContent = lines;
}

function initBackgroundMusic() {
    backgroundMusic = new Audio('music/01 Tetoris.flac');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;
    backgroundMusic.addEventListener('error', function (e) {
        console.log('Error loading background music:', e);
    });
}

function playBackgroundMusic() {
    if (!backgroundMusic) initBackgroundMusic();
    if (backgroundMusic && !isMusicPlaying) {
        backgroundMusic.play().then(() => { isMusicPlaying = true; }).catch(error => { console.log('Could not play music:', error); });
    }
}

function stopBackgroundMusic() {
    if (backgroundMusic && isMusicPlaying) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        isMusicPlaying = false;
    }
}

// Start initialization
window.addEventListener('load', init);
