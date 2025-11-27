// --- CONSTANTES Y VARIABLES GLOBALES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensiones del juego
const GRID_SIZE = 20; // 20x20 celdas
const CELL_SIZE = canvas.width / GRID_SIZE; // 600px / 20 = 30px

// Estado del juego
let snake = [];
let food = {}; // El "ratón"
let dx = 0; // Dirección X
let dy = 0; // Dirección Y
let score = 0;
let lives = 3;
let level = 1;
let miceEaten = 0;
let gameLoopInterval = null;
let gameSpeedMs = 150; // Velocidad por defecto (Fácil)
let isPaused = false;
let playerName = "Jugador 1";
let snakeColor = '#48BB78'; // Color por defecto (Verde)
let timeElapsed = 0;
let timerInterval = null;
let lastDirection = 'right';
let growSnake = false; // Nueva variable para controlar el crecimiento

// Mapeo de colores
const COLOR_MAP = {
    green: '#48BB78',
    blue: '#4C51BF',
    red: '#E53E3E',
    purple: '#9F7AEA'
};

// --- MANEJO DE LA INTERFAZ Y PANTALLAS ---
const $ = (id) => document.getElementById(id);

const setupScreen = $('setupScreen');
const gameScreen = $('gameScreen');
const gameOverScreen = $('gameOver');
const pausePanel = $('pausePanel');
const nameAlert = $('nameAlert');
const highScoreDisplay = $('highScoreDisplay');

// Función para cambiar de pantalla
function switchScreen(activeScreen) {
    const screens = [setupScreen, gameScreen, gameOverScreen, pausePanel];
    screens.forEach(screen => {
        screen.style.display = 'none';
        screen.classList.remove('active');
    });
    activeScreen.style.display = 'flex';
    if (activeScreen === setupScreen) {
        activeScreen.classList.add('active'); // Para mantener el flujo de layout original
    }
}

// Inicializar la Puntuación Máxima al cargar
document.addEventListener('DOMContentLoaded', () => {
    loadHighScore();
    // Asegurar que solo la pantalla de configuración sea visible al inicio
    switchScreen(setupScreen); 
});

// --- GESTIÓN DE LOCAL STORAGE (High Score) ---
function loadHighScore() {
    const highscore = localStorage.getItem('snakeJinxHighScore') || 0;
    highScoreDisplay.textContent = highscore;
}

function updateHighScore(newScore) {
    const currentHighscore = parseInt(localStorage.getItem('snakeJinxHighScore') || 0);
    if (newScore > currentHighscore) {
        localStorage.setItem('snakeJinxHighScore', newScore);
        $('newRecord').classList.remove('hidden');
    } else {
        $('newRecord').classList.add('hidden');
    }
}

// --- EVENTOS DE CONFIGURACIÓN ---

// Selector de color de la serpiente
document.querySelectorAll('.snake-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.snake-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        snakeColor = COLOR_MAP[option.getAttribute('data-snake')];
    });
});

// Selector de dificultad
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameSpeedMs = parseInt(btn.getAttribute('data-diff'));
    });
});

// Botón COMENZAR JUEGO
$('startGameBtn').addEventListener('click', () => {
    const nameInput = $('playerName').value.trim();
    if (nameInput === "") {
        nameAlert.classList.remove('hidden');
        return;
    }
    nameAlert.classList.add('hidden');
    playerName = nameInput;
    switchScreen(gameScreen);
    startGame();
});

// --- LÓGICA DE INICIO Y RESETEO ---

function initGame() {
    // Reiniciar estado
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dx = 1; 
    dy = 0;
    score = 0;
    lives = 3;
    level = 1;
    miceEaten = 0;
    timeElapsed = 0;
    isPaused = false;
    lastDirection = 'right';
    growSnake = false; // Resetear el flag de crecimiento

    // Limpiar intervalos si existen
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (timerInterval) clearInterval(timerInterval);
    
    // Colocar comida inicial y actualizar UI
    placeFood();
    updateUI();
}

function startGame() {
    initGame();
    
    // Iniciar el loop de juego
    gameLoopInterval = setInterval(main, gameSpeedMs);
    
    // Iniciar el temporizador
    timerInterval = setInterval(updateTimer, 1000);

    // Escuchar inputs solo cuando el juego está activo
    document.addEventListener('keydown', changeDirection);
}

// --- BUCLE PRINCIPAL Y DIBUJO ---

function main() {
    if (isPaused) return;

    // 1. Mover la serpiente
    moveSnake();

    // 2. Comprobar colisiones
    if (checkWallCollision() || checkSelfCollision()) {
        handleCollision();
    }

    // 3. Comprobar si come la comida
    if (checkFoodEaten()) {
        handleFoodEaten();
    }

    // 4. Dibujar
    drawGame();
}

function drawGame() {
    // Limpiar Canvas
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar Comida (Ratón)
    drawFood();
    
    // Dibujar Serpiente
    drawSnake();
}

function drawSnake() {
    snake.forEach((segment, index) => {
        // Color de la cabeza ligeramente diferente o un pequeño borde
        if (index === 0) {
            ctx.fillStyle = snakeColor;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            // Dibujar círculo más grande para la cabeza
            ctx.arc(segment.x * CELL_SIZE + CELL_SIZE / 2, 
                    segment.y * CELL_SIZE + CELL_SIZE / 2, 
                    CELL_SIZE / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillStyle = snakeColor;
            ctx.strokeStyle = '#1a202c';
            ctx.lineWidth = 1;
            ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    });
}

function drawFood() {
     // Usar un emoji o un color contrastante para el ratón (food)
    ctx.font = `${CELL_SIZE}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Dibujamos el emoji de Ratón
    ctx.fillText('🐁', food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2);
}

// --- MOVIMIENTO Y LÓGICA DE POSICIÓN ---

function moveSnake() {
    // Crea la nueva cabeza
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Añade la nueva cabeza al inicio del cuerpo
    snake.unshift(head);
    
    // Solo eliminar la cola si no está creciendo
    if (!growSnake) {
        snake.pop();
    } else {
        growSnake = false; // Resetear el flag después de crecer
    }
}

function placeFood() {
    let newFoodPosition;
    do {
        newFoodPosition = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
    } while (isSnake(newFoodPosition)); // Asegura que no aparezca sobre la serpiente

    food = newFoodPosition;
}

function isSnake(pos) {
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

// --- COLISIONES Y EVENTOS ---

function checkWallCollision() {
    const headX = snake[0].x;
    const headY = snake[0].y;
    return headX < 0 || headX >= GRID_SIZE || headY < 0 || headY >= GRID_SIZE;
}

function checkSelfCollision() {
    const head = snake[0];
    // Comprueba si la cabeza colisiona con cualquier segmento del cuerpo (a partir del índice 1)
    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) return true;
    }
    return false;
}

function handleCollision() {
    lives--;
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reiniciar posición y dirección tras perder una vida
        ctx.globalAlpha = 0.5; // Efecto de parpadeo
        setTimeout(() => ctx.globalAlpha = 1.0, 200);

        snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dx = 1; 
        dy = 0;
        lastDirection = 'right';
        growSnake = false; // Resetear el flag de crecimiento
        updateUI();
    }
}

function checkFoodEaten() {
    const head = snake[0];
    return head.x === food.x && head.y === food.y;
}

function handleFoodEaten() {
    score += 10;
    miceEaten++;
    
    // Marcar que la serpiente debe crecer en el próximo movimiento
    growSnake = true;
    
    // Colocar nueva comida
    placeFood();
    
    // Comprobar avance de nivel (e.g., cada 5 ratones)
    if (miceEaten % 5 === 0) {
        levelUp();
    }

    updateUI();
}

function levelUp() {
    level++;
    // Aumentar la velocidad solo si el intervalo de velocidad lo permite (más difícil)
    // La velocidad mínima es 70ms (Dificultad Difícil)
    if (gameSpeedMs > 70) {
        gameSpeedMs = Math.max(70, gameSpeedMs - 5);
        clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(main, gameSpeedMs);
    }
}

// --- INTERFAZ DE USUARIO (UI) ---

function updateUI() {
    $('playerInfo').textContent = `Jugador: ${playerName}`;
    $('score').textContent = `Puntuación: ${score}`;
    $('levelInfo').textContent = `Nivel: ${level}`;
    $('miceCounter').textContent = `🐁: ${miceEaten}`;
    
    // Actualizar corazones
    let heartsHtml = '';
    for (let i = 0; i < 5; i++) {
        heartsHtml += i < lives ? '❤️ ' : '🤍 ';
    }
    $('heartsContainer').textContent = heartsHtml.trim();
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function updateTimer() {
    if (!isPaused) {
        timeElapsed++;
        $('gameTimer').textContent = `Tiempo: ${formatTime(timeElapsed)}`;
    }
}

// --- GESTIÓN DEL JUEGO (Pausa / Fin) ---

function pauseGame() {
    if (!gameLoopInterval) return;
    isPaused = true;
    clearInterval(gameLoopInterval);
    switchScreen(pausePanel);
}

function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    switchScreen(gameScreen);
    gameLoopInterval = setInterval(main, gameSpeedMs);
}

function gameOver() {
    clearInterval(gameLoopInterval);
    clearInterval(timerInterval);
    document.removeEventListener('keydown', changeDirection);

    updateHighScore(score);
    loadHighScore(); // Recargar el high score para mostrarlo en la pantalla de setup

    $('finalScore').textContent = `Tu Puntuación: ${score}`;
    $('finalStats').innerHTML = `
        <p>Nivel Alcanzado: ${level}</p>
        <p>Ratones Comidos: ${miceEaten}</p>
        <p>Tiempo Jugado: ${formatTime(timeElapsed)}</p>
    `;
    
    switchScreen(gameOverScreen);
}

// --- CONTROL DE DIRECCIÓN Y EVENTOS DE BOTONES ---

function changeDirection(event) {
    const keyPressed = event.key;
    let newDx = dx;
    let newDy = dy;
    let newDir = lastDirection;

    switch (keyPressed) {
        case 'ArrowUp':
        case 'w':
            if (lastDirection !== 'down') { newDy = -1; newDx = 0; newDir = 'up'; }
            break;
        case 'ArrowDown':
        case 's':
            if (lastDirection !== 'up') { newDy = 1; newDx = 0; newDir = 'down'; }
            break;
        case 'ArrowLeft':
        case 'a':
            if (lastDirection !== 'right') { newDx = -1; newDy = 0; newDir = 'left'; }
            break;
        case 'ArrowRight':
        case 'd':
            if (lastDirection !== 'left') { newDx = 1; newDy = 0; newDir = 'right'; }
            break;
        case ' ': // Espacio para pausa
            isPaused ? resumeGame() : pauseGame();
            break;
    }
    
    // Aplicar la nueva dirección si es válida
    if (newDir !== lastDirection) {
        dx = newDx;
        dy = newDy;
        lastDirection = newDir;
    }
}

// Manejo de eventos de botones
$('pauseBtn').addEventListener('click', pauseGame);
$('resumeBtn').addEventListener('click', resumeGame);
$('restartBtn').addEventListener('click', () => {
    switchScreen(gameScreen);
    startGame();
});

// Botones de Menú Principal
const backToSetup = () => {
    clearInterval(gameLoopInterval);
    clearInterval(timerInterval);
    document.removeEventListener('keydown', changeDirection);
    switchScreen(setupScreen);
};

$('menuBtn').addEventListener('click', backToSetup);
$('backToSetupBtn').addEventListener('click', backToSetup);
$('menuFromPauseBtn').addEventListener('click', backToSetup);

// Controles Táctiles (Móviles)
document.querySelectorAll('.arrow-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const dir = e.target.getAttribute('data-dir');
        // Simular el cambio de dirección sin un evento keydown completo
        switch (dir) {
            case 'up':
                if (lastDirection !== 'down') { dx = 0; dy = -1; lastDirection = 'up'; }
                break;
            case 'down':
                if (lastDirection !== 'up') { dx = 0; dy = 1; lastDirection = 'down'; }
                break;
            case 'left':
                if (lastDirection !== 'right') { dx = -1; dy = 0; lastDirection = 'left'; }
                break;
            case 'right':
                if (lastDirection !== 'left') { dx = 1; dy = 0; lastDirection = 'right'; }
                break;
        }
    });
});