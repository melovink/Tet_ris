// Tetris Game Logic with Nord Theme Colors and Random Mode

// Game Constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 30;

// Nord Theme Colors for Tetrominos
const COLORS = {
    I: '#88C0D0', // Nord8 - Frost
    O: '#EBCB8B', // Nord13 - Aurora Yellow
    T: '#B48EAD', // Nord15 - Aurora Purple
    S: '#A3BE8C', // Nord14 - Aurora Green
    Z: '#BF616A', // Nord11 - Aurora Red
    J: '#5E81AC', // Nord10 - Frost Blue
    L: '#D08770', // Nord12 - Aurora Orange
    EMPTY: '#2E3440', // Nord0 - Background
    GRID: '#3B4252', // Nord1 - Grid lines
    GHOST_OPACITY: 0.3 // Opacity for ghost piece preview
};

// Tetromino Shapes
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

// Game State
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
let gameMode = 'classic'; // 'classic' or 'random'

// Random Mode specific variables
let mutationCounter = 0;
let mutationInterval = 2000; // 2 seconds
let mutationWarningElement = null;

// Background Music
let backgroundMusic = null;
let isMusicPlaying = false;

// 7-Bag Randomizer (prevents repetitive pieces)
let pieceBag = [];

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('nextCanvas');
    nextCtx = nextCanvas.getContext('2d');

    // Initialize board
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

    // Initialize background music
    initBackgroundMusic();

    // Event listeners
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('difficultySlider').addEventListener('input', updateDifficulty);
    document.addEventListener('keydown', handleKeyPress);

    // Mode selector
    document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            gameMode = e.target.value;
        });
    });

    // Initial draw
    drawBoard();
    drawNextPiece();
}

// Update difficulty
function updateDifficulty(e) {
    difficulty = parseInt(e.target.value);
    document.getElementById('difficultyValue').textContent = difficulty;

    // Update drop interval based on difficulty
    if (gameRunning) {
        updateDropInterval();
    }
}

function updateDropInterval() {
    // Base interval decreases with difficulty (1-10 scale)
    // Easy (1): 1000ms, Hard (10): 100ms
    const baseInterval = 1100 - (difficulty * 100);
    // Further decrease with level
    dropInterval = Math.max(100, baseInterval - (level - 1) * 50);
}

// Start game
function startGame() {
    if (gameRunning) return;

    // Reset game state
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

    // Hide game over screen
    document.getElementById('gameOver').classList.add('hidden');

    // Remove any existing mutation warning
    if (mutationWarningElement) {
        mutationWarningElement.remove();
        mutationWarningElement = null;
    }

    // Create first pieces
    nextPiece = createPiece();
    currentPiece = createPiece();
    nextPiece = createPiece();

    drawNextPiece();

    // Start background music
    playBackgroundMusic();

    // Start game loop
    requestAnimationFrame(update);
}

// Restart game
function restartGame() {
    startGame();
}

// Create random piece using 7-bag randomizer
function createPiece() {
    // If bag is empty, refill it with all 7 piece types
    if (pieceBag.length === 0) {
        pieceBag = Object.keys(SHAPES);
        // Shuffle the bag using Fisher-Yates algorithm
        for (let i = pieceBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pieceBag[i], pieceBag[j]] = [pieceBag[j], pieceBag[i]];
        }
    }

    // Take the next piece from the bag
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

// Mutate current piece to random shape (Random Mode)
function mutateCurrentPiece() {
    if (gameMode !== 'random' || !currentPiece) return;

    // Get all piece types
    const types = Object.keys(SHAPES);
    
    // Get random type (can be same as current)
    const newType = types[Math.floor(Math.random() * types.length)];
    const newShapes = SHAPES[newType];
    const newRotation = Math.floor(Math.random() * newShapes.length);

    // Store old position
    const oldX = currentPiece.x;
    const oldY = currentPiece.y;

    // Update piece
    currentPiece.type = newType;
    currentPiece.shape = newShapes[newRotation];
    currentPiece.rotation = newRotation;
    currentPiece.color = COLORS[newType];

    // Check if new shape causes collision
    if (checkCollision()) {
        // Try to adjust position slightly
        let adjusted = false;
        
        // Try moving left/right
        for (let offset = -2; offset <= 2; offset++) {
            currentPiece.x = oldX + offset;
            if (!checkCollision()) {
                adjusted = true;
                break;
            }
        }

        // If still colliding, try moving up
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

        // If still can't adjust, revert (rare case)
        if (!adjusted) {
            currentPiece.y = oldY;
        }
    }

    // Show mutation warning
    showMutationWarning();
}

// Show mutation warning popup
function showMutationWarning() {
    // Remove existing warning if any
    if (mutationWarningElement) {
        mutationWarningElement.remove();
    }

    // Create warning element
    mutationWarningElement = document.createElement('div');
    mutationWarningElement.className = 'mutation-warning';
    mutationWarningElement.textContent = '⚡ SHAPE CHANGED!';
    
    document.querySelector('.game-area').appendChild(mutationWarningElement);

    // Remove after 1 second
    setTimeout(() => {
        if (mutationWarningElement) {
            mutationWarningElement.remove();
            mutationWarningElement = null;
        }
    }, 1000);
}

// Game loop
function update(time = 0) {
    if (!gameRunning || gamePaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    // Random Mode: Mutation timer
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
    drawGhostPiece(currentPiece);
    drawPiece(currentPiece);

    gameLoop = requestAnimationFrame(update);
}

// Handle keyboard input
function handleKeyPress(e) {
    if (!gameRunning || gamePaused) {
        if (e.key === 'p' || e.key === 'P') {
            togglePause();
        }
        return;
    }

    switch (e.key) {
        case 'ArrowLeft':
            moveLeft();
            break;
        case 'ArrowRight':
            moveRight();
            break;
        case 'ArrowDown':
            moveDown();
            break;
        case 'ArrowUp':
            rotate();
            break;
        case ' ':
            hardDrop();
            break;
        case 'p':
        case 'P':
            togglePause();
            break;
    }

    e.preventDefault();
}

// Toggle pause
function togglePause() {
    if (!gameRunning) return;

    gamePaused = !gamePaused;

    if (!gamePaused) {
        lastTime = performance.now();
        requestAnimationFrame(update);
    }
}

// Movement functions
function moveLeft() {
    currentPiece.x--;
    if (checkCollision()) {
        currentPiece.x++;
    } else {
        drawBoard();
        drawGhostPiece(currentPiece);
        drawPiece(currentPiece);
    }
}

function moveRight() {
    currentPiece.x++;
    if (checkCollision()) {
        currentPiece.x--;
    } else {
        drawBoard();
        drawGhostPiece(currentPiece);
        drawPiece(currentPiece);
    }
}

function moveDown() {
    currentPiece.y++;
    if (checkCollision()) {
        currentPiece.y--;
        lockPiece();
        clearLines();
        spawnNewPiece();
    }
}

function rotate() {
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
    while (!checkCollision()) {
        currentPiece.y++;
    }
    currentPiece.y--;
    lockPiece();
    clearLines();
    spawnNewPiece();
}

// Check collision
function checkCollision() {
    const shape = currentPiece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = currentPiece.x + x;
                const newY = currentPiece.y + y;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Lock piece to board
function lockPiece() {
    const shape = currentPiece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            linesCleared++;
            y++; // Check same row again
        }
    }

    if (linesCleared > 0) {
        lines += linesCleared;

        // Scoring: 100 for 1 line, 300 for 2, 500 for 3, 800 for 4
        const points = [0, 100, 300, 500, 800];
        // Difficulty multiplier: higher difficulty = more points
        const difficultyMultiplier = 1 + (difficulty - 1) * 0.2;
        score += Math.floor(points[linesCleared] * level * difficultyMultiplier);

        // Level up every 10 lines
        level = Math.floor(lines / 10) + 1;

        updateScore();
        updateLevel();
        updateLines();
        updateDropInterval();
    }
}

// Spawn new piece
function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createPiece();

    // Reset mutation counter for new piece in Random Mode
    if (gameMode === 'random') {
        mutationCounter = 0;
    }

    drawNextPiece();

    if (checkCollision()) {
        gameOver();
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    gamePaused = false;

    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
    }

    // Stop background music
    stopBackgroundMusic();

    // Remove mutation warning if exists
    if (mutationWarningElement) {
        mutationWarningElement.remove();
        mutationWarningElement = null;
    }

    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// Drawing functions
function drawBoard() {
    // Clear canvas
    ctx.fillStyle = COLORS.EMPTY;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            // Draw grid lines
            ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

            // Draw locked pieces
            if (board[y][x]) {
                drawBlock(x, y, board[y][x], ctx, BLOCK_SIZE);
            }
        }
    }
}

function drawPiece(piece) {
    const shape = piece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                drawBlock(piece.x + x, piece.y + y, piece.color, ctx, BLOCK_SIZE);
            }
        }
    }
}

// Calculate ghost piece position
function getGhostPiecePosition(piece) {
    const ghostPiece = {
        ...piece,
        y: piece.y
    };

    // Move down until collision
    while (!checkCollisionForPiece(ghostPiece)) {
        ghostPiece.y++;
    }
    ghostPiece.y--;

    return ghostPiece;
}

// Check collision for a specific piece
function checkCollisionForPiece(piece) {
    const shape = piece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = piece.x + x;
                const newY = piece.y + y;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Draw ghost piece
function drawGhostPiece(piece) {
    const ghostPiece = getGhostPiecePosition(piece);

    if (ghostPiece.y <= piece.y) return;

    const shape = ghostPiece.shape;
    ctx.globalAlpha = COLORS.GHOST_OPACITY;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                drawBlock(ghostPiece.x + x, ghostPiece.y + y, piece.color, ctx, BLOCK_SIZE);
            }
        }
    }

    ctx.globalAlpha = 1.0;
}

function drawBlock(x, y, color, context, size) {
    // Main block
    context.fillStyle = color;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);

    // Highlight effect
    const gradient = context.createLinearGradient(
        x * size, y * size,
        x * size + size, y * size + size
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');

    context.fillStyle = gradient;
    context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
}

function drawNextPiece() {
    // Clear canvas
    nextCtx.fillStyle = COLORS.EMPTY;
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const shape = nextPiece.shape;
    const offsetX = (4 - shape[0].length) / 2;
    const offsetY = (4 - shape.length) / 2;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                drawBlock(offsetX + x, offsetY + y, nextPiece.color, nextCtx, NEXT_BLOCK_SIZE);
            }
        }
    }
}

// Update UI
function updateScore() {
    document.getElementById('score').textContent = score;
}

function updateLevel() {
    document.getElementById('level').textContent = level;
}

function updateLines() {
    document.getElementById('lines').textContent = lines;
}

// Background Music Functions
function initBackgroundMusic() {
    backgroundMusic = new Audio('music/01 Tetoris.flac');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;

    backgroundMusic.addEventListener('error', function (e) {
        console.log('Error loading background music:', e);
    });
}

function playBackgroundMusic() {
    if (backgroundMusic && !isMusicPlaying) {
        backgroundMusic.play().then(() => {
            isMusicPlaying = true;
        }).catch(error => {
            console.log('Could not play music:', error);
        });
    }
}

function stopBackgroundMusic() {
    if (backgroundMusic && isMusicPlaying) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        isMusicPlaying = false;
    }
}

// Initialize game when page loads
window.addEventListener('load', init);
