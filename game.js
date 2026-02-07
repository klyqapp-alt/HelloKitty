// Hello Kitty's Love Adventure - Game Logic

class HelloKittyGame {
    constructor() {
        // Game elements
        this.startScreen = document.getElementById('start-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameOverScreen = document.getElementById('gameover-screen');
        this.pauseScreen = document.getElementById('pause-screen');
        this.gameArea = document.getElementById('game-area');
        this.player = document.getElementById('player');
        this.scoreDisplay = document.getElementById('score');
        this.livesDisplay = document.getElementById('lives');
        this.levelDisplay = document.getElementById('level');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.highScoreDisplay = document.getElementById('high-score');
        this.encouragementText = document.getElementById('encouragement-text');

        // Game state
        this.isPlaying = false;
        this.isPaused = false;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('helloKittyHighScore')) || 0;
        this.playerX = 50; // percentage
        this.fallingItems = [];
        this.spawnInterval = null;
        this.gameLoop = null;
        this.lastTime = 0;
        this.itemsCaught = 0;

        // Game settings
        this.baseSpawnRate = 1500; // ms
        this.baseFallSpeed = 2; // pixels per frame
        this.playerSpeed = 8; // percentage per frame
        
        // Touch controls
        this.touchStartX = 0;
        this.isTouching = false;

        // Controls state
        this.keys = {
            left: false,
            right: false
        };

        // Items configuration
        this.items = [
            { emoji: '💕', points: 10, type: 'good' },
            { emoji: '💖', points: 15, type: 'good' },
            { emoji: '🎀', points: 20, type: 'good' },
            { emoji: '🧁', points: 25, type: 'good' },
            { emoji: '🍰', points: 30, type: 'good' },
            { emoji: '🌸', points: 15, type: 'good' },
            { emoji: '⭐', points: 50, type: 'special' },
            { emoji: '🌈', points: 100, type: 'special' },
            { emoji: '☁️', points: -1, type: 'bad' },
            { emoji: '💔', points: -1, type: 'bad' }
        ];

        this.encouragements = [
            "You're amazing! 💕",
            "So proud of you! 🌟",
            "You did great! 🎀",
            "Love you! 💖",
            "Keep being awesome! ✨",
            "You're the best! 🌸",
            "Wonderful effort! 💗",
            "You sparkle! ⭐"
        ];

        this.init();
    }

    init() {
        // Button listeners
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('resume-btn').addEventListener('click', () => this.togglePause());

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Touch controls
        this.gameArea.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.gameArea.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.gameArea.addEventListener('touchend', () => this.handleTouchEnd());

        // Mouse controls for desktop
        this.gameArea.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Prevent context menu on long press
        this.gameArea.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    handleKeyDown(e) {
        if (!this.isPlaying || this.isPaused) return;
        
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            this.keys.left = true;
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            this.keys.right = true;
        } else if (e.key === 'Escape' || e.key === 'p') {
            this.togglePause();
        }
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowLeft' || e.key === 'a') {
            this.keys.left = false;
        } else if (e.key === 'ArrowRight' || e.key === 'd') {
            this.keys.right = false;
        }
    }

    handleTouchStart(e) {
        if (!this.isPlaying || this.isPaused) return;
        e.preventDefault();
        this.isTouching = true;
        this.touchStartX = e.touches[0].clientX;
    }

    handleTouchMove(e) {
        if (!this.isPlaying || this.isPaused || !this.isTouching) return;
        e.preventDefault();
        
        const rect = this.gameArea.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const percentage = (touchX / rect.width) * 100;
        
        this.playerX = Math.max(10, Math.min(90, percentage));
        this.updatePlayerPosition();
    }

    handleTouchEnd() {
        this.isTouching = false;
    }

    handleMouseMove(e) {
        if (!this.isPlaying || this.isPaused) return;
        
        const rect = this.gameArea.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const percentage = (mouseX / rect.width) * 100;
        
        this.playerX = Math.max(10, Math.min(90, percentage));
        this.updatePlayerPosition();
    }

    updatePlayerPosition() {
        this.player.style.left = `${this.playerX}%`;
    }

    showScreen(screen) {
        [this.startScreen, this.gameScreen, this.gameOverScreen, this.pauseScreen].forEach(s => {
            s.classList.add('hidden');
        });
        screen.classList.remove('hidden');
    }

    startGame() {
        // Reset game state
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.itemsCaught = 0;
        this.playerX = 50;
        this.fallingItems = [];
        this.isPlaying = true;
        this.isPaused = false;

        // Update displays
        this.updateScore();
        this.updateLives();
        this.updateLevel();
        this.updatePlayerPosition();

        // Clear any existing items
        this.gameArea.querySelectorAll('.falling-item').forEach(item => item.remove());

        // Show game screen
        this.showScreen(this.gameScreen);

        // Start game loops
        this.startSpawning();
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((time) => this.update(time));
    }

    startSpawning() {
        const spawnRate = Math.max(500, this.baseSpawnRate - (this.level - 1) * 150);
        
        this.spawnInterval = setInterval(() => {
            if (!this.isPaused) {
                this.spawnItem();
            }
        }, spawnRate);
    }

    spawnItem() {
        // Weight the random selection - more good items, fewer special and bad
        const rand = Math.random();
        let item;
        
        if (rand < 0.65) {
            // Good items (65% chance)
            const goodItems = this.items.filter(i => i.type === 'good');
            item = goodItems[Math.floor(Math.random() * goodItems.length)];
        } else if (rand < 0.85) {
            // Bad items (20% chance)
            const badItems = this.items.filter(i => i.type === 'bad');
            item = badItems[Math.floor(Math.random() * badItems.length)];
        } else {
            // Special items (15% chance)
            const specialItems = this.items.filter(i => i.type === 'special');
            item = specialItems[Math.floor(Math.random() * specialItems.length)];
        }

        const element = document.createElement('div');
        element.className = 'falling-item';
        if (item.type === 'special') {
            element.classList.add('rainbow-glow');
        }
        element.textContent = item.emoji;
        element.style.left = `${Math.random() * 80 + 10}%`;
        element.style.top = '-50px';

        this.gameArea.appendChild(element);
        
        this.fallingItems.push({
            element,
            y: -50,
            x: parseFloat(element.style.left),
            speed: this.baseFallSpeed + (this.level - 1) * 0.3 + Math.random() * 0.5,
            points: item.points,
            type: item.type
        });
    }

    update(currentTime) {
        if (!this.isPlaying) return;

        const deltaTime = (currentTime - this.lastTime) / 16.67; // normalize to ~60fps
        this.lastTime = currentTime;

        if (!this.isPaused) {
            this.movePlayer(deltaTime);
            this.updateItems(deltaTime);
            this.checkLevelUp();
        }

        this.gameLoop = requestAnimationFrame((time) => this.update(time));
    }

    movePlayer(deltaTime) {
        if (this.keys.left) {
            this.playerX = Math.max(10, this.playerX - this.playerSpeed * deltaTime);
        }
        if (this.keys.right) {
            this.playerX = Math.min(90, this.playerX + this.playerSpeed * deltaTime);
        }
        this.updatePlayerPosition();
    }

    updateItems(deltaTime) {
        const playerRect = this.player.getBoundingClientRect();
        const gameRect = this.gameArea.getBoundingClientRect();
        const gameHeight = gameRect.height;

        for (let i = this.fallingItems.length - 1; i >= 0; i--) {
            const item = this.fallingItems[i];
            item.y += item.speed * deltaTime;
            item.element.style.top = `${item.y}px`;

            // Check collision with player
            const itemRect = item.element.getBoundingClientRect();
            
            if (this.checkCollision(itemRect, playerRect)) {
                this.handleCatch(item, i);
                continue;
            }

            // Check if item fell past the bottom
            if (item.y > gameHeight) {
                if (item.type !== 'bad') {
                    // Missed a good item - but don't lose life for missing
                }
                item.element.remove();
                this.fallingItems.splice(i, 1);
            }
        }
    }

    checkCollision(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                 rect1.left > rect2.right || 
                 rect1.bottom < rect2.top || 
                 rect1.top > rect2.bottom);
    }

    handleCatch(item, index) {
        const itemRect = item.element.getBoundingClientRect();
        const gameRect = this.gameArea.getBoundingClientRect();

        if (item.type === 'bad') {
            // Hit a bad item - lose a life
            this.loseLife();
            this.showScorePopup('-💔', itemRect.left - gameRect.left, itemRect.top - gameRect.top, true);
        } else {
            // Caught a good/special item
            this.score += item.points;
            this.itemsCaught++;
            this.updateScore();
            this.showScorePopup(`+${item.points}`, itemRect.left - gameRect.left, itemRect.top - gameRect.top);
            this.createSparkles(itemRect.left - gameRect.left, itemRect.top - gameRect.top);
        }

        item.element.classList.add('caught');
        setTimeout(() => {
            item.element.remove();
        }, 300);
        
        this.fallingItems.splice(index, 1);
    }

    showScorePopup(text, x, y, isNegative = false) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = text;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        if (isNegative) {
            popup.style.color = '#ff6b6b';
        }
        this.gameArea.appendChild(popup);
        
        setTimeout(() => popup.remove(), 800);
    }

    createSparkles(x, y) {
        for (let i = 0; i < 5; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.style.left = `${x + Math.random() * 40 - 20}px`;
            sparkle.style.top = `${y + Math.random() * 40 - 20}px`;
            this.gameArea.appendChild(sparkle);
            
            setTimeout(() => sparkle.remove(), 600);
        }
    }

    loseLife() {
        this.lives--;
        this.updateLives();
        
        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    checkLevelUp() {
        const newLevel = Math.floor(this.score / 200) + 1;
        if (newLevel > this.level) {
            this.level = newLevel;
            this.updateLevel();
            
            // Restart spawning with new rate
            clearInterval(this.spawnInterval);
            this.startSpawning();
        }
    }

    updateScore() {
        this.scoreDisplay.textContent = this.score;
    }

    updateLives() {
        const hearts = this.livesDisplay.querySelectorAll('.heart');
        hearts.forEach((heart, index) => {
            if (index < this.lives) {
                heart.classList.remove('lost');
            } else {
                heart.classList.add('lost');
            }
        });
    }

    updateLevel() {
        this.levelDisplay.textContent = this.level;
    }

    togglePause() {
        if (!this.isPlaying) return;

        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.pauseScreen.classList.remove('hidden');
        } else {
            this.pauseScreen.classList.add('hidden');
        }
    }

    gameOver() {
        this.isPlaying = false;
        clearInterval(this.spawnInterval);
        cancelAnimationFrame(this.gameLoop);

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('helloKittyHighScore', this.highScore);
        }

        // Update displays
        this.finalScoreDisplay.textContent = this.score;
        this.highScoreDisplay.textContent = this.highScore;
        this.encouragementText.textContent = this.encouragements[Math.floor(Math.random() * this.encouragements.length)];

        // Show game over screen
        setTimeout(() => {
            this.showScreen(this.gameOverScreen);
        }, 500);
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new HelloKittyGame();
});
