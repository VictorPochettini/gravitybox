// Constants
const lambda = 0.1;
const PARTICLE_TYPES = {
    POWDER: { id: 'powder', color: '#d4d480', mass: 0.5 * lambda },
    WATER: { id: 'water', color: '#0000ff', mass: 0.2 * lambda },
    OXYGEN: { id: 'oxygen', color: '#6666ff', mass: 0.16 * lambda },
    HYDROGEN: { id: 'hydrogen', color: '#aaaaff', mass: 0.02 * lambda },
};

const PARTICLE_SIZE = 3;
const BOUNCE_FACTOR = 0.5;
const DAMPING_FACTOR = 0.995;
const G = 0.1; // Gravitational constant
const MIN_DISTANCE = PARTICLE_SIZE * 1.5;
const REPULSION_STRENGTH = 0.05;
const counter = document.getElementById('counter');

// Canvas Manager Class
class CanvasManager {
    constructor() {
        this.canvas = document.getElementById('myCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.rect = this.canvas.getBoundingClientRect();
        this.mouse = { x: 0, y: 0, isDown: false };
        this.animationId = null;
        this.currentParticleType = PARTICLE_TYPES.POWDER;
        this.particles = [];
        this.brushSize = 1;
        this.setupEventListeners();
        this.setupBrushSize();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', () => this.startDrawing());
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseleave', () => this.stopDrawing());
        document.addEventListener('mousemove', (event) => this.updateMousePosition(event));
    }

    setupBrushSize() {
        const slider = document.getElementById('brushSize');
        slider.addEventListener('input', (event) => {
            this.brushSize = parseInt(event.target.value);
        });
    }

    updateMousePosition(event) {
        this.mouse.x = event.clientX - this.rect.left;
        this.mouse.y = event.clientY - this.rect.top;
    }

    startDrawing() {
        this.mouse.isDown = true;
        this.draw();
    }

    stopDrawing() {
        this.mouse.isDown = false;
    }

    draw() {
        if (this.mouse.isDown) {
            // Create multiple particles based on brush size
            for (let i = 0; i < this.brushSize; i++) {
                const spread = this.brushSize;
                const randomX = this.mouse.x + (Math.random() - 0.5) * spread;
                const randomY = this.mouse.y + (Math.random() - 0.5) * spread;
                
                const particle = new Particle(
                    randomX,
                    randomY,
                    0,
                    0,
                    this.currentParticleType.color,
                    this.currentParticleType.mass
                );
                this.particles.push(particle);
            }
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach(p => {
            this.particles.forEach(other => {
                if (p === other) return;

                const dx = other.x - p.x;
                const dy = other.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < MIN_DISTANCE && distance > 0) {
                    // Remove bounce: only do gentle position separation and remove normal relative velocity.
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const overlap = (MIN_DISTANCE - distance);

                    // Separate positions so particles are no longer overlapping
                    const separation = overlap * 0.5;
                    p.x -= nx * separation;
                    p.y -= ny * separation;
                    other.x += nx * separation;
                    other.y += ny * separation;

                    // Remove relative velocity along the collision normal to avoid bounce,
                    // keep tangential velocity (particles will not be given an outward kick).
                    const relNormalVel = (p.vx - other.vx) * nx + (p.vy - other.vy) * ny;
                    if (relNormalVel < 0) {
                        // subtract half the normal component from each to zero it out gently
                        const correction = relNormalVel * 0.5;
                        p.vx -= nx * correction;
                        p.vy -= ny * correction;
                        other.vx += nx * correction;
                        other.vy += ny * correction;
                    }
                } else {
                    // Gravitational attraction
                    const force = this.calculateForce(p, other);
                    p.vx += force.fx / p.mass;
                    p.vy += force.fy / p.mass;
                }
            });

            // Update position
            p.x += p.vx;
            p.y += p.vy;
            
            // Apply damping
            p.vx *= DAMPING_FACTOR;
            p.vy *= DAMPING_FACTOR;

            // Wall collisions
            if (p.x < PARTICLE_SIZE) {
                p.x = PARTICLE_SIZE;
                p.vx = Math.abs(p.vx) * BOUNCE_FACTOR;
            }
            if (p.x > this.canvas.width - PARTICLE_SIZE) {
                p.x = this.canvas.width - PARTICLE_SIZE;
                p.vx = -Math.abs(p.vx) * BOUNCE_FACTOR;
            }
            if (p.y < PARTICLE_SIZE) {
                p.y = PARTICLE_SIZE;
                p.vy = Math.abs(p.vy) * BOUNCE_FACTOR;
            }
            if (p.y > this.canvas.height - PARTICLE_SIZE) {
                p.y = this.canvas.height - PARTICLE_SIZE;
                p.vy = -Math.abs(p.vy) * BOUNCE_FACTOR;
            }

            // Draw particle
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, PARTICLE_SIZE, PARTICLE_SIZE);
        });
        
        this.animationId = requestAnimationFrame(() => this.draw());
    }

    setParticleType(type) {
        this.currentParticleType = type;
    }

    calculateDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }

    calculateForce(p1, p2) {
        const distance = this.calculateDistance(p1.x, p1.y, p2.x, p2.y);
        if (distance === 0 || distance < 6) return { fx: 0, fy: 0 }; // Avoid division by zero
        const force = (G * p1.mass * p2.mass) / (distance ** 2);
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        return { fx: force * Math.cos(angle), fy: force * Math.sin(angle) };
    }
}

// Element Button Manager Class
class ElementButtonManager {
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
        this.container = document.querySelector('.grid-container');
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.container.addEventListener('click', (event) => this.handleClick(event));
    }

    handleClick(event) {
        const button = event.target.closest('.box');
        if (!button) return;

        const elementId = button.id;
        switch (elementId) {
            case PARTICLE_TYPES.POWDER.id:
                this.canvasManager.setParticleType(PARTICLE_TYPES.POWDER);
                break;
            case PARTICLE_TYPES.WATER.id:
                this.canvasManager.setParticleType(PARTICLE_TYPES.WATER);
                break;
            case PARTICLE_TYPES.OXYGEN.id:
                this.canvasManager.setParticleType(PARTICLE_TYPES.OXYGEN);
                break;
            case PARTICLE_TYPES.HYDROGEN.id:
                this.canvasManager.setParticleType(PARTICLE_TYPES.HYDROGEN);
                break;
            default:
                console.log('Unknown element clicked');
        }
    }
}

// Particle Class
class Particle {
    constructor(x, y, vx = 0, vy = 0, color = 'white', mass = 1) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.mass = mass;
        counter.textContent = parseInt(counter.textContent) + 1;
    }
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    const canvasManager = new CanvasManager();
    const elementButtons = new ElementButtonManager(canvasManager);
});