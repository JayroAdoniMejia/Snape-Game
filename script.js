// Constantes globales para el juego
const snakeColors = {
    green: '#065a09ff',
    blue: '#2196F3',
    red: '#f44336',
    purple: '#9C27B0'
};
const gridSize = 20;
const canvasWidth = 800;
const canvasHeight = 600;

// Clases del juego
class Player {
    constructor(name) {
        this.name = name;
        this.score = 0;
        this.level = 1;
        this.lives = 5;
        this.miceEaten = 0;
        this.powerupsCollected = 0;
        this.perfectRun = true;
        this.maxSnakeLength = 1;
        this.achievements = [];
    }

    addScore(points) {
        this.score += points;
    }

    loseLife() {
        this.lives--;
        this.perfectRun = false;
    }

    checkAchievements() {
        const achieved = [];
        if (this.score >= 500 && !this.achievements.includes('score500')) {
            this.achievements.push('score500');
            achieved.push({ name: '¡Gran Puntuación!', description: 'Alcanza 500 puntos.', icon: '🏆' });
        }
        if (this.lives === 5 && this.perfectRun && !this.achievements.includes('perfectRun')) {
            this.achievements.push('perfectRun');
            achieved.push({ name: 'Corredor Perfecto', description: 'Termina un nivel con 5 vidas.', icon: '✨' });
        }
        return achieved;
    }
}

class Snake {
    constructor(type, isPlayer = true) {
        this.body = [{ x: 100, y: 100 }];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.color = snakeColors[type];
        this.type = type;
        this.isPlayer = isPlayer;
        this.effects = { speed: 0, shield: 0, magnet: 0, freeze: 0 };
    }

    move() {
        if (this.isPlayer) {
            this.direction = this.nextDirection;
        }

        const head = { x: this.body[0].x, y: this.body[0].y };
        switch (this.direction) {
            case 'up': head.y -= gridSize; break;
            case 'down': head.y += gridSize; break;
            case 'left': head.x -= gridSize; break;
            case 'right': head.x += gridSize; break;
        }
        this.body.unshift(head);
    }
    
    changeDirection(newDirection) {
        const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
        if (this.isPlayer && this.direction !== opposites[newDirection]) {
            this.nextDirection = newDirection;
        }
    }

    grow(amount) {
        for (let i = 0; i < amount; i++) {
            const tail = this.body[this.body.length - 1];
            this.body.push({ x: tail.x, y: tail.y });
        }
    }
}

class EnemySnake extends Snake {
    constructor(type) {
        super(type.color, false);
        this.body = [{ x: Math.floor(Math.random() * (canvasWidth / gridSize)) * gridSize, y: Math.floor(Math.random() * (canvasHeight / gridSize)) * gridSize }];
        this.speed = type.speed;
        this.emoji = type.emoji;
        this.moveTimer = 0;
        this.size = type.size;
    }
    
    update(foodPosition, obstacles, playerSnake) {
        this.moveTimer += 1;
        
        if (this.moveTimer >= 60 / this.speed) {
            this.moveTimer = 0;
            
            let targetX = this.body[0].x;
            let targetY = this.body[0].y;
            
            const dx = foodPosition.x - this.body[0].x;
            const dy = foodPosition.y - this.body[0].y;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                targetX += (dx > 0) ? gridSize : -gridSize;
            } else {
                targetY += (dy > 0) ? gridSize : -gridSize;
            }
            
            if (this.willCollide(targetX, targetY, obstacles, playerSnake)) {
                const directions = [{x: gridSize, y: 0}, {x: -gridSize, y: 0}, {x: 0, y: gridSize}, {x: 0, y: -gridSize}];
                const randomDir = directions[Math.floor(Math.random() * directions.length)];
                targetX = this.body[0].x + randomDir.x;
                targetY = this.body[0].y + randomDir.y;
            }

            this.body.unshift({ x: targetX, y: targetY });
            this.body.pop();
        }
    }
    
    willCollide(x, y, obstacles, playerSnake) {
        if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) {
            return true;
        }
        for (const obs of obstacles) {
            if (x === obs.x && y === obs.y) return true;
        }
        for (const seg of playerSnake.body) {
            if (x === seg.x && y === seg.y) return true;
        }
        return false;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.playerName = '';
        this.difficulty = '';
        this.selectedSnakeType = 'green';
        this.gameRunning = false;
        this.gamePaused = false;
        this.lastUpdateTime = 0;
        this.gameSpeed = 200;
        this.highScore = 0;
        this.lastObstacleChange = 0;
        this.gameStartTime = 0;
        this.currentObstacleGroup = 0;
        this.activeEffectsTimer = {};

        this.player = null;
        this.snake = null;
        this.food = {};
        this.powerups = [];
        this.obstacles = [];
        this.enemySnakes = [];
        this.particles = [];
        this.foodEaten = false;

        this.difficultySettings = {
            easy: { speed: 200, obstacleCount: 3, powerupChance: 0.3, growthRate: 1, enemyCount: 1 },
            normal: { speed: 150, obstacleCount: 5, powerupChance: 0.2, growthRate: 2, enemyCount: 2 },
            hard: { speed: 100, obstacleCount: 7, powerupChance: 0.1, growthRate: 3, enemyCount: 3 }
        };
        this.foodTypes = {
            mouse: { emoji: '🐭', points: 10, color: '#FFB6C1', growth: 1 },
            cheese: { emoji: '🧀', points: 25, color: '#FFD700', growth: 2 },
            apple: { emoji: '🍎', points: 5, color: '#FF4444', growth: 1, heal: 1 },
            diamond: { emoji: '💎', points: 50, color: '#00FFFF', growth: 3 }
        };
        this.powerupTypes = {
            speed: { emoji: '⚡', color: '#FFFF00', duration: 10000 },
            shield: { emoji: '🛡️', color: '#4169E1', duration: 15000 },
            magnet: { emoji: '🧲', color: '#FF69B4', duration: 8000 },
            freeze: { emoji: '❄️', color: '#00BFFF', duration: 5000 }
        };
        this.obstacleGroups = [
            [{ emoji: '🪨', color: '#8B4513', type: 'rock' }, { emoji: '🗿', color: '#696969', type: 'stone' }],
            [{ emoji: '🌳', color: '#228B22', type: 'tree' }, { emoji: '🌿', color: '#006400', type: 'bush' }],
            [{ emoji: '🏔️', color: '#A0522D', type: 'mountain' }, { emoji: '🌵', color: '#228B22', type: 'cactus' }],
            [{ emoji: '🏛️', color: '#DAA520', type: 'ruins' }, { emoji: '⚡', color: '#FFD700', type: 'lightning' }],
            [{ emoji: '🕳️', color: '#2F4F4F', type: 'hole' }, { emoji: '🔥', color: '#FF4500', type: 'fire' }]
        ]; 
        this.enemySnakeTypes = [
            { color: '#8B0000', emoji: '🐍', speed: 0.3, size: 3 },
            { color: '#4B0082', emoji: '🐍', speed: 0.4, size: 2 },
            { color: '#FF6347', emoji: '🐍', speed: 0.5, size: 4 }
        ];

        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    init() {
        this.loadHighScore();
        this.updateHighScoreDisplay();
        this.selectSnake('green');
        this.selectDifficulty('easy');
        this.setupEventListeners();
        this.setupMobileControls();
        if (this.isMobile()) {
            document.getElementById('mobileControls').style.display = 'block';
        }
    }
    
    setupEventListeners() {
        document.querySelectorAll('.snake-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectSnake(e.currentTarget.dataset.snake));
        });
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectDifficulty(e.currentTarget.dataset.diff));
        });
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartGame());
        document.getElementById('backToSetupBtn').addEventListener('click', () => this.backToSetup());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('menuBtn').addEventListener('click', () => this.backToSetup());
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => {
            document.getElementById('pausePanel').classList.remove('show');
            this.backToSetup();
        });
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        window.addEventListener('resize', this.resizeCanvas.bind(this));
        this.resizeCanvas();
    }

    resizeCanvas() {
        const gameArea = document.querySelector('.game-container');
        const aspectRatio = this.canvasWidth / this.canvasHeight;
        let newWidth = gameArea.offsetWidth;
        let newHeight = newWidth / aspectRatio;
        
        if (newHeight > window.innerHeight - 200) {
            newHeight = window.innerHeight - 200;
            newWidth = newHeight * aspectRatio;
        }
        
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';
    }

    selectSnake(type) {
        this.selectedSnakeType = type;
        document.querySelectorAll('.snake-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-snake="${type}"]`).classList.add('selected');
        if (this.snake) {
            this.snake.color = snakeColors[type];
            this.snake.type = type;
        }
    }
    
    selectDifficulty(diff) {
        this.difficulty = diff;
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-diff="${diff}"]`).classList.add('active');
    }

    startGame() {
        this.playerName = document.getElementById('playerName').value.trim();
        if (!this.playerName) {
            document.getElementById('nameAlert').classList.remove('hidden');
            return;
        }
        document.getElementById('nameAlert').classList.add('hidden');
        
        document.getElementById('setupScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
        document.getElementById('playerInfo').textContent = `Jugador: ${this.playerName}`;
        
        this.resetGame();
        this.gameLoop();
    }
    
    restartGame() {
        document.getElementById('gameOver').classList.remove('show');
        this.resetGame();
        this.gameLoop();
    }

    backToSetup() {
        document.getElementById('gameOver').classList.remove('show');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('setupScreen').classList.add('active');
        this.gameRunning = false;
    }
    
    resetGame() {
        this.player = new Player(this.playerName);
        this.snake = new Snake(this.selectedSnakeType);
        this.snake.body = [{ x: 100, y: 100 }];
        this.snake.direction = 'right';
        this.snake.nextDirection = 'right';
        this.powerups = [];
        this.obstacles = [];
        this.enemySnakes = [];
        this.particles = [];
        this.gameRunning = true;
        this.gamePaused = false;
        this.gameStartTime = Date.now();
        this.lastObstacleChange = Date.now();
        this.gameSpeed = this.difficultySettings[this.difficulty].speed;
        this.lastUpdateTime = Date.now();
        this.legendaryAchieved = false;

        this.updateScore();
        this.updateLevel();
        this.updateHearts();
        this.updateMiceCounter();
        this.updateActiveEffects();

        this.generateFood();
        this.generateObstacles();
        this.generateEnemySnakes();
        this.createNatureBackground();
        document.getElementById('gameOver').classList.remove('show');
    }

    gameLoop(timestamp) {
        if (!this.gameRunning || this.gamePaused) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        const currentSpeed = this.snake.effects.speed > 0 ? this.gameSpeed * 0.6 : this.gameSpeed;

        if (deltaTime > currentSpeed) {
            this.lastUpdateTime = currentTime;
            this.update();
            this.draw();
        }

        requestAnimationFrame(this.gameLoop.bind(this));
    }

    update() {
        this.updateEffects();
        this.updateTimer();
        this.checkObstacleChange();
        this.applyMagnetEffect();

        if (this.snake.effects.freeze <= 0) {
            this.snake.move();
        }

        this.checkCollisions();
        
        this.enemySnakes.forEach(enemy => enemy.update(this.food, this.obstacles, this.snake));
        this.updateParticles();

        if (Math.random() < this.difficultySettings[this.difficulty].powerupChance) this.generatePowerup();
        this.checkLegendaryAchievement();
    }
    
    draw() {
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f0f23');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.drawSnake();
        this.drawFood();
        this.drawPowerups();
        this.drawObstacles();
        this.drawEnemySnakes();
        this.drawParticles();
    }
    
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|Black-Berry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    setupMobileControls() {
        document.getElementById('upBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.snake.changeDirection('up');
        });
        document.getElementById('downBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.snake.changeDirection('down');
        });
        document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.snake.changeDirection('left');
        });
        document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.snake.changeDirection('right');
        });
    }

    handleKeyPress(e) {
        if (!this.gameRunning) return;
        
        switch(e.key) {
            case 'ArrowUp': this.snake.changeDirection('up'); break;
            case 'ArrowDown': this.snake.changeDirection('down'); break;
            case 'ArrowLeft': this.snake.changeDirection('left'); break;
            case 'ArrowRight': this.snake.changeDirection('right'); break;
            case ' ':
            case 'Escape':
                this.togglePause();
                break;
        }
        e.preventDefault();
    }

    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        const pausePanel = document.getElementById('pausePanel');
        const pauseBtn = document.getElementById('pauseBtn');
        
        if (this.gamePaused) {
            pausePanel.classList.add('show');
            pauseBtn.textContent = '▶️';
        } else {
            pausePanel.classList.remove('show');
            pauseBtn.textContent = '⏸️';
            this.gameLoop();
        }
    }
    
    checkCollisions() {
        const head = this.snake.body[0];
        if (head.x < 0 || head.x >= this.canvasWidth || head.y < 0 || head.y >= this.canvasHeight) {
            this.collision();
            return;
        }
        for (let i = 1; i < this.snake.body.length; i++) {
            if (head.x === this.snake.body[i].x && head.y === this.snake.body[i].y) {
                this.collision();
                return;
            }
        }
        if (this.snake.effects.shield === 0) {
            for (const obstacle of this.obstacles) {
                if (head.x === obstacle.x && head.y === obstacle.y) {
                    this.collision();
                    return;
                }
            }
        }
        
        for (const enemy of this.enemySnakes) {
            if (head.x === enemy.body[0].x && head.y === enemy.body[0].y) {
                this.collision();
                return;
            }
        }
        
        if (head.x === this.food.x && head.y === this.food.y) {
            this.eatFood();
        } else {
            this.snake.body.pop();
        }

        for (let i = this.powerups.length - 1; i >= 0; i--) {
            if (head.x === this.powerups[i].x && head.y === this.powerups[i].y) {
                this.collectPowerup(this.powerups[i]);
                this.powerups.splice(i, 1);
            }
        }
    }
    
    eatFood() {
        this.player.score += this.food.points;
        if (this.food.type === 'mouse') {
            this.player.miceEaten++;
            this.updateMiceCounter();
        }
        if (this.food.heal && this.player.lives < 5) {
            this.player.lives = Math.min(this.player.lives + this.food.heal, 5);
            this.updateHearts();
            this.createParticles(this.food.x, this.food.y, '#00FF00');
        }
        this.snake.grow(this.food.growth * this.difficultySettings[this.difficulty].growthRate);
        this.player.maxSnakeLength = Math.max(this.player.maxSnakeLength, this.snake.body.length);
        this.updateScore();
        this.createParticles(this.food.x, this.food.y, this.food.color);
        this.generateFood();
        if (this.player.score >= this.player.level * 120) {
            this.levelUp();
        }
    }
    
    collision() {
        if (this.snake.effects.shield > 0) {
            this.snake.effects.shield = 0;
            this.updateActiveEffects();
            this.createParticles(this.snake.body[0].x, this.snake.body[0].y, '#4169E1');
            return;
        }
        this.player.lives--;
        this.player.perfectRun = false;
        this.updateHearts();
        this.createParticles(this.snake.body[0].x, this.snake.body[0].y, '#FF0000');
        this.canvas.classList.add('collision-effect');
        setTimeout(() => this.canvas.classList.remove('collision-effect'), 500);
        if (this.player.lives <= 0) {
            this.gameOver();
        } else {
            this.snake.body = [{ x: 100, y: 100 }];
            this.snake.direction = 'right';
            this.snake.nextDirection = 'right';
        }
    }

    gameOver() {
        this.gameRunning = false;
        if (this.player.score > this.highScore) {
            this.highScore = this.player.score;
            this.saveHighScore();
            document.getElementById('newRecord').style.display = 'block';
            this.updateHighScoreDisplay();
        } else {
            document.getElementById('newRecord').style.display = 'none';
        }
        document.getElementById('finalScore').textContent = `${this.player.name}, tu puntuación final fue: ${this.player.score} puntos`;
        this.showAchievements();
        document.getElementById('gameOver').classList.add('show');
    }

    levelUp() {
        this.player.level++;
        this.updateLevel();
        this.generateObstacles();
        this.player.score += 50;
        this.updateScore();
        this.createParticles(this.canvasWidth/2, this.canvasHeight/2, '#FFD700');
        this.checkAchievements();
    }
    
    generateFood() {
        let newFood;
        do {
            const foodKeys = Object.keys(this.foodTypes);
            const randomFoodType = foodKeys[Math.floor(Math.random() * foodKeys.length)];
            const foodData = this.foodTypes[randomFoodType];
            newFood = {
                x: Math.floor(Math.random() * (canvasWidth / gridSize)) * gridSize,
                y: Math.floor(Math.random() * (canvasHeight / gridSize)) * gridSize,
                ...foodData,
                type: randomFoodType
            };
        } while (this.isPositionOccupied(newFood.x, newFood.y));
        this.food = newFood;
    }

    generatePowerup() {
        let newPowerup;
        do {
            const powerupKeys = Object.keys(this.powerupTypes);
            const randomPowerupType = powerupKeys[Math.floor(Math.random() * powerupKeys.length)];
            const powerupData = this.powerupTypes[randomPowerupType];
            newPowerup = {
                x: Math.floor(Math.random() * (canvasWidth / gridSize)) * gridSize,
                y: Math.floor(Math.random() * (canvasHeight / gridSize)) * gridSize,
                ...powerupData,
                type: randomPowerupType
            };
        } while (this.isPositionOccupied(newPowerup.x, newPowerup.y));
        this.powerups.push(newPowerup);
    }

    generateObstacles() {
        this.obstacles = [];
        const currentObstacleEmojis = this.obstacleGroups[this.currentObstacleGroup];
        for (let i = 0; i < this.difficultySettings[this.difficulty].obstacleCount; i++) {
            let newObstacle;
            do {
                const randomObstacleType = currentObstacleEmojis[Math.floor(Math.random() * currentObstacleEmojis.length)];
                newObstacle = {
                    x: Math.floor(Math.random() * (canvasWidth / gridSize)) * gridSize,
                    y: Math.floor(Math.random() * (canvasHeight / gridSize)) * gridSize,
                    ...randomObstacleType
                };
            } while (this.isPositionOccupied(newObstacle.x, newObstacle.y));
            this.obstacles.push(newObstacle);
        }
    }

    generateEnemySnakes() {
        this.enemySnakes = [];
        for (let i = 0; i < this.difficultySettings[this.difficulty].enemyCount; i++) {
            const randomType = this.enemySnakeTypes[Math.floor(Math.random() * this.enemySnakeTypes.length)];
            this.enemySnakes.push(new EnemySnake(randomType));
        }
    }
    
    isPositionOccupied(x, y) {
        if (x === this.food.x && y === this.food.y) return true;
        if (this.snake.body.some(segment => segment.x === x && segment.y === y)) return true;
        if (this.powerups.some(p => p.x === x && p.y === y)) return true;
        if (this.obstacles.some(o => o.x === x && o.y === y)) return true;
        return false;
    }
    
    checkObstacleChange() {
        const timeElapsed = Date.now() - this.lastObstacleChange;
        const obstacleTimerDiv = document.querySelector('.obstacle-timer');

        if (timeElapsed >= 25000 && timeElapsed < 30000) {
            const timeRemaining = Math.ceil((30000 - timeElapsed) / 1000);
            obstacleTimerDiv.style.display = 'block';
            this.showObstacleTimer(timeRemaining);
        } else if (timeElapsed >= 30000) {
            obstacleTimerDiv.style.display = 'none';
            this.currentObstacleGroup = (this.currentObstacleGroup + 1) % this.obstacleGroups.length;
            this.changeObstacles();
            this.lastObstacleChange = Date.now();
            this.showAlert('¡El entorno ha cambiado!', 3000);
        } else {
            obstacleTimerDiv.style.display = 'none';
        }
    }
    
    changeObstacles() {
        this.obstacles = [];
        this.generateObstacles();
    }
    
    showAlert(message, duration = 2000) {
        const alertDiv = document.createElement('div');
        alertDiv.textContent = message;
        alertDiv.classList.add('obstacle-change-alert');
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), duration);
    }

    showObstacleTimer(time) {
        document.querySelector('.obstacle-timer').textContent = `Cambio de entorno en: ${time}s`;
    }

    updateTimer() {
        const elapsedSeconds = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        document.getElementById('gameTimer').textContent = `Tiempo: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    checkLegendaryAchievement() {
        if (this.player.maxSnakeLength >= 20 && this.player.score >= 500 && this.player.lives >= 3 && !this.legendaryAchieved) {
            this.legendaryAchieved = true;
            this.showLegendaryScreen();
        }
    }

    showLegendaryScreen() {
        document.getElementById('legendaryPlayerName').textContent = this.player.name;
        document.getElementById('legendaryScreen').classList.add('show');
        this.gamePaused = true;
        setTimeout(() => {
            document.getElementById('legendaryScreen').classList.remove('show');
            this.gamePaused = false;
        }, 5000);
    }

    updateEffects() {
        for (const effect in this.snake.effects) {
            if (this.snake.effects[effect] > 0) {
                this.snake.effects[effect] = Math.max(0, this.snake.effects[effect] - (Date.now() - this.lastUpdateTime));
            }
        }
        this.updateActiveEffects();
    }

    collectPowerup(powerup) {
        this.player.powerupsCollected++;
        this.snake.effects[powerup.type] = powerup.duration;
        this.updateActiveEffects();
        this.createParticles(powerup.x, powerup.y, powerup.color);
    }
    
    applyMagnetEffect() {
        if (this.snake.effects.magnet > 0) {
            const dx = this.food.x - this.snake.body[0].x;
            const dy = this.food.y - this.snake.body[0].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 100) {
                this.food.x += dx / 10;
                this.food.y += dy / 10;
            }
        }
    }

    createParticles(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x + gridSize / 2,
                y: y + gridSize / 2,
                color: color,
                size: Math.random() * 5 + 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                alpha: 1
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.02;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    drawSnake() {
        this.snake.body.forEach((segment, index) => {
            if (index === 0) {
                this.ctx.fillStyle = this.snake.color;
                this.ctx.fillRect(segment.x, segment.y, gridSize, gridSize);
                
                if (this.snake.effects.shield > 0) {
                    this.ctx.strokeStyle = 'rgba(65, 105, 225, 0.8)';
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeRect(segment.x, segment.y, gridSize, gridSize);
                }
            } else {
                this.ctx.fillStyle = this.darkenColor(this.snake.color, 0.1);
                this.ctx.fillRect(segment.x, segment.y, gridSize, gridSize);
            }
        });
    }

    drawFood() {
        this.ctx.font = `${gridSize}px Arial`;
        this.ctx.fillText(this.food.emoji, this.food.x, this.food.y + gridSize);
    }

    drawPowerups() {
        this.powerups.forEach(p => {
            this.ctx.font = `${gridSize}px Arial`;
            this.ctx.fillText(p.emoji, p.x, p.y + gridSize);
        });
    }

    drawObstacles() {
        this.obstacles.forEach(o => {
            this.ctx.font = `${gridSize}px Arial`;
            this.ctx.fillText(o.emoji, o.x, o.y + gridSize);
        });
    }
    
    drawEnemySnakes() {
        this.enemySnakes.forEach(enemy => {
            this.ctx.font = `${enemy.size * 5}px Arial`;
            this.ctx.fillText(enemy.emoji, enemy.body[0].x, enemy.body[0].y + enemy.size * 5);
        });
    }
    
    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(${parseInt(p.color.slice(1, 3), 16)}, ${parseInt(p.color.slice(3, 5), 16)}, ${parseInt(p.color.slice(5, 7), 16)}, ${p.alpha})`;
            this.ctx.fill();
        });
    }

    darkenColor(hex, lum) {
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

    lightenColor(hex, lum) {
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
    
    updateScore() { document.getElementById('score').textContent = `Puntuación: ${this.player.score}`; }
    updateLevel() { document.getElementById('levelInfo').textContent = `Nivel: ${this.player.level}`; }
    updateHearts() {
        const heartsContainer = document.getElementById('heartsContainer');
        heartsContainer.innerHTML = '';
        for (let i = 0; i < this.player.lives; i++) {
            heartsContainer.innerHTML += '<span class="heart">❤️</span>';
        }
    }
    updateMiceCounter() { document.getElementById('miceCounter').textContent = `Ratones: ${this.player.miceEaten}`; }
    updateActiveEffects() {
        const effectsDiv = document.getElementById('activeEffects');
        effectsDiv.innerHTML = '';
        for (const effect in this.snake.effects) {
            if (this.snake.effects[effect] > 0) {
                const icon = this.powerupTypes[effect].emoji;
                const duration = Math.ceil(this.snake.effects[effect] / 1000);
                effectsDiv.innerHTML += `<span class="effect-icon">${icon}</span>`;
            }
        }
    }

    loadHighScore() {
        const storedScore = localStorage.getItem('snakeHighScore');
        this.highScore = storedScore ? parseInt(storedScore, 10) : 0;
    }

    saveHighScore() {
        localStorage.setItem('snakeHighScore', this.highScore.toString());
    }

    updateHighScoreDisplay() {
        document.getElementById('highScoreDisplay').textContent = this.highScore;
    }

    showAchievements() {
        const achievements = this.player.checkAchievements();
        const list = document.getElementById('achievementList');
        list.innerHTML = '';
        if (achievements.length === 0) {
            list.innerHTML = '<li>Aún no has desbloqueado logros. ¡Sigue intentándolo!</li>';
        } else {
            achievements.forEach(ach => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="icon">${ach.icon}</span> <strong>${ach.name}</strong>: ${ach.description}`;
                list.appendChild(li);
            });
        }
    }

    checkAchievements() {
        const achievements = this.player.checkAchievements();
        achievements.forEach(ach => this.showAlert(`¡Logro desbloqueado: ${ach.name}!`, 3000));
    }

    createNatureBackground() {
        // Función placeholder, se puede usar para generar un fondo dinámico
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
