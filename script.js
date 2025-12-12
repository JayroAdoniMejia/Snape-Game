// --- CONSTANTES Y VARIABLES GLOBALES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensiones del juego
const GRID_SIZE = 20; // 20x20 celdas
const CELL_SIZE = canvas.width / GRID_SIZE; // 600px / 20 = 30px

// Definición de objetos trampa - TODAS VISIBLES
const TRAP_OBJECTS = [
    { emoji: '🔪', name: 'Cuchillo', color: '#FFD700', dangerous: true, shadowColor: '#FF0000', type: 'knife' },
    { emoji: '⛓️', name: 'Cadena', color: '#C0C0C0', dangerous: true, shadowColor: '#808080', type: 'chain' },
    { emoji: '💣', name: 'Bomba', color: '#FF0000', dangerous: true, shadowColor: '#FF4500', type: 'bomb' },
    { emoji: '🪚', name: 'Motocierra', color: '#8B4513', dangerous: true, shadowColor: '#D2691E', type: 'chainsaw' },
    { emoji: '🕸️', name: 'Red', color: '#FFFFFF', dangerous: true, shadowColor: '#F0F8FF', type: 'web' },
    { emoji: '🗡️', name: 'Espada', color: '#6495ED', dangerous: true, shadowColor: '#4169E1', type: 'sword' },
    { emoji: '🧨', name: 'Explosivo', color: '#FF4500', dangerous: true, shadowColor: '#FF6347', type: 'explosive' },
    { emoji: '⚔️', name: 'Daga', color: '#B0C4DE', dangerous: true, shadowColor: '#778899', type: 'dagger' },
    { emoji: '🔫', name: 'Pistola', color: '#2F4F4F', dangerous: true, shadowColor: '#696969', type: 'gun' },
    { emoji: '🏹', name: 'Arco', color: '#DAA520', dangerous: true, shadowColor: '#B8860B', type: 'bow' }
];

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
let isPaused = false;
let playerName = "Jugador 1";
let snakeColor = '#48BB78'; // Color por defecto (Verde)
let timeElapsed = 0;
let timerInterval = null;
let lastDirection = 'right';
let growSnake = false;
let mouseMoveCounter = 0; // Contador para movimiento más frecuente
let mouseDirection = null; // Dirección actual del ratón
let mouseSpeed = 1; // Velocidad base del ratón
let mouseAgility = 0.7; // Probabilidad de cambiar dirección

// Variables para objetos trampa
let trapObjects = [];
let lastTrapChange = Date.now();
let trapChangeTime = 35; // segundos
let trapChangeTimer = null;
let collisionCooldown = false; // Para evitar múltiples colisiones rápidas
let trapTimerElement = null; // Referencia al elemento del temporizador

// Sistema de dificultad
let gameSpeedMs = 150; // Velocidad inicial
let currentDifficulty = 'easy';

// Mapeo de colores
const COLOR_MAP = {
    green: '#48BB78',
    blue: '#4C51BF',
    red: '#E53E3E',
    purple: '#9F7AEA'
};

// Sistema de dificultad actualizado
const DIFFICULTY_SETTINGS = {
    easy: { 
        speed: 150,  // 150ms entre movimientos - MÁS LENTO
        obstacleCount: 4, 
        powerupChance: 0.3, 
        growthRate: 1, 
        enemyCount: 0,
        mouseSpeed: 1,
        mouseAgility: 0.5
    },
    normal: { 
        speed: 120,  // 120ms entre movimientos
        obstacleCount: 5, 
        powerupChance: 0.2, 
        growthRate: 2, 
        enemyCount: 0,
        mouseSpeed: 1.5,
        mouseAgility: 0.6
    },
    hard: { 
        speed: 90,   // 90ms entre movimientos - MÁS RÁPIDO
        obstacleCount: 6, 
        powerupChance: 0.1, 
        growthRate: 3, 
        enemyCount: 0,
        mouseSpeed: 2,
        mouseAgility: 0.7
    }
};

// Direcciones posibles para el ratón
const MOUSE_DIRECTIONS = [
    { dx: 1, dy: 0 },   // derecha
    { dx: -1, dy: 0 },  // izquierda
    { dx: 0, dy: 1 },   // abajo
    { dx: 0, dy: -1 }   // arriba
];

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
    
    // Ocultar temporizador de trampas si no estamos en la pantalla de juego
    if (activeScreen !== gameScreen && trapTimerElement) {
        trapTimerElement.style.display = 'none';
    }
    
    if (activeScreen === setupScreen) {
        activeScreen.classList.add('active');
    }
}

// Inicializar la Puntuación Máxima al cargar
document.addEventListener('DOMContentLoaded', () => {
    loadHighScore();
    switchScreen(setupScreen);
    createTrapTimerElement();
    setupCanvasGradient();
    setupDifficultyButtons();
});

// Configurar botones de dificultad
function setupDifficultyButtons() {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentDifficulty = btn.getAttribute('data-diff');
            gameSpeedMs = DIFFICULTY_SETTINGS[currentDifficulty].speed;
            
            // Actualizar la descripción de la dificultad
            const desc = document.getElementById('difficultyDescription');
            const descriptions = {
                easy: 'Velocidad lenta, menos trampas, ideal para principiantes',
                normal: 'Velocidad moderada, trampas equilibradas, desafío estándar',
                hard: 'Velocidad rápida, más trampas, para expertos'
            };
            
            if (desc) {
                desc.textContent = descriptions[currentDifficulty] || 'Selecciona una dificultad';
            }
        });
    });
}

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
document.querySelectorAll('.snake-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.snake-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        snakeColor = COLOR_MAP[option.getAttribute('data-snake')];
    });
});

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
    // REINICIAR SERPIENTE - SOLO 3 SEGMENTOS (PEQUEÑA)
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dx = 1; 
    dy = 0;
    score = 0;
    lives = 3;
    level = 1;
    miceEaten = 0;  // RESET CONTADOR DE RATONES
    timeElapsed = 0;
    isPaused = false;
    lastDirection = 'right';
    growSnake = false;  // Asegurar que no esté creciendo
    mouseMoveCounter = 0;
    mouseDirection = MOUSE_DIRECTIONS[Math.floor(Math.random() * 4)];
    
    // Configurar parámetros según dificultad
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    gameSpeedMs = settings.speed;
    mouseSpeed = settings.mouseSpeed;
    mouseAgility = settings.mouseAgility;
    
    // Reiniciar variables de objetos trampa
    trapObjects = [];
    lastTrapChange = Date.now();
    collisionCooldown = false;

    // Limpiar intervalos si existen
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (timerInterval) clearInterval(timerInterval);
    if (trapChangeTimer) clearInterval(trapChangeTimer);
    
    placeFood();
    generateTraps();
    startTrapChangeTimer();
    updateUI();  // Esto actualizará el contador de ratones a 0
}

function startGame() {
    initGame();
    
    // Iniciar el loop de juego con la velocidad correcta
    gameLoopInterval = setInterval(main, gameSpeedMs);
    timerInterval = setInterval(updateTimer, 1000);
    document.addEventListener('keydown', changeDirection);
    
    // Mostrar temporizador de trampas al iniciar juego
    if (trapTimerElement) {
        trapTimerElement.style.display = 'block';
    }
}

// --- BUCLE PRINCIPAL Y DIBUJO ---
function main() {
    if (isPaused) return;

    // 1. Comprobar si come la comida - HACER ESTO PRIMERO
    const ateFood = checkFoodEaten();
    if (ateFood) {
        handleFoodEaten();
    }

    // 2. Mover la serpiente
    moveSnake();

    // 3. Mover el ratón (más frecuente)
    moveMouse();

    // 4. Solo hacer pop() si NO comió comida y no está creciendo
    if (!ateFood && !growSnake) {
        snake.pop();
    }

    // 5. Resetear growSnake si estaba creciendo
    if (growSnake) {
        growSnake = false;
    }

    // 6. Comprobar colisiones con paredes y serpiente
    if (checkWallCollision() || checkSelfCollision()) {
        handleCollision();
    }

    // 7. Comprobar colisión con trampas (solo si no hay cooldown)
    if (!collisionCooldown && checkTrapCollision()) {
        handleTrapCollision();
    }

    // 8. Actualizar temporizador de trampas
    updateTrapTimerDisplay();

    // 9. Dibujar
    drawGame();
}

function drawGame() {
    // Fondo con gradiente
    drawBackground();
    
    // Dibujar Trampas - ANTES de la comida y serpiente
    drawTraps();
    
    // Dibujar Comida (Ratón)
    drawFood();
    
    // Dibujar Serpiente
    drawSnake();
}

function drawBackground() {
    // Gradiente más oscuro para mejor contraste
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#121230');
    gradient.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    snake.forEach((segment, index) => {
        if (index === 0) {
            // Cabeza de la serpiente con efecto especial
            ctx.fillStyle = snakeColor;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(segment.x * CELL_SIZE + CELL_SIZE / 2, 
                    segment.y * CELL_SIZE + CELL_SIZE / 2, 
                    CELL_SIZE / 2, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            
            // Ojos de la serpiente
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(segment.x * CELL_SIZE + CELL_SIZE * 0.7, 
                   segment.y * CELL_SIZE + CELL_SIZE * 0.3, 
                   CELL_SIZE * 0.1, 0, Math.PI * 2);
            ctx.arc(segment.x * CELL_SIZE + CELL_SIZE * 0.7, 
                   segment.y * CELL_SIZE + CELL_SIZE * 0.7, 
                   CELL_SIZE * 0.1, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Cuerpo de la serpiente
            ctx.fillStyle = snakeColor;
            ctx.strokeStyle = darkenColor(snakeColor, 0.3);
            ctx.lineWidth = 1;
            ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    });
}

function drawFood() {
    // Dibujar el ratón con sombra y detalle
    const centerX = food.x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = food.y * CELL_SIZE + CELL_SIZE / 2;
    
    // Sombra del ratón
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Cuerpo del ratón (círculo gris)
    ctx.fillStyle = '#A9A9A9';
    ctx.beginPath();
    ctx.arc(centerX, centerY, CELL_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Orejas
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.arc(centerX - CELL_SIZE * 0.25, centerY - CELL_SIZE * 0.3, CELL_SIZE * 0.15, 0, Math.PI * 2);
    ctx.arc(centerX + CELL_SIZE * 0.25, centerY - CELL_SIZE * 0.3, CELL_SIZE * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // Cola
    ctx.strokeStyle = '#696969';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX + CELL_SIZE * 0.3, centerY);
    ctx.lineTo(centerX + CELL_SIZE * 0.5, centerY + CELL_SIZE * 0.1);
    ctx.lineTo(centerX + CELL_SIZE * 0.4, centerY);
    ctx.stroke();
    
    // Resetear sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawTraps() {
    const time = Date.now() / 1000; // Para animaciones
    
    trapObjects.forEach(trap => {
        const centerX = trap.x * CELL_SIZE + CELL_SIZE / 2;
        const centerY = trap.y * CELL_SIZE + CELL_SIZE / 2;
        
        // Guardar estado del contexto
        ctx.save();
        
        // Aplicar animación de flotar suave
        const floatOffset = Math.sin(time + trap.x + trap.y) * 2;
        ctx.translate(0, floatOffset);
        
        // Dibujar según el tipo de trampa con efectos especiales
        switch(trap.type) {
            case 'knife':
                drawKnifeTrap(centerX, centerY, trap);
                break;
            case 'bomb':
                drawBombTrap(centerX, centerY, trap, time);
                break;
            case 'chainsaw':
                drawChainsawTrap(centerX, centerY, trap, time);
                break;
            case 'web':
                drawWebTrap(centerX, centerY, trap);
                break;
            case 'sword':
                drawSwordTrap(centerX, centerY, trap);
                break;
            case 'explosive':
                drawExplosiveTrap(centerX, centerY, trap, time);
                break;
            case 'gun':
                drawGunTrap(centerX, centerY, trap);
                break;
            case 'bow':
                drawBowTrap(centerX, centerY, trap);
                break;
            default:
                drawGenericTrap(centerX, centerY, trap);
        }
        
        // Restaurar estado del contexto
        ctx.restore();
    });
}

// Funciones específicas para dibujar diferentes tipos de trampas
function drawKnifeTrap(x, y, trap) {
    // Base circular brillante
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, CELL_SIZE * 0.5);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.7, '#FF8C00');
    gradient.addColorStop(1, '#FF4500');
    
    // Sombra externa
    ctx.shadowColor = trap.shadowColor;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Base
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Borde
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Restablecer sombra
    ctx.shadowColor = 'transparent';
    
    // Emoji del cuchillo
    ctx.font = `${CELL_SIZE * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(trap.emoji, x, y);
    
    // Efecto de destello
    if (Math.sin(Date.now() / 200) > 0.5) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x, y, CELL_SIZE * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function drawBombTrap(x, y, trap, time) {
    // Base circular con gradiente
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, CELL_SIZE * 0.5);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, trap.color);
    gradient.addColorStop(1, '#8B0000');
    
    // Efecto de parpadeo para bomba
    const blink = Math.sin(time * 5) > 0 ? 1 : 0.7;
    
    ctx.fillStyle = gradient;
    ctx.globalAlpha = blink;
    
    // Círculo exterior
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Mecha
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE * 0.3, y - CELL_SIZE * 0.3);
    ctx.lineTo(x + CELL_SIZE * 0.4, y - CELL_SIZE * 0.4);
    ctx.stroke();
    
    // Fuego en la mecha
    if (blink > 0.8) {
        ctx.fillStyle = '#FF4500';
        ctx.beginPath();
        ctx.arc(x + CELL_SIZE * 0.4, y - CELL_SIZE * 0.4, CELL_SIZE * 0.1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = 1;
    
    // Emoji
    ctx.font = `${CELL_SIZE * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(trap.emoji, x, y);
}

function drawChainsawTrap(x, y, trap, time) {
    // Base de la motocierra
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.roundRect(x - CELL_SIZE * 0.3, y - CELL_SIZE * 0.2, 
                  CELL_SIZE * 0.6, CELL_SIZE * 0.4, 5);
    ctx.fill();
    
    // Cadena giratoria
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 2);
    
    // Dientes de la cadena
    ctx.fillStyle = '#C0C0C0';
    for(let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const toothX = Math.cos(angle) * CELL_SIZE * 0.25;
        const toothY = Math.sin(angle) * CELL_SIZE * 0.25;
        
        ctx.beginPath();
        ctx.moveTo(toothX, toothY);
        ctx.lineTo(toothX + Math.cos(angle) * 8, toothY + Math.sin(angle) * 8);
        ctx.lineTo(toothX + Math.cos(angle + 0.3) * 5, toothY + Math.sin(angle + 0.3) * 5);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
    
    // Emoji
    ctx.font = `${CELL_SIZE * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(trap.emoji, x, y);
}

function drawWebTrap(x, y, trap) {
    // Telaraña circular
    ctx.strokeStyle = trap.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.8;
    
    // Círculos concéntricos
    for(let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(x, y, CELL_SIZE * 0.15 * i, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Radios
    for(let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * CELL_SIZE * 0.4, 
                   y + Math.sin(angle) * CELL_SIZE * 0.4);
        ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
    
    // Emoji de araña
    ctx.font = `${CELL_SIZE * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText('🕷️', x, y);
}

function drawSwordTrap(x, y, trap) {
    // Base de la espada
    ctx.fillStyle = '#4169E1';
    ctx.beginPath();
    
    // Hoja
    ctx.moveTo(x - CELL_SIZE * 0.1, y - CELL_SIZE * 0.4);
    ctx.lineTo(x + CELL_SIZE * 0.1, y - CELL_SIZE * 0.4);
    ctx.lineTo(x + CELL_SIZE * 0.05, y + CELL_SIZE * 0.3);
    ctx.lineTo(x - CELL_SIZE * 0.05, y + CELL_SIZE * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // Empuñadura
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(x - CELL_SIZE * 0.05, y + CELL_SIZE * 0.3, 
                 CELL_SIZE * 0.1, CELL_SIZE * 0.1);
    
    // Efecto de brillo en la hoja
    if (Math.sin(Date.now() / 300) > 0) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - CELL_SIZE * 0.35);
        ctx.lineTo(x, y + CELL_SIZE * 0.25);
        ctx.stroke();
    }
}

function drawExplosiveTrap(x, y, trap, time) {
    // Base explosiva
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, CELL_SIZE * 0.4);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.5, trap.color);
    gradient.addColorStop(1, '#8B0000');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Mecha
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - CELL_SIZE * 0.4);
    ctx.lineTo(x + CELL_SIZE * 0.2, y - CELL_SIZE * 0.5);
    ctx.stroke();
    
    // Chispas
    if (Math.random() > 0.7) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x + CELL_SIZE * 0.2 + Math.random() * 4 - 2, 
                y - CELL_SIZE * 0.5 + Math.random() * 4 - 2, 
                2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGunTrap(x, y, trap) {
    // Base del arma
    ctx.fillStyle = trap.color;
    
    // Cañón
    ctx.fillRect(x - CELL_SIZE * 0.4, y - CELL_SIZE * 0.05, 
                 CELL_SIZE * 0.8, CELL_SIZE * 0.1);
    
    // Gatillo
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x, y + CELL_SIZE * 0.05, CELL_SIZE * 0.05, 0, Math.PI * 2);
    ctx.fill();
    
    // Mira
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + CELL_SIZE * 0.35, y - CELL_SIZE * 0.02);
    ctx.lineTo(x + CELL_SIZE * 0.35, y + CELL_SIZE * 0.02);
    ctx.stroke();
}

function drawBowTrap(x, y, trap) {
    // Arco
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.3, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
    
    // Cuerda
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(Math.PI * 0.2) * CELL_SIZE * 0.3, 
               y + Math.sin(Math.PI * 0.2) * CELL_SIZE * 0.3);
    ctx.lineTo(x + Math.cos(Math.PI * 0.8) * CELL_SIZE * 0.3, 
               y + Math.sin(Math.PI * 0.8) * CELL_SIZE * 0.3);
    ctx.stroke();
    
    // Flecha
    ctx.fillStyle = '#DAA520';
    ctx.beginPath();
    ctx.moveTo(x - CELL_SIZE * 0.25, y);
    ctx.lineTo(x + CELL_SIZE * 0.25, y);
    ctx.lineTo(x + CELL_SIZE * 0.2, y - CELL_SIZE * 0.05);
    ctx.lineTo(x + CELL_SIZE * 0.25, y);
    ctx.lineTo(x + CELL_SIZE * 0.2, y + CELL_SIZE * 0.05);
    ctx.closePath();
    ctx.fill();
}

function drawGenericTrap(x, y, trap) {
    // Base circular con gradiente
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, CELL_SIZE * 0.4);
    gradient.addColorStop(0, '#FFFFFF');
    gradient.addColorStop(0.3, trap.color);
    gradient.addColorStop(1, darkenColor(trap.color, 0.5));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Borde
    ctx.strokeStyle = darkenColor(trap.color, 0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Emoji
    ctx.font = `${CELL_SIZE * 0.8}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(trap.emoji, x, y);
    
    // Sombra externa
    ctx.shadowColor = trap.shadowColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, CELL_SIZE * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowColor = 'transparent';
}

// Funciones auxiliares para colores
function darkenColor(hex, lum) {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;
    let rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c - (c * lum)), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
    }
    return rgb;
}

function lightenColor(hex, lum) {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;
    let rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
    }
    return rgb;
}

function setupCanvasGradient() {
    // Crear fondo degradado para mejor contraste
    canvas.style.background = 'linear-gradient(135deg, #0a0a1a 0%, #121230 50%, #0a0a1a 100%)';
}

// --- MOVIMIENTO Y LÓGICA DE POSICIÓN ---
function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    // NO HACER pop() aquí - se maneja en main() dependiendo de si comió o no
}

function moveMouse() {
    mouseMoveCounter++;
    
    // Mover el ratón MUCHO más frecuente - cada 2-3 ciclos del juego
    if (mouseMoveCounter >= Math.max(2, 3 - mouseSpeed)) {
        mouseMoveCounter = 0;
        
        // Intentar moverse en la dirección actual
        let newX = food.x + mouseDirection.dx;
        let newY = food.y + mouseDirection.dy;
        
        // Si la dirección actual no es válida, cambiar dirección
        if (!isValidMousePosition(newX, newY)) {
            // Encontrar una nueva dirección válida
            const validDirections = MOUSE_DIRECTIONS.filter(dir => {
                const testX = food.x + dir.dx;
                const testY = food.y + dir.dy;
                return isValidMousePosition(testX, testY);
            });
            
            if (validDirections.length > 0) {
                // Elegir una dirección aleatoria de las válidas
                mouseDirection = validDirections[Math.floor(Math.random() * validDirections.length)];
                newX = food.x + mouseDirection.dx;
                newY = food.y + mouseDirection.dy;
            } else {
                // Si no hay direcciones válidas, quedarse en el mismo lugar
                return;
            }
        } else {
            // Posibilidad de cambiar dirección aleatoriamente (más ágil)
            if (Math.random() < mouseAgility) {
                const possibleDirections = MOUSE_DIRECTIONS.filter(dir => 
                    isValidMousePosition(food.x + dir.dx, food.y + dir.dy)
                );
                
                if (possibleDirections.length > 0) {
                    mouseDirection = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
                }
            }
        }
        
        // Mover el ratón (posiblemente múltiples celdas según velocidad)
        let movesLeft = mouseSpeed;
        while (movesLeft > 0 && isValidMousePosition(newX, newY)) {
            food.x = newX;
            food.y = newY;
            movesLeft--;
            
            // Calcular siguiente posición
            newX = food.x + mouseDirection.dx;
            newY = food.y + mouseDirection.dy;
        }
    }
}

function isValidMousePosition(x, y) {
    // Verificar límites
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        return false;
    }
    
    // Verificar serpiente
    if (snake.some(segment => segment.x === x && segment.y === y)) {
        return false;
    }
    
    // Verificar trampas (el ratón también las evita)
    if (trapObjects.some(trap => trap.x === x && trap.y === y)) {
        return false;
    }
    
    return true;
}

function placeFood() {
    let newFoodPosition;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        newFoodPosition = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        attempts++;
        
        if (attempts >= maxAttempts) {
            // Buscar cualquier posición disponible
            for (let x = 0; x < GRID_SIZE; x++) {
                for (let y = 0; y < GRID_SIZE; y++) {
                    if (!isPositionOccupied({ x, y })) {
                        newFoodPosition = { x, y };
                        break;
                    }
                }
            }
            break;
        }
    } while (isPositionOccupied(newFoodPosition));

    food = {
        x: newFoodPosition.x,
        y: newFoodPosition.y
    };
    
    // Dirección aleatoria inicial
    mouseDirection = MOUSE_DIRECTIONS[Math.floor(Math.random() * 4)];
    mouseMoveCounter = 0;
}

function isPositionOccupied(pos) {
    return isSnake(pos) || trapObjects.some(trap => trap.x === pos.x && trap.y === pos.y);
}

function isSnake(pos) {
    return snake.some(segment => segment.x === pos.x && segment.y === pos.y);
}

// --- SISTEMA DE TRAMPAS ---
function generateTraps() {
    trapObjects = [];
    // Diferente cantidad de trampas según dificultad
    const baseCount = DIFFICULTY_SETTINGS[currentDifficulty].obstacleCount;
    const trapCount = baseCount + Math.floor(level / 5);
    
    // Posiciones estratégicas en diferentes zonas del mapa
    const strategicZones = [
        { x: 2, y: 2 },    // Esquina superior izquierda
        { x: 17, y: 2 },   // Esquina superior derecha
        { x: 2, y: 17 },   // Esquina inferior izquierda
        { x: 17, y: 17 },  // Esquina inferior derecha
        { x: 9, y: 2 },    // Centro superior
        { x: 2, y: 9 },    // Centro izquierdo
        { x: 17, y: 9 },   // Centro derecho
        { x: 9, y: 17 },   // Centro inferior
        { x: 5, y: 5 },    // Cuadrante 1
        { x: 14, y: 5 },   // Cuadrante 2
        { x: 5, y: 14 },   // Cuadrante 3
        { x: 14, y: 14 }   // Cuadrante 4
    ];
    
    // Mezclar las posiciones estratégicas
    const shuffledZones = [...strategicZones].sort(() => Math.random() - 0.5);
    
    // Usar diferentes trampas para variedad
    const shuffledTraps = [...TRAP_OBJECTS].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < Math.min(trapCount, shuffledZones.length, shuffledTraps.length); i++) {
        const zone = shuffledZones[i];
        const trap = shuffledTraps[i];
        
        let newTrap;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            // Variar ligeramente la posición dentro de la zona
            const xVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
            const yVariation = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
            
            newTrap = {
                x: Math.max(1, Math.min(GRID_SIZE - 2, zone.x + xVariation)),
                y: Math.max(1, Math.min(GRID_SIZE - 2, zone.y + yVariation)),
                ...trap,
                id: Date.now() + i
            };
            attempts++;
        } while (isPositionOccupied(newTrap) && attempts < maxAttempts);
        
        if (attempts < maxAttempts) {
            trapObjects.push(newTrap);
        } else {
            // Si no se puede colocar en la zona estratégica, buscar cualquier posición
            let fallbackPosition;
            let fallbackAttempts = 0;
            const maxFallbackAttempts = 30;
            
            do {
                fallbackPosition = {
                    x: Math.floor(Math.random() * GRID_SIZE),
                    y: Math.floor(Math.random() * GRID_SIZE)
                };
                fallbackAttempts++;
                
                if (fallbackAttempts >= maxFallbackAttempts) {
                    // Último intento: buscar sistemáticamente
                    for (let x = 0; x < GRID_SIZE; x++) {
                        for (let y = 0; y < GRID_SIZE; y++) {
                            if (!isPositionOccupied({ x, y })) {
                                fallbackPosition = { x, y };
                                break;
                            }
                        }
                    }
                    break;
                }
            } while (isPositionOccupied(fallbackPosition));
            
            newTrap.x = fallbackPosition.x;
            newTrap.y = fallbackPosition.y;
            trapObjects.push(newTrap);
        }
    }
}

function checkTrapCollision() {
    const head = snake[0];
    
    for (let i = 0; i < trapObjects.length; i++) {
        if (head.x === trapObjects[i].x && head.y === trapObjects[i].y) {
            return trapObjects[i]; // Retornar la trampa con la que colisionó
        }
    }
    
    return null; // No hay colisión
}

function handleTrapCollision() {
    // Activar cooldown para evitar múltiples colisiones rápidas
    collisionCooldown = true;
    setTimeout(() => {
        collisionCooldown = false;
    }, 1000); // 1 segundo de cooldown
    
    lives--;
    
    // Mensaje específico según el tipo de trampa
    const trap = checkTrapCollision();
    if (trap) {
        let message = '';
        switch(trap.type) {
            case 'knife': message = '¡Cortado por un cuchillo!'; break;
            case 'chainsaw': message = '¡Atrapado en la motocierra!'; break;
            case 'web': message = '¡Atrapado en la red!'; break;
            case 'bomb': message = '¡Explotó por una bomba!'; break;
            case 'chain': message = '¡Enredado en cadenas!'; break;
            case 'sword': message = '¡Empalado por una espada!'; break;
            case 'explosive': message = '¡Explosivo activado!'; break;
            case 'dagger': message = '¡Herido por una daga!'; break;
            case 'gun': message = '¡Disparado!'; break;
            case 'bow': message = '¡Flecha al corazón!'; break;
            default: message = '¡Trampa activada!';
        }
        showAlert(`${message} -1 vida`, 1500);
    }
    
    // Efecto visual de colisión
    canvas.classList.add('collision-effect');
    setTimeout(() => canvas.classList.remove('collision-effect'), 500);
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reiniciar posición de la serpiente
        snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dx = 1; 
        dy = 0;
        lastDirection = 'right';
        growSnake = false;
        updateUI();
    }
}

function startTrapChangeTimer() {
    if (trapChangeTimer) clearInterval(trapChangeTimer);
    
    trapChangeTimer = setInterval(() => {
        const timeSinceChange = Date.now() - lastTrapChange;
        const timeRemaining = Math.max(0, trapChangeTime * 1000 - timeSinceChange);
        const seconds = Math.ceil(timeRemaining / 1000);
        
        if (seconds <= 0) {
            changeTraps();
            lastTrapChange = Date.now();
        }
    }, 1000);
}

function updateTrapTimerDisplay() {
    const timeSinceChange = Date.now() - lastTrapChange;
    const timeRemaining = Math.max(0, trapChangeTime * 1000 - timeSinceChange);
    const seconds = Math.ceil(timeRemaining / 1000);
    
    if (trapTimerElement && seconds > 0) {
        trapTimerElement.style.display = 'block';
        trapTimerElement.textContent = `Cambio trampas: ${seconds}s`;
        
        // Cambiar color según el tiempo restante
        if (seconds <= 5) {
            trapTimerElement.style.color = '#ff4444';
            trapTimerElement.style.animation = 'pulse 0.5s infinite';
        } else if (seconds <= 10) {
            trapTimerElement.style.color = '#ffa500';
        } else {
            trapTimerElement.style.color = '#48bb78';
            trapTimerElement.style.animation = 'none';
        }
    }
}

function changeTraps() {
    generateTraps();
    
    // Mostrar notificación con efecto visual
    showTrapChangeAlert('¡Las trampas han cambiado de lugar! 🔄');
    
    // Efecto visual en todas las trampas
    trapObjects.forEach(trap => {
        createTrapChangeEffect(trap.x, trap.y, trap.color);
    });
}

function createTrapChangeEffect(x, y, color) {
    // Crear efecto de partículas alrededor de la trampa
    for (let i = 0; i < 8; i++) {
        setTimeout(() => {
            const centerX = x * CELL_SIZE + CELL_SIZE / 2;
            const centerY = y * CELL_SIZE + CELL_SIZE / 2;
            const angle = (Math.PI * 2 * i) / 8;
            
            const particle = {
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                color: color,
                size: 4,
                alpha: 1,
                life: 20
            };
            
            // Dibujar partícula
            const drawParticle = () => {
                if (particle.life <= 0) return;
                
                ctx.save();
                ctx.globalAlpha = particle.alpha;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Actualizar partícula
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.life--;
                particle.alpha = particle.life / 20;
                particle.size = Math.max(1, particle.size - 0.1);
                
                if (particle.life > 0) {
                    requestAnimationFrame(drawParticle);
                }
            };
            
            drawParticle();
        }, i * 50);
    }
}

function showTrapChangeAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'trap-change-alert';
    alertDiv.innerHTML = `
        <div class="alert-content">
            <span class="alert-icon">⚠️</span>
            <span>${message}</span>
        </div>
    `;
    document.querySelector('.game-container').appendChild(alertDiv);
    
    // Animación de entrada
    setTimeout(() => {
        alertDiv.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 300);
    }, 2000);
}

function showAlert(message, duration = 2000) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'game-alert';
    alertDiv.textContent = message;
    $('gameScreen').appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
    }, duration);
}

// --- FUNCIONES AUXILIARES DE INTERFAZ ---
function createTrapTimerElement() {
    // Crear elemento solo si no existe
    if (!trapTimerElement) {
        trapTimerElement = document.createElement('div');
        trapTimerElement.id = 'trapTimer';
        trapTimerElement.className = 'trap-timer';
        trapTimerElement.style.display = 'none'; // OCULTO por defecto
        
        const gameContainer = document.querySelector('.game-container');
        if (gameContainer) {
            gameContainer.appendChild(trapTimerElement);
        }
    }
    return trapTimerElement;
}

// --- COLISIONES Y EVENTOS ---
function checkWallCollision() {
    const headX = snake[0].x;
    const headY = snake[0].y;
    return headX < 0 || headX >= GRID_SIZE || headY < 0 || headY >= GRID_SIZE;
}

function checkSelfCollision() {
    const head = snake[0];
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
        // Efecto visual de colisión
        canvas.classList.add('collision-effect');
        setTimeout(() => canvas.classList.remove('collision-effect'), 500);

        snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        dx = 1; 
        dy = 0;
        lastDirection = 'right';
        growSnake = false;
        updateUI();
    }
}

function checkFoodEaten() {
    const head = snake[0];
    if (head.x === food.x && head.y === food.y) {
        return true;
    }
    return false;
}

function handleFoodEaten() {
    console.log("¡Ratón comido!"); // Para debug
    score += 10;
    miceEaten++;  // INCREMENTAR CONTADOR DE RATONES
    
    // Aumentar un poco la velocidad del ratón cada vez que comes uno
    mouseSpeed = Math.min(3, mouseSpeed + 0.1);
    
    // Colocar nuevo ratón
    placeFood();
    
    // NO HACER pop() aquí - la serpiente crece naturalmente porque no hacemos pop() cuando come
    // La serpiente ya tiene un segmento extra porque no hicimos pop() en main()
    
    // Marcar que la serpiente debe crecer
    growSnake = true;
    
    // Comprobar si sube de nivel (cada 5 ratones)
    if (miceEaten % 5 === 0) {
        levelUp();
    }

    updateUI(); // Esto actualizará el contador en pantalla
}

function levelUp() {
    level++;
    
    // Aumentar ligeramente la velocidad con cada nivel, pero con límites
    if (gameSpeedMs > 50) { // Velocidad mínima de 50ms
        gameSpeedMs = Math.max(50, gameSpeedMs - 5);
        
        // Reiniciar el intervalo con la nueva velocidad
        clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(main, gameSpeedMs);
    }
    
    // El ratón se vuelve más ágil en niveles más altos
    mouseAgility = Math.min(0.9, mouseAgility + 0.05);
    
    // Regenerar trampas con nueva cantidad
    generateTraps();
}

// --- INTERFAZ DE USUARIO (UI) ---
function updateUI() {
    $('playerInfo').textContent = `Jugador: ${playerName}`;
    $('score').textContent = `Puntuación: ${score}`;
    $('levelInfo').textContent = `Nivel: ${level}`;
    $('miceCounter').textContent = `🐁: ${miceEaten}`; // Esto actualiza el contador visible
    
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
    
    // Ocultar temporizador en pausa
    if (trapTimerElement) {
        trapTimerElement.style.display = 'none';
    }
}

function resumeGame() {
    if (!isPaused) return;
    isPaused = false;
    switchScreen(gameScreen);
    gameLoopInterval = setInterval(main, gameSpeedMs);
    
    // Mostrar temporizador al reanudar
    if (trapTimerElement) {
        trapTimerElement.style.display = 'block';
    }
}

function gameOver() {
    clearInterval(gameLoopInterval);
    clearInterval(timerInterval);
    if (trapChangeTimer) clearInterval(trapChangeTimer);
    document.removeEventListener('keydown', changeDirection);

    // Ocultar temporizador en game over
    if (trapTimerElement) {
        trapTimerElement.style.display = 'none';
    }

    updateHighScore(score);
    loadHighScore();

    $('finalScore').textContent = `Tu Puntuación: ${score}`;
    $('finalStats').innerHTML = `
        <p>Nivel Alcanzado: ${level}</p>
        <p>Ratones Comidos: ${miceEaten}</p>
        <p>Tiempo Jugado: ${formatTime(timeElapsed)}</p>
        <p>Dificultad: ${currentDifficulty === 'easy' ? 'Fácil' : currentDifficulty === 'normal' ? 'Normal' : 'Difícil'}</p>
    `;
    
    switchScreen(gameOverScreen);
}

// --- CONTROL DE DIRECCIÓN ---
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
    if (trapChangeTimer) clearInterval(trapChangeTimer);
    document.removeEventListener('keydown', changeDirection);
    
    // Ocultar temporizador al volver al menú
    if (trapTimerElement) {
        trapTimerElement.style.display = 'none';
    }
    
    switchScreen(setupScreen);
};

$('menuBtn').addEventListener('click', backToSetup);
$('backToSetupBtn').addEventListener('click', backToSetup);
$('menuFromPauseBtn').addEventListener('click', backToSetup);

// Controles Táctiles (Móviles)
document.querySelectorAll('.arrow-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const dir = e.target.getAttribute('data-dir');
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

// Agregar polyfill para roundRect si no está disponible
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}