// telegram.js - безопасная интеграция с Telegram Mini Apps
class TelegramMiniApp {
    constructor() {
        this.isTelegram = false;
        this.userData = null;
        this.isInited = false;
        this.tg = null;
        this.backendUrl = 'https://timely-basbousa-f6fdc3.netlify.app/'; // ЗАМЕНИТЬ НА ВАШ NETLIFY URL
        
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
                    teamId: this.getTeamIdFromParams(),
                    level: this.getSavedLevel(),
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
                    teamId: this.getTeamIdFromParams() || `team_${Math.floor(Math.random() * 1000)}`,
                    level: this.getSavedLevel() || 'beginner',
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
    }

    setupCloseButton() {
        if (this.isTelegram && this.tg.BackButton) {
            this.tg.BackButton.show();
            this.tg.BackButton.onClick(() => this.closeApp());
        }
    }

    closeApp() {
        if (this.isTelegram) {
            this.tg.close();
        } else {
            window.history.back();
        }
    }

    getTeamIdFromParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('team') || null;
    }

    getSavedLevel() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('level') || localStorage.getItem('cybervillage_level') || 'beginner';
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

    async sendMissionStarted() {
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
                        level: this.userData.level,
                        teamId: this.userData.teamId
                    }
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Failed to send mission start:', error);
            return false;
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

    isAdmin() {
        // В реальном приложении здесь будет проверка через бэкенд
        // Для демо - проверяем по username или localStorage
        return this.userData?.username === 'your_admin_username' || 
               localStorage.getItem('is_admin') === 'true';
    }
}

// Глобальный экземпляр
const tgApp = window.tgApp || new TelegramMiniApp();
window.tgApp = tgApp;

// Загрузка Telegram Web Apps SDK если отсутствует
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
