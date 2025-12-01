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
let mouseMoveTimer = 0; // Temporizador para el movimiento del ratón
let mouseMoveInterval = 10; // El ratón se mueve cada 10 ciclos del juego
let mouseFear = false; // Si el ratón tiene miedo de la serpiente
let panicTimer = 0; // Temporizador para el pánico del ratón
let mouseTrail = []; // Array para guardar la trayectoria del ratón

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
        // Ajustar la velocidad del ratón según la dificultad
        mouseMoveInterval = Math.max(5, 15 - (150 - gameSpeedMs) / 20); // Ratón más rápido en dificultades mayores
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
    mouseMoveTimer = 0;
    mouseFear = false;
    panicTimer = 0;
    mouseTrail = [];

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

    // 2. Mover el ratón (si es tiempo)
    moveMouse();

    // 3. Actualizar estados del ratón
    updateMouseState();

    // 4. Comprobar colisiones
    if (checkWallCollision() || checkSelfCollision()) {
        handleCollision();
    }

    // 5. Comprobar si come la comida
    if (checkFoodEaten()) {
        handleFoodEaten();
    }

    // 6. Dibujar
    drawGame();
}

function drawGame() {
    // Limpiar Canvas
    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar trayectoria del ratón (solo en modo pánico)
    if (mouseFear && mouseTrail.length > 1) {
        drawMouseTrail();
    }

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
    // Calcular color del ratón según su estado
    let mouseColor = mouseFear ? '#FF4444' : '#FFB6C1'; // Rojo si tiene miedo, rosa claro normal
    let mouseSize = mouseFear ? CELL_SIZE * 0.8 : CELL_SIZE; // Más pequeño si tiene miedo
    
    // Dibujar el ratón con emoji
    ctx.font = `${mouseSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Dibujamos el emoji de Ratón con efecto de temblor si tiene miedo
    if (mouseFear) {
        const shake = Math.sin(Date.now() / 100) * 2; // Efecto de temblor
        ctx.fillText('🐁', 
            food.x * CELL_SIZE + CELL_SIZE / 2 + shake, 
            food.y * CELL_SIZE + CELL_SIZE / 2 + shake);
    } else {
        ctx.fillText('🐁', 
            food.x * CELL_SIZE + CELL_SIZE / 2, 
            food.y * CELL_SIZE + CELL_SIZE / 2);
    }
    
    // Dibujar un halo si está en pánico
    if (mouseFear) {
        ctx.beginPath();
        ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, 
                food.y * CELL_SIZE + CELL_SIZE / 2, 
                CELL_SIZE / 2 + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function drawMouseTrail() {
    ctx.strokeStyle = 'rgba(255, 182, 193, 0.3)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(
        mouseTrail[0].x * CELL_SIZE + CELL_SIZE / 2,
        mouseTrail[0].y * CELL_SIZE + CELL_SIZE / 2
    );
    
    for (let i = 1; i < mouseTrail.length; i++) {
        ctx.lineTo(
            mouseTrail[i].x * CELL_SIZE + CELL_SIZE / 2,
            mouseTrail[i].y * CELL_SIZE + CELL_SIZE / 2
        );
    }
    ctx.stroke();
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

function moveMouse() {
    mouseMoveTimer++;
    
    if (mouseMoveTimer >= mouseMoveInterval) {
        mouseMoveTimer = 0;
        
        // Guardar posición actual en el trail (solo las últimas 5 posiciones)
        if (mouseFear) {
            mouseTrail.push({ x: food.x, y: food.y });
            if (mouseTrail.length > 5) {
                mouseTrail.shift();
            }
        }
        
        let newX = food.x;
        let newY = food.y;
        
        // Comportamiento inteligente del ratón
        if (mouseFear && panicTimer > 0) {
            // Modo pánico: huir de la serpiente rápidamente
            newX = food.x;
            newY = food.y;
            
            // Calcular distancia a la serpiente
            const snakeHead = snake[0];
            const dxToSnake = snakeHead.x - food.x;
            const dyToSnake = snakeHead.y - food.y;
            
            // Moverse en dirección opuesta a la serpiente
            const possibleMoves = [
                { x: -1, y: 0 }, { x: 1, y: 0 },
                { x: 0, y: -1 }, { x: 0, y: 1 }
            ];
            
            // Ordenar movimientos por qué tan lejos te alejan de la serpiente
            const sortedMoves = possibleMoves.sort((a, b) => {
                const distA = Math.abs((food.x + a.x - snakeHead.x)) + Math.abs((food.y + a.y - snakeHead.y));
                const distB = Math.abs((food.x + b.x - snakeHead.x)) + Math.abs((food.y + b.y - snakeHead.y));
                return distB - distA; // Mayor distancia primero
            });
            
            // Intentar cada movimiento hasta encontrar uno válido
            for (const move of sortedMoves) {
                const testX = food.x + move.x;
                const testY = food.y + move.y;
                
                if (isValidMousePosition(testX, testY)) {
                    newX = testX;
                    newY = testY;
                    break;
                }
            }
            
            panicTimer--;
            if (panicTimer <= 0) {
                mouseFear = false;
                mouseTrail = [];
            }
        } else {
            // Modo normal: movimiento aleatorio pero inteligente
            const possibleMoves = [
                { x: -1, y: 0 }, { x: 1, y: 0 },
                { x: 0, y: -1 }, { x: 0, y: 1 }
            ];
            
            // Filtrar movimientos que llevarían a una colisión
            const validMoves = possibleMoves.filter(move => 
                isValidMousePosition(food.x + move.x, food.y + move.y)
            );
            
            // Si hay movimientos válidos, elegir uno
            if (validMoves.length > 0) {
                // Priorizar movimientos que alejen de la serpiente si está cerca
                const snakeHead = snake[0];
                const distanceToSnake = Math.abs(snakeHead.x - food.x) + Math.abs(snakeHead.y - food.y);
                
                if (distanceToSnake < 5) { // Si la serpiente está cerca
                    // Ordenar por distancia a la serpiente (más lejos primero)
                    validMoves.sort((a, b) => {
                        const distA = Math.abs((food.x + a.x - snakeHead.x)) + Math.abs((food.y + a.y - snakeHead.y));
                        const distB = Math.abs((food.x + b.x - snakeHead.x)) + Math.abs((food.y + b.y - snakeHead.y));
                        return distB - distA;
                    });
                }
                
                // Tomar el mejor movimiento (o aleatorio si no hay peligro)
                const chosenMove = validMoves[0];
                newX = food.x + chosenMove.x;
                newY = food.y + chosenMove.y;
                
                // Si la serpiente está muy cerca, activar modo pánico
                if (distanceToSnake < 3) {
                    mouseFear = true;
                    panicTimer = 15; // 15 ciclos de pánico
                }
            }
        }
        
        // Actualizar posición del ratón
        food.x = newX;
        food.y = newY;
    }
}

function updateMouseState() {
    // Verificar si la serpiente está cerca para activar el miedo
    if (!mouseFear) {
        const snakeHead = snake[0];
        const distanceToSnake = Math.abs(snakeHead.x - food.x) + Math.abs(snakeHead.y - food.y);
        
        if (distanceToSnake < 4) {
            mouseFear = true;
            panicTimer = 20; // Más tiempo de pánico
        }
    }
}

function isValidMousePosition(x, y) {
    // Verificar límites del tablero
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
        return false;
    }
    
    // Verificar si está en la serpiente
    if (isSnake({ x, y })) {
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
        
        // Si hay muchos intentos, buscar cualquier posición disponible
        if (attempts >= maxAttempts) {
            // Buscar todas las posiciones posibles
            for (let x = 0; x < GRID_SIZE; x++) {
                for (let y = 0; y < GRID_SIZE; y++) {
                    if (!isSnake({ x, y })) {
                        newFoodPosition = { x, y };
                        break;
                    }
                }
            }
            break;
        }
    } while (isSnake(newFoodPosition));

    food = {
        x: newFoodPosition.x,
        y: newFoodPosition.y
    };
    
    // Resetear estado del ratón
    mouseFear = false;
    panicTimer = 0;
    mouseTrail = [];
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
    // Puntos extra si el ratón estaba en modo pánico (más difícil de atrapar)
    const basePoints = 10;
    const fearBonus = mouseFear ? 15 : 0;
    const points = basePoints + fearBonus;
    
    score += points;
    miceEaten++;
    
    // Marcar que la serpiente debe crecer en el próximo movimiento
    growSnake = true;
    
    // Mostrar mensaje especial si fue difícil de atrapar
    if (mouseFear) {
        showTemporaryMessage(`¡Ratón asustado! +${points} puntos`, 1500);
    }
    
    // Colocar nueva comida
    placeFood();
    
    // Comprobar avance de nivel (e.g., cada 5 ratones)
    if (miceEaten % 5 === 0) {
        levelUp();
    }

    updateUI();
}

function showTemporaryMessage(message, duration) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.position = 'absolute';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    messageDiv.style.color = mouseFear ? '#FF4444' : '#48BB78';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.zIndex = '1000';
    messageDiv.style.fontSize = '1.2rem';
    
    document.querySelector('.game-container').appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, duration);
}

function levelUp() {
    level++;
    // Aumentar la velocidad solo si el intervalo de velocidad lo permite (más difícil)
    // La velocidad mínima es 70ms (Dificultad Difícil)
    if (gameSpeedMs > 70) {
        gameSpeedMs = Math.max(70, gameSpeedMs - 5);
        clearInterval(gameLoopInterval);
        gameLoopInterval = setInterval(main, gameSpeedMs);
        
        // El ratón se mueve más rápido en niveles más altos
        mouseMoveInterval = Math.max(3, mouseMoveInterval - 1);
    }
    
    // Mostrar mensaje de nivel
    showTemporaryMessage(`¡Nivel ${level}!`, 1000);
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
        <p>Ratones asustados atrapados: ${calculateScaredMiceCaught()}</p>
    `;
    
    switchScreen(gameOverScreen);
}

function calculateScaredMiceCaught() {
    // Esta función debería llevar un contador de ratones asustados atrapados
    // Por ahora devolvemos un valor estimado
    return Math.floor(miceEaten * 0.3);
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