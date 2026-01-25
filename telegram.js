class TelegramMiniApp {
    constructor() {
        this.isTelegram = false;
        this.userData = null;
        this.isInited = false;
        this.tg = null;
        this.backendUrl = 'https://timely-basbousa-f6fdc3.netlify.app';
        this.playerLevel = localStorage.getItem('cybervillage_level') || 'beginner';
        
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    init() {
        try {
            if (window.Telegram?.WebApp) {
                this.isTelegram = true;
                this.tg = window.Telegram.WebApp;
                this.tg.ready();
                this.tg.expand();
                this.tg.disableVerticalSwipes();
                
                const initDataUnsafe = this.tg.initDataUnsafe || {};
                this.userData = {
                    id: initDataUnsafe?.user?.id,
                    firstName: initDataUnsafe?.user?.first_name,
                    lastName: initDataUnsafe?.user?.last_name,
                    username: initDataUnsafe?.user?.username,
                    initData: this.tg.initData
                };
                console.log('📱 Telegram Mini App initialized', this.userData);
            } else {
                this.isTelegram = false;
                this.userData = {
                    id: `web_${Date.now()}`,
                    firstName: 'Кибер',
                    lastName: 'Страж',
                    username: 'web_user',
                    isWebVersion: true
                };
                console.log('🌐 Web version initialized', this.userData);
            }
            
            this.setupUI();
            this.isInited = true;
            this.onReady();
            
        } catch (error) {
            console.error('❌ Initialization error:', error);
            this.isInited = true;
            this.onReady();
        }
    }

    setupUI() {
        this.setupCloseButton();
        
        if (this.isTelegram) {
            const helpButton = document.createElement('button');
            helpButton.className = 'help-button';
            helpButton.innerHTML = '❓';
            helpButton.onclick = () => this.showHelp();
            document.body.appendChild(helpButton);
            
            const style = document.createElement('style');
            style.textContent = `
                .help-button {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 50px;
                    height: 50px;
                    border-radius: 25px;
                    background: #2575fc;
                    color: white;
                    border: none;
                    font-size: 1.5rem;
                    font-weight: bold;
                    z-index: 1000;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                    cursor: pointer;
                }
                .help-button:hover {
                    background: #1a69fc;
                    transform: scale(1.1);
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupCloseButton() {
        if (this.isTelegram && this.tg.BackButton) {
            this.tg.BackButton.show();
            this.tg.BackButton.onClick(() => this.closeApp());
        }
    }

    onReady() {
        document.dispatchEvent(new CustomEvent('telegramReady', { 
            detail: { 
                isTelegram: this.isTelegram,
                userData: this.userData,
                isWebVersion: !this.isTelegram
            }
        }));
    }

    closeApp() {
        if (this.isTelegram) {
            this.tg.close();
        } else {
            window.history.back();
        }
    }

    setPlayerLevel(level) {
        this.playerLevel = level;
        localStorage.setItem('cybervillage_level', level);
    }

    getPlayerLevel() {
        return this.playerLevel;
    }

    async sendMissionStarted(level) {
        if (!this.isTelegram || !this.userData?.initData || !this.backendUrl) return false;
        
        try {
            const response = await fetch(`${this.backendUrl}/api/game-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData
                },
                body: JSON.stringify({
                    eventType: 'mission_started',
                    eventData: {
                        level: level,
                        teamId: `team_${this.userData.id}`
                    }
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Failed to send mission start:', error);
            return false;
        }
    }

    async sendLocationChanged(location) {
        if (!this.isTelegram || !this.userData?.initData || !this.backendUrl) return false;
        
        try {
            await fetch(`${this.backendUrl}/api/game-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData
                },
                body: JSON.stringify({
                    eventType: 'location_changed',
                    eventData: {
                        location: location
                    }
                })
            });
            return true;
        } catch (error) {
            console.error('Location change error:', error);
            return false;
        }
    }

    async sendAmuletCollected(amuletNumber, location) {
        if (!this.isTelegram || !this.userData?.initData || !this.backendUrl) return false;
        
        try {
            await fetch(`${this.backendUrl}/api/game-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData
                },
                body: JSON.stringify({
                    eventType: 'amulet_collected',
                    eventData: {
                        amuletNumber: amuletNumber,
                        location: location
                    }
                })
            });
            return true;
        } catch (error) {
            console.error('Amulet collection error:', error);
            return false;
        }
    }

    async requestHint(location) {
        if (!this.isTelegram || !this.userData?.initData || !this.backendUrl) {
            this.showAlert('Подсказки доступны только в Telegram Mini App. Используйте команду /hint в боте.');
            return null;
        }
        
        try {
            const response = await fetch(`${this.backendUrl}/api/request-hint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData
                },
                body: JSON.stringify({
                    location: location,
                    level: this.playerLevel,
                    hintLevel: 1
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.hint;
            } else {
                const error = await response.json();
                this.showAlert(`❌ ${error.error || 'Ошибка при запросе подсказки'}`);
                return null;
            }
        } catch (error) {
            console.error('Hint request error:', error);
            this.showAlert('❌ Не удалось получить подсказку. Попробуйте команду /hint в Telegram.');
            return null;
        }
    }

    showAlert(message, callback = null) {
        if (this.isTelegram) {
            this.tg.showAlert(message, callback);
        } else {
            alert(message);
            if (callback) setTimeout(callback, 100);
        }
    }

    showHelp() {
        this.showAlert(`
🎮 <b>ПОМОЩЬ</b>

📝 <b>Как играть:</b>
• Выберите уровень сложности
• Пройдите все 6 локаций
• Соберите все амулеты
• Активируйте Иммунный Щит

💡 <b>Подсказки:</b>
• Нажмите кнопку "Получить подсказку" на любой локации
• Или используйте команду /hint в Telegram
• Максимум 3 подсказки за миссию


❓ <b>Дополнительно:</b>
• Команда /stats - статистика игры
• Команда /start - перезапустить миссию
        `.trim(), null);
    }
}

const tgApp = window.tgApp || new TelegramMiniApp();
window.tgApp = tgApp;

if (!window.Telegram) {
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
        console.log('✅ Telegram Web Apps SDK loaded');
        if (!tgApp.isInited) tgApp.init();
    };
    document.head.appendChild(script);
}
