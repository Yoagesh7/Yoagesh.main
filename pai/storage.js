/**
 * PushAI v2 — Storage Manager
 * All localStorage persistence for tasks, user, streak, messages, settings
 */

const STORAGE_KEYS = {
    USER: 'pai_user',
    TASKS: 'pai_tasks',
    STREAK: 'pai_streak',
    MESSAGES: 'pai_messages',
    THEME: 'pai_theme',
    PERSONALITY: 'pai_personality',
    AUTH: 'pai_auth',
    ONBOARDED: 'pai_onboarded'
};

const Storage = {
    // ── Generic ──
    _get(key, fallback = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
    },
    _set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    // ── Auth ──
    getAuth() { return this._get(STORAGE_KEYS.AUTH, null); },
    setAuth(auth) { this._set(STORAGE_KEYS.AUTH, auth); },
    clearAuth() { localStorage.removeItem(STORAGE_KEYS.AUTH); },
    isLoggedIn() { return !!this.getAuth(); },

    // ── Onboarding ──
    isOnboarded() { return this._get(STORAGE_KEYS.ONBOARDED, false); },
    setOnboarded(val) { this._set(STORAGE_KEYS.ONBOARDED, val); },

    // ── User Profile ──
    getUser() { return this._get(STORAGE_KEYS.USER, {}); },
    setUser(user) { this._set(STORAGE_KEYS.USER, user); },

    // ── Tasks ──
    getTasks() { return this._get(STORAGE_KEYS.TASKS, []); },
    setTasks(tasks) { this._set(STORAGE_KEYS.TASKS, tasks); },
    addTask(title, description = '', scheduledTime = '') {
        const tasks = this.getTasks();
        const task = {
            id: Date.now(),
            title,
            description,
            scheduledTime: scheduledTime || new Date().toISOString().slice(0, 10),
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        tasks.push(task);
        this.setTasks(tasks);
        return task;
    },
    updateTaskStatus(taskId, status) {
        const tasks = this.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.status = status;
            this.setTasks(tasks);
            if (status === 'done') this.incrementStreak();
        }
        return task;
    },
    deleteTask(taskId) {
        const tasks = this.getTasks().filter(t => t.id !== taskId);
        this.setTasks(tasks);
    },

    // ── Streak ──
    getStreak() { return this._get(STORAGE_KEYS.STREAK, 0); },
    setStreak(n) { this._set(STORAGE_KEYS.STREAK, n); },
    incrementStreak() { this.setStreak(this.getStreak() + 1); },

    // ── Messages ──
    getMessages() { return this._get(STORAGE_KEYS.MESSAGES, []); },
    setMessages(msgs) { this._set(STORAGE_KEYS.MESSAGES, msgs); },
    addMessage(type, text) {
        const msgs = this.getMessages();
        msgs.push({ type, text, time: new Date().toISOString() });
        this.setMessages(msgs);
    },
    clearMessages() { this._set(STORAGE_KEYS.MESSAGES, []); },

    // ── Theme ──
    getTheme() { return this._get(STORAGE_KEYS.THEME, 'dark'); },
    setTheme(theme) { this._set(STORAGE_KEYS.THEME, theme); },

    // ── Personality ──
    getPersonality() { return this._get(STORAGE_KEYS.PERSONALITY, 'friendly'); },
    setPersonality(mode) { this._set(STORAGE_KEYS.PERSONALITY, mode); },

    // ── Full Reset ──
    clearAll() {
        Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    }
};
