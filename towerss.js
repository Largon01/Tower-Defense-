// Tower Defense - Консольная версия (исправлены координаты башен)
// Запуск: node tower_defense.js

const readline = require('readline');

// Настройка вывода в консоль
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Очистка консоли
const clearConsole = () => {
    console.clear();
};

// Цвета для консоли
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

class TowerDefenseGame {
    constructor() {
        // Игровые параметры
        this.lives = 20;
        this.money = 300;
        this.wave = 1;
        this.gameOver = false;
        this.waveInProgress = false;
        this.enemiesToSpawn = 0;
        this.spawnDelay = 0;
        
        // Массивы объектов
        this.enemies = [];
        this.towers = [];
        this.projectiles = [];
        
        // Карта 15x15
        this.mapWidth = 15;
        this.mapHeight = 15;
        
        // Точки пути (адаптированы под 15x15)
        this.path = [
            {x: 0, y: 3}, {x: 4, y: 3}, {x: 4, y: 7}, {x: 8, y: 7},
            {x: 8, y: 11}, {x: 12, y: 11}, {x: 12, y: 7}, {x: 14, y: 7}
        ];
        
        this.updateInProgress = false;
    }
    
    // Получить количество врагов в волне
    getEnemiesCount() {
        return Math.min(5 + Math.floor(this.wave * 1.2), 15);
    }
    
    // Создать нового врага
    spawnEnemy() {
        const health = 30 + this.wave * 4;
        const reward = 25 + this.wave * 3;
        const speed = 0.8 + this.wave * 0.05;
        
        this.enemies.push({
            x: this.path[0].x,
            y: this.path[0].y,
            pathIndex: 1,
            health: health,
            maxHealth: health,
            reward: reward,
            speed: speed,
            id: Math.random()
        });
    }
    
    // Проверка, можно ли построить башню на клетке
    isValidTowerPosition(x, y) {
        // Проверка границ карты
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) {
            return { valid: false, message: `Координаты (${x}, ${y}) вне карты! Используйте X от 0 до ${this.mapWidth-1}, Y от 0 до ${this.mapHeight-1}` };
        }
        
        // Проверка на пути (нельзя строить на самом пути)
        for (let point of this.path) {
            if (point.x === x && point.y === y) {
                return { valid: false, message: `Нельзя строить башню на пути! Клетка (${x}, ${y}) является частью дороги.` };
            }
        }
        
        // Проверка на существующую башню
        for (let tower of this.towers) {
            if (tower.x === x && tower.y === y) {
                return { valid: false, message: `На клетке (${x}, ${y}) уже есть башня!` };
            }
        }
        
        // Проверка на близость к пути (нельзя строить вплотную к пути)
        for (let point of this.path) {
            if (Math.abs(point.x - x) <= 0.5 && Math.abs(point.y - y) <= 0.5) {
                return { valid: false, message: `Нельзя строить башню слишком близко к пути!` };
            }
        }
        
        return { valid: true, message: "Место подходит для строительства" };
    }
    
    // Построить башню
    addTower(x, y, type) {
        // Проверка позиции
        const positionCheck = this.isValidTowerPosition(x, y);
        if (!positionCheck.valid) {
            return {success: false, message: positionCheck.message};
        }
        
        const towerConfig = {
            basic: {cost: 100, range: 3, damage: 20, cooldown: 30, name: "Обычную", symbol: "🏰", emoji: "🔫"},
            sniper: {cost: 200, range: 5, damage: 50, cooldown: 50, name: "Снайперскую", symbol: "🗼", emoji: "🎯"},
            rapid: {cost: 150, range: 2.5, damage: 10, cooldown: 15, name: "Быструю", symbol: "🗻", emoji: "⚡"}
        };
        
        const config = towerConfig[type];
        if (!config) {
            return {success: false, message: "Неверный тип башни! Используйте: basic, sniper, rapid"};
        }
        
        if (this.money < config.cost) {
            return {success: false, message: `Недостаточно денег! Нужно ${config.cost}💰, у вас ${this.money}💰`};
        }
        
        this.towers.push({
            x: x, y: y, type: type,
            cooldown: 0, range: config.range,
            damage: config.damage, fireRate: config.cooldown,
            symbol: config.symbol,
            emoji: config.emoji,
            name: config.name
        });
        
        this.money -= config.cost;
        return {success: true, message: `✅ Построена ${config.name} башня на координатах (${x}, ${y}) за ${config.cost}💰! Осталось денег: ${this.money}💰`};
    }
    
    // Начать волну
    startWave() {
        if (this.gameOver) {
            return {success: false, message: "Игра окончена!"};
        }
        if (this.waveInProgress) {
            return {success: false, message: "Волна уже в процессе!"};
        }
        
        this.waveInProgress = true;
        this.enemiesToSpawn = this.getEnemiesCount();
        this.spawnDelay = 0;
        return {success: true, message: `🌊 Волна ${this.wave} началась! Готовьтесь к атаке!`};
    }
    
    // Обновление игры (один шаг)
    update() {
        if (this.gameOver) return false;
        if (!this.waveInProgress && this.enemies.length === 0) return false;
        
        let changed = false;
        
        // Спавн врагов
        if (this.waveInProgress && this.enemiesToSpawn > 0) {
            if (this.spawnDelay <= 0) {
                this.spawnEnemy();
                this.enemiesToSpawn--;
                this.spawnDelay = 15;
                changed = true;
            } else {
                this.spawnDelay--;
                changed = true;
            }
        }
        
        // Обновление врагов
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            
            if (enemy.pathIndex >= this.path.length) {
                // Враг дошел до конца
                const damage = Math.max(1, Math.floor(enemy.health / 20));
                this.lives -= damage;
                this.enemies.splice(i, 1);
                i--;
                changed = true;
                continue;
            }
            
            const target = this.path[enemy.pathIndex];
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance < enemy.speed) {
                enemy.x = target.x;
                enemy.y = target.y;
                enemy.pathIndex++;
                changed = true;
            } else {
                const angle = Math.atan2(dy, dx);
                enemy.x += Math.cos(angle) * enemy.speed;
                enemy.y += Math.sin(angle) * enemy.speed;
                changed = true;
            }
        }
        
        // Обновление башен и атака
        for (let tower of this.towers) {
            if (tower.cooldown > 0) {
                tower.cooldown--;
                continue;
            }
            
            let closestEnemy = null;
            let minDistance = Infinity;
            
            for (let enemy of this.enemies) {
                const distance = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
                if (distance < tower.range && distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = enemy;
                }
            }
            
            if (closestEnemy) {
                closestEnemy.health -= tower.damage;
                tower.cooldown = tower.fireRate;
                changed = true;
                
                // Добавляем снаряд
                this.projectiles.push({
                    x: tower.x, y: tower.y,
                    target: closestEnemy,
                    life: 5
                });
                
                // Если враг убит
                if (closestEnemy.health <= 0) {
                    const reward = closestEnemy.reward;
                    this.money += reward;
                    const index = this.enemies.indexOf(closestEnemy);
                    if (index !== -1) this.enemies.splice(index, 1);
                    changed = true;
                }
            }
        }
        
        // Обновление снарядов
        for (let i = 0; i < this.projectiles.length; i++) {
            this.projectiles[i].life--;
            if (this.projectiles[i].life <= 0) {
                this.projectiles.splice(i, 1);
                i--;
                changed = true;
            }
        }
        
        // Проверка окончания волны
        if (this.waveInProgress && this.enemies.length === 0 && this.enemiesToSpawn === 0) {
            this.waveInProgress = false;
            this.wave++;
            this.showWaveComplete();
            changed = true;
        }
        
        // Проверка поражения
        if (this.lives <= 0) {
            this.gameOver = true;
            this.showGameOver();
            changed = true;
        }
        
        return changed;
    }
    
    // Показать завершение волны
    showWaveComplete() {
        console.log(`\n${colors.green}═══════════════════════════════════`);
        console.log(`   ✅ ВОЛНА ${this.wave - 1} ЗАВЕРШЕНА! ✅`);
        console.log(`   💰 Бонус: +50 монет`);
        console.log(`   ❤️ Осталось жизней: ${this.lives}`);
        console.log(`═══════════════════════════════════${colors.reset}\n`);
        this.money += 50;
        
        if (this.wave > 1 && !this.gameOver) {
            console.log(`${colors.yellow}✨ Введите "start wave" чтобы начать следующую волну ✨${colors.reset}\n`);
        }
    }
    
    // Показать окончание игры
    showGameOver() {
        console.log(`\n${colors.red}╔════════════════════════════════════╗`);
        console.log(`║            GAME OVER!              ║`);
        console.log(`║    Вы продержались ${this.wave} волн(ы)     ║`);
        console.log(`╚════════════════════════════════════╝${colors.reset}\n`);
    }
    
    // Отрисовка карты
    render() {
        clearConsole();
        
        // Создание карты
        let map = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill('⬜'));
        
        // Рисуем путь
        for (let i = 0; i < this.path.length - 1; i++) {
            const p1 = this.path[i];
            const p2 = this.path[i + 1];
            
            if (p1.x === p2.x) {
                for (let y = Math.min(p1.y, p2.y); y <= Math.max(p1.y, p2.y); y++) {
                    if (y >= 0 && y < this.mapHeight && p1.x >= 0 && p1.x < this.mapWidth) {
                        map[y][p1.x] = '⬛';
                    }
                }
            } else {
                for (let x = Math.min(p1.x, p2.x); x <= Math.max(p1.x, p2.x); x++) {
                    if (p1.y >= 0 && p1.y < this.mapHeight && x >= 0 && x < this.mapWidth) {
                        map[p1.y][x] = '⬛';
                    }
                }
            }
        }
        
        // Стартовая точка
        const start = this.path[0];
        if (start.y >= 0 && start.y < this.mapHeight && start.x >= 0 && start.x < this.mapWidth) {
            map[start.y][start.x] = '🟢';
        }
        
        // Конечная точка
        const end = this.path[this.path.length - 1];
        if (end.y >= 0 && end.y < this.mapHeight && end.x >= 0 && end.x < this.mapWidth) {
            map[end.y][end.x] = '🔴';
        }
        
        // Рисуем башни
        for (let tower of this.towers) {
            if (tower.x >= 0 && tower.x < this.mapWidth && tower.y >= 0 && tower.y < this.mapHeight) {
                map[tower.y][tower.x] = tower.symbol;
            }
        }
        
        // Рисуем врагов
        for (let enemy of this.enemies) {
            const x = Math.floor(enemy.x);
            const y = Math.floor(enemy.y);
            if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                const healthPercent = enemy.health / enemy.maxHealth;
                if (healthPercent > 0.66) map[y][x] = '👾';
                else if (healthPercent > 0.33) map[y][x] = '👿';
                else map[y][x] = '💀';
            }
        }
        
        // Рисуем снаряды
        for (let proj of this.projectiles) {
            const x = Math.floor(proj.x);
            const y = Math.floor(proj.y);
            if (x >= 0 && x < this.mapWidth && y >= 0 && y < this.mapHeight) {
                if (map[y][x] === '⬜' || map[y][x] === '⬛') {
                    map[y][x] = '💨';
                }
            }
        }
        
        // Вывод интерфейса
        console.log(`${colors.cyan}╔════════════════════════════════════════════════╗`);
        console.log(`║         TOWER DEFENSE - КОНСОЛЬНАЯ ВЕРСИЯ        ║`);
        console.log(`╚════════════════════════════════════════════════╝${colors.reset}\n`);
        
        console.log(`${colors.yellow}❤️  Жизни: ${this.lives}  |  💰 Деньги: $${this.money}  |  🌊 Волна: ${this.wave}  |  👾 Врагов: ${this.enemies.length}${colors.reset}\n`);
        
        // Вывод карты с координатами
        console.log(`${colors.green}Карта 15x15 (координаты X →, Y ↓):${colors.reset}`);
        console.log(`${colors.white}    ${'0 1 2 3 4 5 6 7 8 9 0 1 2 3 4'}`);
        for (let y = 0; y < this.mapHeight; y++) {
            let row = `${y < 10 ? ' ' : ''}${y} `;
            for (let x = 0; x < this.mapWidth; x++) {
                row += map[y][x] + ' ';
            }
            console.log(row);
        }
        
        console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        
        // Легенда
        console.log(`${colors.white}Легенда:`);
        console.log(`  ⬜ - Пустая клетка  🟢 - Старт  🔴 - Финиш  ⬛ - Дорога`);
        console.log(`  🏰 - Обычная башня  🗼 - Снайпер  🗻 - Быстрая`);
        console.log(`  👾👿💀 - Враги (здоровый/раненый/слабый)  💨 - Снаряд${colors.reset}`);
        
        console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        
        // Статус игры
        if (this.gameOver) {
            console.log(`${colors.red}💀 ИГРА ОКОНЧЕНА! Введите "exit" чтобы выйти 💀${colors.reset}`);
        } else if (this.waveInProgress) {
            console.log(`${colors.yellow}⚔️  БИТВА В ПРОГРЕССЕ! ⚔️${colors.reset}`);
            if (this.enemiesToSpawn > 0) {
                console.log(`${colors.cyan}👾 Осталось заспавнить врагов: ${this.enemiesToSpawn}${colors.reset}`);
            }
            console.log(`${colors.yellow}Команды: "update" - сделать ход | "auto" - авто-режим${colors.reset}`);
        } else {
            console.log(`${colors.green}🏰 ВОЙСКА НА ОТДЫХЕ 🏰${colors.reset}`);
            if (this.wave === 1 && this.towers.length === 0) {
                console.log(`${colors.yellow}📝 Постройте первую башню! Пример: build 2 5 basic${colors.reset}`);
            } else {
                console.log(`${colors.yellow}✨ Введите "start wave" чтобы начать атаку! ✨${colors.reset}`);
            }
        }
        
        console.log(`\n${colors.magenta}📋 Доступные команды:${colors.reset}`);
        console.log(`${colors.white}  • build <x> <y> <type>  - построить башню (basic/sniper/rapid)`);
        console.log(`    ${colors.green}Пример: build 2 5 basic - построит обычную башню на X=2, Y=5${colors.reset}`);
        console.log(`${colors.white}  • start wave              - начать волну`);
        console.log(`  • update                  - сделать один шаг игры`);
        console.log(`  • auto                    - включить авто-режим (шаг в секунду)`);
        console.log(`  • stop                    - выключить авто-режим`);
        console.log(`  • towers                  - список всех башен`);
        console.log(`  • status                  - подробный статус игры`);
        console.log(`  • help                    - показать справку`);
        console.log(`  • exit                    - выйти из игры${colors.reset}`);
        console.log(`\n${colors.cyan}════════════════════════════════════════════════${colors.reset}`);
    }
    
    // Показать список башен
    showTowers() {
        if (this.towers.length === 0) {
            console.log(`\n${colors.yellow}📦 Нет построенных башен!${colors.reset}`);
            console.log(`${colors.white}Постройте первую башню: build 2 5 basic${colors.reset}\n`);
            return;
        }
        
        console.log(`\n${colors.green}═══════════════════════════════════`);
        console.log(`📊 ПОСТРОЕННЫЕ БАШНИ (${this.towers.length} шт.):`);
        console.log(`═══════════════════════════════════${colors.reset}`);
        for (let i = 0; i < this.towers.length; i++) {
            const t = this.towers[i];
            const typeName = t.type === 'basic' ? 'Обычная' : t.type === 'sniper' ? 'Снайперская' : 'Быстрая';
            console.log(`${colors.white}${i + 1}. ${typeName} башня ${t.emoji} на координатах (${t.x}, ${t.y})`);
            console.log(`   Урон: ${t.damage} | Радиус: ${t.range} | Перезарядка: ${t.fireRate}${colors.reset}`);
        }
        console.log(`${colors.green}═══════════════════════════════════${colors.reset}\n`);
    }
    
    // Показать статус
    showStatus() {
        console.log(`\n${colors.cyan}═══════════════════════════════════`);
        console.log(`📊 СТАТУС ИГРЫ:`);
        console.log(`═══════════════════════════════════`);
        console.log(`   ❤️ Жизни: ${this.lives}`);
        console.log(`   💰 Деньги: $${this.money}`);
        console.log(`   🌊 Текущая волна: ${this.wave}`);
        console.log(`   🏗️ Башен построено: ${this.towers.length}`);
        console.log(`   👾 Врагов на поле: ${this.enemies.length}`);
        console.log(`   📍 Размер карты: ${this.mapWidth}x${this.mapHeight}`);
        
        const towerStats = {
            basic: 0, sniper: 0, rapid: 0
        };
        for (let t of this.towers) {
            towerStats[t.type]++;
        }
        
        console.log(`   🏰 Обычных башен: ${towerStats.basic}`);
        console.log(`   🗼 Снайперских: ${towerStats.sniper}`);
        console.log(`   🗻 Быстрых: ${towerStats.rapid}`);
        
        if (this.waveInProgress) {
            console.log(`   📋 Осталось заспавнить: ${this.enemiesToSpawn}`);
            console.log(`   ⏰ Задержка спавна: ${this.spawnDelay}`);
        }
        console.log(`═══════════════════════════════════${colors.reset}\n`);
    }
    
    // Показать помощь
    showHelp() {
        console.log(`\n${colors.yellow}═══════════════════════════════════════════════════════════`);
        console.log(`📖 СПРАВКА ПО ИГРЕ TOWER DEFENSE`);
        console.log(`═══════════════════════════════════════════════════════════${colors.reset}`);
        
        console.log(`\n${colors.green}🎯 Цель игры:${colors.reset}`);
        console.log(`  Защитить базу от волн врагов, строя башни вдоль их пути.`);
        
        console.log(`\n${colors.green}🎮 Управление:${colors.reset}`);
        console.log(`  • Игра НЕ обновляется автоматически (кроме auto-режима)`);
        console.log(`  • "update" - сделать один шаг игры`);
        console.log(`  • "auto" - автоматическое обновление каждую секунду`);
        console.log(`  • "stop" - остановить авто-обновление`);
        
        console.log(`\n${colors.green}🏗️ Как строить башни:${colors.reset}`);
        console.log(`  ${colors.cyan}build <X> <Y> <тип>${colors.reset}`);
        console.log(`  • X - координата по горизонтали (0-14)`);
        console.log(`  • Y - координата по вертикали (0-14)`);
        console.log(`  • тип - basic, sniper или rapid`);
        console.log(`  ${colors.green}Примеры:${colors.reset}`);
        console.log(`    build 2 5 basic    - обычная башня на X=2, Y=5`);
        console.log(`    build 7 3 sniper   - снайперская башня на X=7, Y=3`);
        console.log(`    build 10 8 rapid   - быстрая башня на X=10, Y=8`);
        
        console.log(`\n${colors.green}🗼 Типы башен:${colors.reset}`);
        console.log(`  • ${colors.cyan}basic${colors.reset} (🏰 Обычная) - Цена: 100💰 | Урон: 20 | Радиус: 3`);
        console.log(`  • ${colors.cyan}sniper${colors.reset} (🗼 Снайпер) - Цена: 200💰 | Урон: 50 | Радиус: 5`);
        console.log(`  • ${colors.cyan}rapid${colors.reset} (🗻 Быстрая) - Цена: 150💰 | Урон: 10 | Радиус: 2.5`);
        
        console.log(`\n${colors.green}👾 Враги:${colors.reset}`);
        console.log(`  • 👾 Здоровый враг (>66% HP)`);
        console.log(`  • 👿 Раненый враг (33-66% HP)`);
        console.log(`  • 💀 Умирающий враг (<33% HP)`);
        console.log(`  • С каждой волной враги становятся сильнее`);
        
        console.log(`\n${colors.green}💡 Советы по тактике:${colors.reset}`);
        console.log(`  • Снайперские башни ставьте на поворотах (большой радиус)`);
        console.log(`  • Быстрые башни эффективны против больших групп`);
        console.log(`  • Стройте башни в узких местах пути`);
        console.log(`  • Не стройте башни слишком близко друг к другу`);
        console.log(`  • Смотрите на карту - ⬛ это дорога, там строить нельзя!`);
        
        console.log(`\n${colors.green}💰 Экономика:${colors.reset}`);
        console.log(`  • Стартовый капитал: 300💰`);
        console.log(`  • Награда за убийство врага: от 25💰`);
        console.log(`  • Бонус за волну: +50💰`);
        
        console.log(`\n${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}\n`);
    }
}

// Основной игровой цикл
const game = new TowerDefenseGame();
let autoMode = false;
let autoInterval = null;

// Функция остановки авто-режима
function stopAutoMode() {
    if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
    }
    autoMode = false;
}

// Функция шага игры
function stepGame(showRender = true) {
    const changed = game.update();
    if (showRender) game.render();
    return changed;
}

// Функция обработки команд
function processCommand(input) {
    const cmd = input.trim().toLowerCase();
    const parts = cmd.split(' ');
    
    switch(parts[0]) {
        case 'build':
        case 'b':
            if (parts.length < 4) {
                console.log(`${colors.yellow}⚠️ Неправильный формат команды!${colors.reset}`);
                console.log(`${colors.white}Использование: build <x> <y> <basic|sniper|rapid>${colors.reset}`);
                console.log(`${colors.green}Пример: build 2 5 basic${colors.reset}`);
                return;
            }
            const x = parseInt(parts[1]);
            const y = parseInt(parts[2]);
            const type = parts[3];
            
            if (isNaN(x) || isNaN(y)) {
                console.log(`${colors.red}❌ Ошибка: X и Y должны быть числами!${colors.reset}`);
                console.log(`${colors.white}Пример: build 2 5 basic${colors.reset}`);
                return;
            }
            
            const result = game.addTower(x, y, type);
            if (result.success) {
                console.log(`${colors.green}${result.message}${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ ${result.message}${colors.reset}`);
            }
            game.render();
            break;
            
        case 'start':
            if (parts[1] === 'wave' || parts[1] === 'w') {
                const result = game.startWave();
                console.log(result.success ? `${colors.green}${result.message}${colors.reset}` : `${colors.yellow}${result.message}${colors.reset}`);
                game.render();
            } else {
                console.log(`${colors.yellow}⚠️ Неизвестная команда. Используйте "start wave"${colors.reset}`);
            }
            break;
            
        case 'update':
        case 'u':
            if (!game.waveInProgress && game.enemies.length === 0 && !game.gameOver) {
                console.log(`${colors.yellow}⚠️ Нет активной волны! Используйте "start wave" для начала.${colors.reset}`);
            } else {
                stepGame(true);
            }
            break;
            
        case 'auto':
        case 'a':
            if (game.gameOver) {
                console.log(`${colors.red}❌ Игра окончена! Введите "exit" чтобы выйти.${colors.reset}`);
                return;
            }
            if (autoMode) {
                console.log(`${colors.yellow}⚠️ Авто-режим уже включен${colors.reset}`);
                return;
            }
            if (!game.waveInProgress && game.enemies.length === 0) {
                console.log(`${colors.yellow}⚠️ Нет активной волны! Сначала начните волну командой "start wave"${colors.reset}`);
                return;
            }
            autoMode = true;
            autoInterval = setInterval(() => {
                if (autoMode && !game.gameOver) {
                    const changed = stepGame(false);
                    if (changed) game.render();
                    if (game.gameOver || (!game.waveInProgress && game.enemies.length === 0 && !game.gameOver)) {
                        stopAutoMode();
                        if (!game.gameOver) {
                            console.log(`\n${colors.green}✅ Волна завершена! Авто-режим остановлен.${colors.reset}`);
                            game.render();
                        }
                    }
                } else if (autoMode && game.gameOver) {
                    stopAutoMode();
                    game.render();
                }
            }, 1000);
            console.log(`${colors.green}✅ Авто-режим включен! Игра будет обновляться каждую секунду.${colors.reset}`);
            console.log(`${colors.yellow}Введите "stop" чтобы остановить авто-режим${colors.reset}`);
            game.render();
            break;
            
        case 'stop':
            if (autoMode) {
                stopAutoMode();
                console.log(`${colors.green}✅ Авто-режим выключен${colors.reset}`);
                game.render();
            } else {
                console.log(`${colors.yellow}⚠️ Авто-режим не активен${colors.reset}`);
            }
            break;
            
        case 'towers':
        case 't':
            game.showTowers();
            break;
            
        case 'status':
        case 's':
            game.showStatus();
            break;
            
        case 'help':
        case 'h':
        case '?':
            game.showHelp();
            break;
            
        case 'exit':
        case 'quit':
        case 'q':
            console.log(`${colors.yellow}👋 Выход из игры...${colors.reset}`);
            stopAutoMode();
            rl.close();
            process.exit(0);
            break;
            
        default:
            console.log(`${colors.red}❌ Неизвестная команда! Введите "help" для списка команд.${colors.reset}`);
    }
}

// Инициализация игры
function init() {
    clearConsole();
    
    console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                    TOWER DEFENSE GAME                        ║
║                Консольная стратегия (15x15)                  ║
║                   Версия с исправленными координатами         ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
    `);
    
    console.log(`${colors.yellow}🎮 Добро пожаловать в Tower Defense!${colors.reset}`);
    console.log(`${colors.white}Это пошаговая версия - используйте "update" для хода или "auto" для авто-режима${colors.reset}\n`);
    
    game.showHelp();
    game.render();
    
    console.log(`\n${colors.green}✅ Игра готова! Постройте башни командой "build"!${colors.reset}`);
    console.log(`${colors.white}📝 Пример: build 2 5 basic - построит башню на координатах X=2, Y=5${colors.reset}`);
    
    // Обработка ввода
    rl.on('line', (input) => {
        if (input.trim()) {
            processCommand(input);
        }
    });
}

// Запуск игры
init();