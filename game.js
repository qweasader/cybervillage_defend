// game.js - управление прогрессом игры и навигацией
class GameEngine {
    constructor() {
        this.currentLocation = localStorage.getItem('current_location') || 'start';
        this.collectedAmulets = JSON.parse(localStorage.getItem('collected_amulets')) || [];
        this.gameStarted = localStorage.getItem('game_started') === 'true';
    }

    // Установка текущей локации
    setLocation(location) {
        this.currentLocation = location;
        localStorage.setItem('current_location', location);
        console.log(`📍 Location changed to: ${location}`);
        
        // Отправка события в бэкенд
        if (tgApp.isTelegram && tgApp.userData?.initData) {
            tgApp.sendLocationChanged(location);
        }
    }

    // Добавление амулета
    addAmulet(location) {
        if (!this.collectedAmulets.includes(location)) {
            this.collectedAmulets.push(location);
            localStorage.setItem('collected_amulets', JSON.stringify(this.collectedAmulets));
            console.log(`✨ Amulet collected at: ${location}`);
            
            // Отправка события в бэкенд
            if (tgApp.isTelegram && tgApp.userData?.initData) {
                const amuletNumber = this.collectedAmulets.length;
                tgApp.sendAmuletCollected(amuletNumber, location);
            }
        }
    }

    // Проверка, все ли амулеты собраны
    allAmuletsCollected() {
        return this.collectedAmulets.length >= 6;
    }

    // Начало новой миссии
    startNewMission(level) {
        this.collectedAmulets = [];
        this.currentLocation = 'start';
        this.gameStarted = true;
        
        localStorage.setItem('collected_amulets', JSON.stringify([]));
        localStorage.setItem('current_location', 'start');
        localStorage.setItem('game_started', 'true');
        localStorage.setItem('cybervillage_level', level);
        
        console.log('🚀 New mission started');
        
        // Отправка события в бэкенд
        if (tgApp.isTelegram && tgApp.userData?.initData) {
            tgApp.sendMissionStarted(level);
        }
    }

    // Завершение миссии
    completeMission() {
        console.log('🎉 Mission completed!');
        
        if (tgApp.isTelegram && tgApp.userData?.initData) {
            fetch(`${tgApp.backendUrl}/api/game-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': tgApp.userData.initData
                },
                body: JSON.stringify({
                    eventType: 'mission_completed',
                    eventData: {
                        amulets: this.collectedAmulets.length,
                        level: tgApp.getPlayerLevel(),
                        locations: this.collectedAmulets
                    }
                })
            }).catch(error => console.error('Mission completed error:', error));
        }
    }

    // Получение следующей локации
    getNextLocation(currentLocation) {
        const locationOrder = [
            'forest', 'bridge', 'lake', 
            'phishing', 'storage', 'firewall'
        ];
        
        const currentIndex = locationOrder.indexOf(currentLocation);
        if (currentIndex >= 0 && currentIndex < locationOrder.length - 1) {
            return locationOrder[currentIndex + 1];
        }
        return 'firewall';
    }

    // Проверка, можно ли перейти к локации
    canAccessLocation(location) {
        if (!this.gameStarted) return false;
        
        const locationOrder = [
            'forest', 'bridge', 'lake', 
            'phishing', 'storage', 'firewall'
        ];
        
        const currentIndex = locationOrder.indexOf(location);
        const collectedCount = this.collectedAmulets.length;
        
        return currentIndex <= collectedCount;
    }
}

// Глобальный экземпляр
const gameEngine = window.gameEngine || new GameEngine();
window.gameEngine = gameEngine;

// Автоматическая инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Game engine initialized');
    console.log('Current location:', gameEngine.currentLocation);
    console.log('Collected amulets:', gameEngine.collectedAmulets);
    console.log('Game started:', gameEngine.gameStarted);
});
