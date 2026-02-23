const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* ---------------- SOUND ---------------- */

const shootSound = new Audio("https://actions.google.com/sounds/v1/explosions/explosion.ogg");
const ricochetSound = new Audio("https://actions.google.com/sounds/v1/impacts/metal_clank.ogg");

/* ---------------- PARTICLES ---------------- */

let particles = [];

function createExplosion(x, y, color) {
    for (let i = 0; i < 25; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 40,
            color
        });
    }
}

/* ---------------- TANK ---------------- */

class Tank {
    constructor(x, y, color, armor, speed) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.turretAngle = 0;
        this.color = color;
        this.armor = armor;      // base armor thickness
        this.health = 100;
        this.speed = speed;
        this.reload = 0;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = this.color;
        ctx.fillRect(-25, -15, 50, 30);

        ctx.fillStyle = "#222";
        ctx.fillRect(-30, -20, 60, 5);
        ctx.fillRect(-30, 15, 60, 5);

        ctx.rotate(this.turretAngle - this.angle);
        ctx.fillStyle = "#111";
        ctx.fillRect(0, -5, 40, 10);

        ctx.restore();
    }

    shoot() {
        if (this.reload <= 0) {
            bullets.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(this.turretAngle) * 12,
                vy: Math.sin(this.turretAngle) * 12,
                penetration: 120 + Math.random() * 40,
                owner: this
            });
            shootSound.cloneNode().play();
            this.reload = 100;
        }
    }

    update() {
        if (this.reload > 0) this.reload--;
    }
}

/* ---------------- SETUP ---------------- */

const player = new Tank(200, canvas.height/2, "#4c6ef5", 100, 2);
const enemy = new Tank(canvas.width-200, canvas.height/2, "#8b0000", 160, 1.4);

let bullets = [];
let keys = {};
let gameOver = false;

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

/* ---------------- CONTROLS ---------------- */

function controlPlayer() {
    if (keys["w"]) {
        player.x += Math.cos(player.angle) * player.speed;
        player.y += Math.sin(player.angle) * player.speed;
    }
    if (keys["s"]) {
        player.x -= Math.cos(player.angle) * player.speed;
        player.y -= Math.sin(player.angle) * player.speed;
    }
    if (keys["a"]) player.angle -= 0.05;
    if (keys["d"]) player.angle += 0.05;

    if (keys["ArrowLeft"]) player.turretAngle -= 0.05;
    if (keys["ArrowRight"]) player.turretAngle += 0.05;

    if (keys[" "]) player.shoot();
}

/* ---------------- AI ---------------- */

function enemyAI() {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    const angleToPlayer = Math.atan2(dy, dx);
    enemy.turretAngle = angleToPlayer;

    if (dist > 250) {
        enemy.angle += (angleToPlayer - enemy.angle + 0.4) * 0.02;
        enemy.x += Math.cos(enemy.angle) * enemy.speed;
        enemy.y += Math.sin(enemy.angle) * enemy.speed;
    }

    if (dist < 700) enemy.shoot();
}

/* ---------------- PENETRATION LOGIC ---------------- */

function checkPenetration(bullet, tank) {

    const impactAngle = Math.atan2(bullet.vy, bullet.vx);
    let angleDiff = Math.abs(tank.angle - impactAngle);
    if (angleDiff > Math.PI) angleDiff = 2*Math.PI - angleDiff;

    // effective armor increases with angle
    const effectiveArmor = tank.armor / Math.cos(angleDiff);

    if (bullet.penetration > effectiveArmor) {
        tank.health -= 40;
        createExplosion(bullet.x, bullet.y, "orange");
        return "penetrated";
    } else {
        ricochetSound.cloneNode().play();
        createExplosion(bullet.x, bullet.y, "gray");
        bullet.vx *= -0.6;
        bullet.vy *= -0.6;
        return "ricochet";
    }
}

/* ---------------- BULLETS ---------------- */

function updateBullets() {
    bullets.forEach((b, i) => {
        b.x += b.vx;
        b.y += b.vy;

        [player, enemy].forEach(t => {
            if (b.owner !== t) {
                const d = Math.hypot(b.x - t.x, b.y - t.y);
                if (d < 30) {
                    const result = checkPenetration(b, t);
                    if (result === "penetrated") {
                        bullets.splice(i, 1);
                    }
                }
            }
        });
    });
}

/* ---------------- PARTICLES UPDATE ---------------- */

function updateParticles() {
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    });
}

/* ---------------- DRAW ---------------- */

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.draw();
    enemy.draw();

    ctx.fillStyle = "black";
    bullets.forEach(b => ctx.fillRect(b.x, b.y, 6, 6));

    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 40;
        ctx.fillRect(p.x, p.y, 4, 4);
        ctx.globalAlpha = 1;
    });
}

/* ---------------- GAME LOOP ---------------- */

function update() {
    if (gameOver) return;

    controlPlayer();
    enemyAI();
    player.update();
    enemy.update();
    updateBullets();
    updateParticles();

    if (player.health <= 0) {
        overlay.innerText = "YOU LOST";
        overlay.style.display = "block";
        gameOver = true;
    }

    if (enemy.health <= 0) {
        overlay.innerText = "YOU WON";
        overlay.style.display = "block";
        gameOver = true;
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
