// telegram.js - безопасная интеграция для публикации на GitHub

class TelegramMiniApp {
    constructor() {
        this.isTelegram = false;
        this.userData = null;
        this.isInited = false;
        this.tg = null;
        this.backendUrl = null;
        this.loadConfig();
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    loadConfig() {
        if (window?.env?.BACKEND_URL) {
            this.backendUrl = window.env.BACKEND_URL;
            return;
        }

        const metaTag = document.querySelector('meta[name="backend-url"]');
        if (metaTag) {
            this.backendUrl = metaTag.content;
            return;
        }

        const configElement = document.getElementById('app-config');
        if (configElement) {
            try {
                const config = JSON.parse(configElement.textContent);
                this.backendUrl = config.backendUrl;
                return;
            } catch (e) {
                console.warn('⚠️ Failed to parse config element');
            }
        }

        console.warn('⚠️ Backend URL not configured');
    }

    async init() {
        try {
            if (window.Telegram?.WebApp) {
                this.isTelegram = true;
                this.tg = window.Telegram.WebApp;
                this.tg.ready();

                const initDataUnsafe = this.tg.initDataUnsafe || {};
                this.userData = {
                    id: initDataUnsafe?.user?.id,
                    firstName: initDataUnsafe?.user?.first_name,
                    lastName: initDataUnsafe?.user?.last_name,
                    username: initDataUnsafe?.user?.username,
                    teamId: this.getTeamIdFromParams(),
                    isPremium: initDataUnsafe?.user?.is_premium || false,
                    initData: this.tg.initData
                };

                console.log('✅ Telegram user ', this.userData);
                this.setupCloseButton();
                this.setupMainButton();
                this.isInited = true;
                this.onReady();
            } else {
                console.log('🌐 Not running in Telegram Mini App');
                this.loadMockData();
                this.isInited = true;
                this.onReady();
            }
        } catch (error) {
            console.error('❌ Telegram init error:', error);
            this.loadMockData();
            this.isInited = true;
            this.onReady();
        }
    }

    loadMockData() {
        this.userData = {
            id: `web_${Date.now()}`,
            firstName: 'Тест',
            lastName: 'Пользователь',
            username: 'test_user',
            teamId: this.getTeamIdFromParams() || `team_${Math.floor(Math.random() * 1000)}`,
            isWebVersion: true
        };
        console.log('🔧 Loaded mock data:', this.userData);
    }

    getTeamIdFromParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('team') || null;
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

    setupCloseButton() {
        if (this.isTelegram && !document.querySelector('.close-button')) {
            const closeButton = document.createElement('button');
            closeButton.className = 'close-button telegram-close';
            closeButton.innerHTML = '✕';
            closeButton.onclick = () => this.closeApp();
            document.body.appendChild(closeButton);
        }
    }

    setupMainButton() {
        if (this.isTelegram && this.tg.MainButton) {
            this.tg.MainButton.textColor = '#ffffff';
            this.tg.MainButton.color = '#6a11cb';
        }
    }

    closeApp() {
        if (this.isTelegram) {
            this.tg.close();
        } else {
            window.history.back();
        }
    }

    showAlert(message, callback) {
        if (this.isTelegram && this.tg) {
            this.tg.showAlert(message, callback);
        } else {
            alert(message);
            if (callback) setTimeout(callback, 100);
        }
    }

    showConfirm(message, callback) {
        if (this.isTelegram && this.tg) {
            this.tg.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            if (callback) callback(result);
        }
    }

    // Получение задания для локации
    async getMission(location) {
        if (!this.backendUrl) {
            console.warn('⚠️ Backend URL not configured');
            return null;
        }

        try {
            const response = await fetch(`${this.backendUrl}/.netlify/functions/get-mission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData || ''
                },
                body: JSON.stringify({
                    location,
                    userId: this.userData.id,
                    teamId: this.userData.teamId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('❌ Mission fetch failed:', error);
                return null;
            }

            const result = await response.json();
            return result.mission;
        } catch (error) {
            console.error('❌ Failed to get mission:', error);
            return null;
        }
    }

    // Отправка игрового события
    async sendGameEvent(eventType, eventData = {}) {
        if (!this.userData?.initData && !this.isTelegram) {
            console.warn('⚠️ Not in Telegram, skipping event send');
            return false;
        }

        if (!this.backendUrl) {
            console.warn('⚠️ Backend URL not configured');
            return false;
        }

        try {
            const response = await fetch(`${this.backendUrl}/.netlify/functions/game-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData
                },
                body: JSON.stringify({
                    eventType,
                    eventData,
                    userId: this.userData.id,
                    teamId: this.userData.teamId,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                console.error('❌ Event send failed:', response.status);
                return false;
            }

            const result = await response.json();
            console.log('✅ Event sent:', eventType, result);
            return result;
        } catch (error) {
            console.error('❌ Failed to send event:', error);
            return false;
        }
    }

    // Запрос подсказки
    async requestHint(location, hintLevel = 1) {
        if (!this.userData?.initData) {
            this.showAlert('⚠️ Подсказки доступны только в Telegram Mini App');
            return null;
        }

        if (!this.backendUrl) {
            this.showAlert('⚠️ Сервис временно недоступен');
            return null;
        }

        try {
            const response = await fetch(`${this.backendUrl}/.netlify/functions/request-hint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData
                },
                body: JSON.stringify({
                    location,
                    hintLevel,
                    userId: this.userData.id,
                    teamId: this.userData.teamId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                if (error.error === 'no_hints_left') {
                    this.showAlert('🚫 Подсказки закончились!');
                } else if (error.error === 'not_found') {
                    this.showAlert('🤔 Подсказка не найдена.');
                } else {
                    this.showAlert('❌ Ошибка при запросе подсказки');
                }
                return null;
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Failed to request hint:', error);
            this.showAlert('❌ Ошибка при запросе подсказки');
            return null;
        }
    }

    // Проверка пароля локации
    async checkLocationPassword(location, password) {
        if (!this.backendUrl) {
            console.warn('⚠️ Backend URL not configured');
            return { success: false, message: 'Сервис недоступен' };
        }

        try {
            const response = await fetch(`${this.backendUrl}/.netlify/functions/check-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData || ''
                },
                body: JSON.stringify({
                    location,
                    password,
                    userId: this.userData.id,
                    teamId: this.userData.teamId
                })
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Failed to check password:', error);
            return { success: false, message: 'Ошибка при проверке пароля' };
        }
    }

    // Сохранение прогресса
    saveProgress(key, value) {
        localStorage.setItem(`quest_${key}`, value);
    }

    getProgress(key) {
        return localStorage.getItem(`quest_${key}`);
    }

    // Получение всех локаций
    getAllLocations() {
        return [
            { id: 'gates', name: 'Врата Кибердеревни', emoji: '🚪', order: 1 },
            { id: 'dome', name: 'Купол Защиты', emoji: '🛡️', order: 2 },
            { id: 'mirror', name: 'Зеркало Истины', emoji: '🪞', order: 3 },
            { id: 'stone', name: 'Камень Пророчеств', emoji: '🔮', order: 4 },
            { id: 'hut', name: 'Хижина Хранителя', emoji: '🏠', order: 5 },
            { id: 'lair', name: 'Логово Вируса', emoji: '👾', order: 6 }
        ];
    }

    getLocationName(locationId) {
        const location = this.getAllLocations().find(l => l.id === locationId);
        return location ? location.name : locationId;// telegram.js - исправленная версия с правильной передачей initData
class TelegramMiniApp {
    constructor() {
        this.isTelegram = false;
        this.userData = null;
        this.isInited = false;
        this.tg = null;
        this.backendUrl = null;
        this.loadConfig();
        document.addEventListener('DOMContentLoaded', () => this.init());
    }

    loadConfig() {
        if (window?.env?.BACKEND_URL) {
            this.backendUrl = window.env.BACKEND_URL;
            return;
        }

        const metaTag = document.querySelector('meta[name="backend-url"]');
        if (metaTag) {
            this.backendUrl = metaTag.content;
            return;
        }

        const configElement = document.getElementById('app-config');
        if (configElement) {
            try {
                const config = JSON.parse(configElement.textContent);
                this.backendUrl = config.backendUrl;
                return;
            } catch (e) {
                console.warn('⚠️ Failed to parse config element');
            }
        }

        console.warn('⚠️ Backend URL not configured');
    }

    async init() {
        try {
            if (window.Telegram?.WebApp) {
                this.isTelegram = true;
                this.tg = window.Telegram.WebApp;
                this.tg.ready();

                const initDataUnsafe = this.tg.initDataUnsafe || {};
                this.userData = {
                    id: initDataUnsafe?.user?.id,
                    firstName: initDataUnsafe?.user?.first_name,
                    lastName: initDataUnsafe?.user?.last_name,
                    username: initDataUnsafe?.user?.username,
                    teamId: this.getTeamIdFromParams(),
                    isPremium: initDataUnsafe?.user?.is_premium || false,
                    initData: this.tg.initData // КРИТИЧЕСКИ ВАЖНО: сохраняем полный initData
                };

                console.log('✅ Telegram user initialized:', this.userData);
                this.setupCloseButton();
                this.setupMainButton();
                this.isInited = true;
                this.onReady();
            } else {
                console.log('🌐 Not running in Telegram Mini App');
                this.loadMockData();
                this.isInited = true;
                this.onReady();
            }
        } catch (error) {
            console.error('❌ Telegram init error:', error);
            this.loadMockData();
            this.isInited = true;
            this.onReady();
        }
    }

    loadMockData() {
        this.userData = {
            id: `web_${Date.now()}`,
            firstName: 'Тест',
            lastName: 'Пользователь',
            username: 'test_user',
            teamId: this.getTeamIdFromParams() || `team_${Math.floor(Math.random() * 1000)}`,
            isWebVersion: true,
            initData: '' // В веб-версии initData пустой
        };
        console.log('🔧 Loaded mock user data:', this.userData);
    }

    getTeamIdFromParams() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('team') || null;
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

    setupCloseButton() {
        if (this.isTelegram && !document.querySelector('.close-button')) {
            const closeButton = document.createElement('button');
            closeButton.className = 'close-button telegram-close';
            closeButton.innerHTML = '✕';
            closeButton.onclick = () => this.closeApp();
            document.body.appendChild(closeButton);
        }
    }

    setupMainButton() {
        if (this.isTelegram && this.tg.MainButton) {
            this.tg.MainButton.textColor = '#ffffff';
            this.tg.MainButton.color = '#6a11cb';
        }
    }

    closeApp() {
        if (this.isTelegram) {
            this.tg.close();
        } else {
            window.history.back();
        }
    }

    showAlert(message, callback) {
        if (this.isTelegram && this.tg) {
            this.tg.showAlert(message, callback);
        } else {
            alert(message);
            if (callback) setTimeout(callback, 100);
        }
    }

    showConfirm(message, callback) {
        if (this.isTelegram && this.tg) {
            this.tg.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            if (callback) callback(result);
        }
    }

    // Получение задания для локации
    async getMission(location) {
        if (!this.backendUrl) {
            console.warn('⚠️ Backend URL not configured');
            return null;
        }

        // КРИТИЧЕСКИ ВАЖНО: проверяем наличие initData
        if (!this.userData?.initData) {
            console.error('❌ initData is missing! App must be opened via Telegram');
            this.showAlert('Ошибка авторизации. Откройте приложение через Telegram!');
            return null;
        }

        try {
            const response = await fetch(`${this.backendUrl}/get-mission`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData // ПРАВИЛЬНЫЙ ЗАГОЛОВОК
                },
                body: JSON.stringify({
                    location,
                    userId: this.userData.id,
                    teamId: this.userData.teamId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('❌ Mission fetch failed:', error);
                if (error.requiresRegistration) {
                    this.showAlert('Сначала зарегистрируйтесь в боте! Напишите /start');
                }
                return null;
            }

            const result = await response.json();
            return result.mission;
        } catch (error) {
            console.error('❌ Failed to get mission:', error);
            return null;
        }
    }

    // Отправка игрового события
    async sendGameEvent(eventType, eventData = {}) {
        if (!this.userData?.initData && !this.isTelegram) {
            console.warn('⚠️ Not in Telegram, skipping event send');
            return false;
        }

        if (!this.backendUrl) {
            console.warn('⚠️ Backend URL not configured');
            return false;
        }

        // КРИТИЧЕСКИ ВАЖНО: проверяем наличие initData
        if (!this.userData?.initData) {
            console.error('❌ initData is missing!');
            return false;
        }

        try {
            const response = await fetch(`${this.backendUrl}/game-event`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData // ПРАВИЛЬНЫЙ ЗАГОЛОВОК
                },
                body: JSON.stringify({
                    eventType,
                    eventData,
                    userId: this.userData.id,
                    teamId: this.userData.teamId,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                console.error('❌ Event send failed:', response.status);
                return false;
            }

            const result = await response.json();
            console.log('✅ Event sent:', eventType, result);
            return result;
        } catch (error) {
            console.error('❌ Failed to send event:', error);
            return false;
        }
    }

    // Запрос подсказки
    async requestHint(location, hintLevel = 1) {
        if (!this.userData?.initData) {
            this.showAlert('⚠️ Подсказки доступны только в Telegram Mini App');
            return null;
        }

        if (!this.backendUrl) {
            this.showAlert('⚠️ Сервис временно недоступен');
            return null;
        }

        try {
            const response = await fetch(`${this.backendUrl}/request-hint`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData // ПРАВИЛЬНЫЙ ЗАГОЛОВОК
                },
                body: JSON.stringify({
                    location,
                    hintLevel,
                    userId: this.userData.id,
                    teamId: this.userData.teamId
                })
            });

            if (!response.ok) {
                const error = await response.json();
                if (error.error === 'no_hints_left') {
                    this.showAlert('🚫 Подсказки закончились!');
                } else if (error.error === 'not_found') {
                    this.showAlert('🤔 Подсказка не найдена.');
                } else {
                    this.showAlert('❌ Ошибка при запросе подсказки');
                }
                return null;
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('❌ Failed to request hint:', error);
            this.showAlert('❌ Ошибка при запросе подсказки');
            return null;
        }
    }

    // Проверка пароля локации — ИСПРАВЛЕНО: правильная передача initData
    async checkLocationPassword(location, password) {
        if (!this.backendUrl) {
            console.warn('⚠️ Backend URL not configured');
            return { success: false, message: 'Сервис недоступен' };
        }

        // КРИТИЧЕСКИ ВАЖНО: проверяем наличие initData
        if (!this.userData?.initData) {
            console.error('❌ initData is missing! Cannot check password.');
            return { 
                success: false, 
                message: 'Не авторизован. Откройте приложение через Telegram!' 
            };
        }

        try {
            const response = await fetch(`${this.backendUrl}/check-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Telegram-Init-Data': this.userData.initData // ПРАВИЛЬНЫЙ ЗАГОЛОВОК
                },
                body: JSON.stringify({
                    location,
                    password,
                    userId: this.userData.id,
                    teamId: this.userData.teamId
                })
            });

            const result = await response.json();
            
            // Если ошибка авторизации — показываем сообщение
            if (response.status === 401 || response.status === 403) {
                console.error('❌ Authorization failed:', result.message);
                // Не показываем алерт здесь, чтобы не мешать пользователю
            }
            
            return result;
        } catch (error) {
            console.error('❌ Failed to check password:', error);
            return { success: false, message: 'Ошибка при проверке пароля' };
        }
    }

    // Сохранение прогресса
    saveProgress(key, value) {
        localStorage.setItem(`quest_${key}`, value);
    }

    getProgress(key) {
        return localStorage.getItem(`quest_${key}`);
    }

    // Получение всех локаций
    getAllLocations() {
        return [
            { id: 'gates', name: 'Врата Кибердеревни', emoji: '🚪', order: 1 },
            { id: 'dome', name: 'Купол Защиты', emoji: '🛡️', order: 2 },
            { id: 'mirror', name: 'Зеркало Истины', emoji: '🪞', order: 3 },
            { id: 'stone', name: 'Камень Пророчеств', emoji: '🔮', order: 4 },
            { id: 'hut', name: 'Хижина Хранителя', emoji: '🏠', order: 5 },
            { id: 'lair', name: 'Логово Вируса', emoji: '👾', order: 6 }
        ];
    }

    getLocationName(locationId) {
        const location = this.getAllLocations().find(l => l.id === locationId);
        return location ? location.name : locationId;
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
    script.onerror = (e) => {
        console.error('❌ Failed to load Telegram SDK:', e);
    };
    document.head.appendChild(script);
}

console.log('🚀 TelegramMiniApp initialized');
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
    script.onerror = (e) => {
        console.error('❌ Failed to load Telegram SDK:', e);
    };
    document.head.appendChild(script);
}

console.log('🚀 TelegramMiniApp initialized');
