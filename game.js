// game.js - логика игровых событий

class GameEngine {
    constructor() {
        this.currentLocation = null;
        this.completedLocations = new Set();
        this.hintsUsed = 0;
        this.maxHints = 3;
        this.loadProgress();
    }

    loadProgress() {
        const completed = tgApp.getProgress('completedLocations');
        if (completed) {
            try {
                this.completedLocations = new Set(JSON.parse(completed));
            } catch (e) {
                console.error('Failed to parse completed locations:', e);
            }
        }

        const hints = tgApp.getProgress('hintsUsed');
        if (hints) {
            this.hintsUsed = parseInt(hints);
        }
    }

    saveProgress() {
        tgApp.saveProgress('completedLocations', JSON.stringify([...this.completedLocations]));
        tgApp.saveProgress('hintsUsed', this.hintsUsed.toString());
    }

    markLocationCompleted(locationId) {
        this.completedLocations.add(locationId);
        this.saveProgress();
    }

    canAccessLocation(locationId) {
        const locations = tgApp.getAllLocations();
        const currentLocation = locations.find(l => l.id === locationId);
        
        if (!currentLocation) return false;
        
        // Проверяем, что предыдущие локации пройдены
        const previousLocations = locations.filter(l => l.order < currentLocation.order);
        return previousLocations.every(l => this.completedLocations.has(l.id));
    }

    useHint() {
        if (this.hintsUsed >= this.maxHints) {
            return false;
        }
        this.hintsUsed++;
        this.saveProgress();
        return true;
    }

    getHintsLeft() {
        return this.maxHints - this.hintsUsed;
    }

    resetProgress() {
        this.completedLocations.clear();
        this.hintsUsed = 0;
        this.saveProgress();
    }

    isQuestComplete() {
        const totalLocations = tgApp.getAllLocations().length;
        return this.completedLocations.size >= totalLocations;
    }
}

const gameEngine = window.gameEngine || new GameEngine();
window.gameEngine = gameEngine;