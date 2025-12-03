// --- CONSTANTES Y VARIABLES GLOBALES ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensiones del juego
const GRID_SIZE = 20; // 20x20 celdas
const CELL_SIZE = canvas.width / GRID_SIZE; // 600px / 20 = 30px

// Definición de objetos trampa - TODAS VISIBLES
const TRAP_OBJECTS = [
    { emoji: '🔪', name: 'Cuchillo', color: '#FFD700', dangerous: true, shadowColor: '#FF0000' },
    { emoji: '⛓️', name: 'Cadena', color: '#C0C0C0', dangerous: true, shadowColor: '#808080' },
    { emoji: '💣', name: 'Bomba', color: '#FF0000', dangerous: true, shadowColor: '#FF4500' },
    { emoji: '🪚', name: 'Motocierra', color: '#8B4513', dangerous: true, shadowColor: '#D2691E' },
    { emoji: '🕸️', name: 'Red', color: '#FFFFFF', dangerous: true, shadowColor: '#F0F8FF' },
    { emoji: '🗡️', name: 'Espada', color: '#6495ED', dangerous: true, shadowColor: '#4169E1' },
    { emoji: '🧨', name: 'Explosivo', color: '#FF4500', dangerous: true, shadowColor: '#FF6347' },
    { emoji: '⚔️', name: 'Daga', color: '#B0C4DE', dangerous: true, shadowColor: '#778899' },
    { emoji: '🔫', name: 'Pistola', color: '#2F4F4F', dangerous: true, shadowColor: '#696969' },
    { emoji: '🏹', name: 'Arco', color: '#DAA520', dangerous: true, shadowColor: '#B8860B' }
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
let gameSpeedMs = 150; // Velocidad por defecto (Fácil)
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

// Mapeo de colores
const COLOR_MAP = {
    green: '#48BB78',
    blue: '#4C51BF',
    red: '#E53E3E',
    purple: '#9F7AEA'
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
document.querySelectorAll('.snake-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.snake-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        snakeColor = COLOR_MAP[option.getAttribute('data-snake')];
    });
});

document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        gameSpeedMs = parseInt(btn.getAttribute('data-diff'));
        
        // Ajustar velocidad del ratón según dificultad
        switch(gameSpeedMs) {
            case 150: // Fácil
                mouseSpeed = 1;
                mouseAgility = 0.5;
                break;
            case 100: // Normal
                mouseSpeed = 1.5;
                mouseAgility = 0.6;
                break;
            case 70: // Difícil
                mouseSpeed = 2;
                mouseAgility = 0.7;
                break;
        }
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
    growSnake = false;
    mouseMoveCounter = 0;
    mouseDirection = MOUSE_DIRECTIONS[Math.floor(Math.random() * 4)]; // Dirección aleatoria inicial
    
    // Reiniciar variables de objetos trampa
    trapObjects = [];
    lastTrapChange = Date.now();
    collisionCooldown = false;

    if (gameLoopInterval) clearInterval(gameLoopInterval);
    if (timerInterval) clearInterval(timerInterval);
    if (trapChangeTimer) clearInterval(trapChangeTimer);
    
    placeFood();
    generateTraps();
    startTrapChangeTimer();
    updateUI();
}

function startGame() {
    initGame();
    
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

    // 1. Mover la serpiente
    moveSnake();

    // 2. Mover el ratón (más frecuente)
    moveMouse();

    // 3. Comprobar colisiones con paredes y serpiente
    if (checkWallCollision() || checkSelfCollision()) {
        handleCollision();
    }

    // 4. Comprobar colisión con trampas
    if (!collisionCooldown && checkTrapCollision()) {
        handleTrapCollision();
    }

    // 5. Comprobar si come la comida
    if (checkFoodEaten()) {
        handleFoodEaten();
    }

    // 6. Actualizar temporizador de trampas
    updateTrapTimerDisplay();

    // 7. Dibujar
    drawGame();
}

function drawGame() {
    // Limpiar Canvas
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar Trampas - ANTES de la comida y serpiente
    drawTraps();
    
    // Dibujar Comida (Ratón)
    drawFood();
    
    // Dibujar Serpiente
    drawSnake();
}

function drawSnake() {
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = snakeColor;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
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
    // Dibujar el ratón simple con emoji
    ctx.font = `${CELL_SIZE}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐁', 
        food.x * CELL_SIZE + CELL_SIZE / 2, 
        food.y * CELL_SIZE + CELL_SIZE / 2);
}

function drawTraps() {
    trapObjects.forEach(trap => {
        // Configurar fuente más grande para mejor visibilidad
        ctx.font = `${CELL_SIZE + 2}px sans-serif`; // +2px para mejor visibilidad
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Efecto de brillo para las trampas - TODAS VISIBLES
        ctx.shadowColor = trap.shadowColor || trap.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = trap.color;
        ctx.fillText(trap.emoji, 
            trap.x * CELL_SIZE + CELL_SIZE / 2, 
            trap.y * CELL_SIZE + CELL_SIZE / 2);
        
        // Resetear sombra
        ctx.shadowBlur = 0;
        
        // Dibujar un borde alrededor para mejor visibilidad
        ctx.strokeStyle = trap.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            trap.x * CELL_SIZE, 
            trap.y * CELL_SIZE, 
            CELL_SIZE, 
            CELL_SIZE
        );
    });
}

// --- MOVIMIENTO Y LÓGICA DE POSICIÓN ---
function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    
    if (!growSnake) {
        snake.pop();
    } else {
        growSnake = false;
    }
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
    // 4-5 trampas distribuidas estratégicamente
    const trapCount = 4 + Math.floor(level / 5);
    
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
        switch(trap.emoji) {
            case '🔪': message = '¡Cortado por un cuchillo!'; break;
            case '🪚': message = '¡Atrapado en la motocierra!'; break;
            case '🕸️': message = '¡Atrapado en la red!'; break;
            case '💣': message = '¡Explotó por una bomba!'; break;
            case '⛓️': message = '¡Enredado en cadenas!'; break;
            case '🗡️': message = '¡Empalado por una espada!'; break;
            case '🧨': message = '¡Explosivo activado!'; break;
            case '⚔️': message = '¡Herido por una daga!'; break;
            case '🔫': message = '¡Disparado!'; break;
            case '🏹': message = '¡Flecha al corazón!'; break;
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
        trapTimerElement.textContent = `Cambio: ${seconds}s`;
        
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
    
    // Mostrar notificación
    showTrapChangeAlert('¡Las trampas han cambiado de lugar!');
}

function showTrapChangeAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'trap-change-alert';
    alertDiv.textContent = message;
    $('gameScreen').appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.parentNode.removeChild(alertDiv);
        }
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
    return head.x === food.x && head.y === food.y;
}

function handleFoodEaten() {
    score += 10;
    miceEaten++;
    growSnake = true;
    
    // Aumentar un poco la velocidad del ratón cada vez que comes uno
    mouseSpeed = Math.min(3, mouseSpeed + 0.1);
    
    placeFood();
    
    if (miceEaten % 5 === 0) {
        levelUp();
    }

    updateUI();
}

function levelUp() {
    level++;
    
    if (gameSpeedMs > 70) {
        gameSpeedMs = Math.max(70, gameSpeedMs - 5);
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
    $('miceCounter').textContent = `🐁: ${miceEaten}`;
    
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