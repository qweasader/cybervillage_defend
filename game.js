// game.js - логика игровых событий и триггеров
class GameEngine {
    constructor() {
        this.triggers = [];
        this.activeTriggers = new Map();
    }

    async loadTriggers() {
        if (!tgApp.backendUrl) return;
        
        try {
            const response = await fetch(`${tgApp.backendUrl}/api/triggers`);
            if (response.ok) {
                this.triggers = await response.json();
                console.log('🎯 Triggers loaded:', this.triggers.length);
                this.activateTriggers();
            }
        } catch (error) {
            console.error('Triggers load error:', error);
        }
    }

    activateTriggers() {
        this.triggers.forEach(trigger => {
            if (this.shouldActivateTrigger(trigger)) {
                this.activateTrigger(trigger);
            }
        });
    }

    shouldActivateTrigger(trigger) {
        const now = new Date();
        
        switch (trigger.type) {
            case 'time':
                const triggerTime = new Date(trigger.time);
                return now >= triggerTime && !this.activeTriggers.has(trigger.id);
            default:
                return false;
        }
    }

    activateTrigger(trigger) {
        this.activeTriggers.set(trigger.id, Date.now());
        
        if (trigger.showMessage && trigger.message) {
            tgApp.showAlert(trigger.message);
        }
        
        console.log(`🔥 Trigger activated: ${trigger.id} (${trigger.type})`);
    }
}

const gameEngine = window.gameEngine || new GameEngine();
window.gameEngine = gameEngine;

document.addEventListener('telegramReady', () => {
    gameEngine.loadTriggers();
});