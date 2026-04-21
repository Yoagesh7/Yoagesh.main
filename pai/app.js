/**
 * PushAI v2 — Main Application Controller
 * Routing, HITL, Chat, Tasks, Navigation, Rendering
 */

// ── App Init ──────────────────────────────────────────
function init() {
    applyTheme(Storage.getTheme());
    route();
}

// ── Router ────────────────────────────────────────────
function route() {
    hideAllScreens();

    if (!Storage.isLoggedIn()) {
        showScreen('screen-login');
        bindLogin();
        return;
    }

    if (!Storage.isOnboarded()) {
        showScreen('screen-onboard-1');
        bindOnboarding();
        return;
    }

    // Logged in & onboarded → Main App
    showScreen('app-shell');
    bindMainApp();
    renderAll();
}

function hideAllScreens() {
    document.querySelectorAll('.screen-login, .screen-onboard-1, .screen-onboard-2, .app-shell')
        .forEach(s => s.classList.remove('active'));
}

function showScreen(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

// ══════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════
let loginBound = false;
function bindLogin() {
    if (loginBound) return;
    loginBound = true;

    const emailEl = document.getElementById('login-email');
    const passEl = document.getElementById('login-password');
    const errEl = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('goto-signup-btn');

    let isSignupMode = false;

    loginBtn.onclick = () => {
        const email = emailEl.value.trim();
        const password = passEl.value;
        errEl.textContent = '';

        if (!email || !email.includes('@')) {
            errEl.textContent = 'Please enter a valid email.';
            emailEl.focus();
            return;
        }
        if (password.length < 6) {
            errEl.textContent = 'Password must be at least 6 characters.';
            passEl.focus();
            return;
        }

        if (isSignupMode) {
            // Register
            const existing = Storage.getAuth();
            if (existing && existing.email === email) {
                errEl.textContent = 'Account already exists. Please sign in.';
                return;
            }
            Storage.setAuth({ email, password: btoa(password), createdAt: new Date().toISOString() });
            route();
        } else {
            // Login
            const auth = Storage.getAuth();
            if (!auth) {
                errEl.textContent = 'No account found. Please create one first.';
                return;
            }
            if (auth.email !== email || atob(auth.password) !== password) {
                errEl.textContent = 'Invalid email or password.';
                return;
            }
            route();
        }
    };

    signupBtn.onclick = () => {
        isSignupMode = !isSignupMode;
        loginBtn.textContent = isSignupMode ? 'Create Account' : 'Sign In';
        signupBtn.textContent = isSignupMode ? 'Already have an account? Sign In' : 'Create Account';
    };

    // Enter key support
    passEl.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
    emailEl.addEventListener('keydown', e => { if (e.key === 'Enter') passEl.focus(); });
}

// ══════════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════════
let onboardBound = false;
function bindOnboarding() {
    if (onboardBound) return;
    onboardBound = true;

    // Step 1 → Step 2
    document.getElementById('ob-next-btn').onclick = () => {
        const name = document.getElementById('ob-name').value.trim();
        const interests = document.getElementById('ob-interests').value.trim();
        const hobby = document.getElementById('ob-hobby').value.trim();
        const dream = document.getElementById('ob-dream').value.trim();
        const errEl = document.getElementById('ob1-error');

        errEl.textContent = '';

        if (!name) { errEl.textContent = 'Please enter your name.'; return; }
        if (!interests) { errEl.textContent = 'Please enter your interests.'; return; }
        if (!hobby) { errEl.textContent = 'Please enter a hobby.'; return; }
        if (!dream) { errEl.textContent = 'Please enter your dream.'; return; }

        // Store partial profile
        const user = Storage.getUser();
        Storage.setUser({ ...user, name, interests, hobby, dream });

        hideAllScreens();
        showScreen('screen-onboard-2');
    };

    // Step 2 → Finish
    document.getElementById('ob-finish-btn').onclick = () => {
        const age = document.getElementById('ob-age').value.trim();
        const workTime = document.getElementById('ob-work-time').value.trim();
        const freeTime = document.getElementById('ob-free-time').value.trim();
        const errEl = document.getElementById('ob2-error');

        errEl.textContent = '';

        if (!age) { errEl.textContent = 'Please enter your age.'; return; }
        if (!workTime) { errEl.textContent = 'Please enter your work time.'; return; }
        if (!freeTime) { errEl.textContent = 'Please enter your free time.'; return; }

        // Complete profile
        const user = Storage.getUser();
        Storage.setUser({ ...user, age, workTime, freeTime });
        Storage.setOnboarded(true);

        // Add some starter tasks based on user info
        if (Storage.getTasks().length === 0) {
            Storage.addTask(`Set up workspace for ${user.interests?.split(',')[0]?.trim() || 'productivity'}`, 'Organize your tools and environment.');
            Storage.addTask('Review your weekly goals', 'Align tasks with your dream.');
            Storage.addTask('Plan your first deep work session', `Use your work time: ${workTime}`);
        }

        route();
    };

    // Back button
    document.getElementById('ob-back-btn').onclick = () => {
        hideAllScreens();
        showScreen('screen-onboard-1');
    };
}

// ══════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════
let mainBound = false;
function bindMainApp() {
    if (mainBound) return;
    mainBound = true;

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.onclick = () => switchView(b.dataset.view);
    });

    // FAB
    const fab = document.getElementById('open-chat');
    if (fab) fab.onclick = () => switchView('explore');

    // Chat
    document.getElementById('chat-send').onclick = () => chat();
    document.getElementById('chat-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); chat(); }
    });

    // Quick tags
    document.querySelectorAll('.quick-tag').forEach(tag => {
        tag.onclick = () => {
            const input = document.getElementById('chat-input');
            input.value = tag.dataset.prompt;
            input.focus();
        };
    });

    // Clear chat
    document.getElementById('clear-chat-btn').onclick = () => {
        Storage.clearMessages();
        const log = document.getElementById('chat-log');
        log.innerHTML = `
            <div class="msg-wrap-ai">
                <div class="msg-ai">Chat cleared. I'm ready when you are! What's on your mind?</div>
                <div class="msg-time">AI MENTOR • NOW</div>
            </div>`;
    };

    // Hero button
    document.getElementById('hero-btn').onclick = () => {
        const tasks = Storage.getTasks();
        const pending = tasks.find(t => t.status !== 'done');
        if (pending) {
            Storage.updateTaskStatus(pending.id, 'done');
            renderAll();
        }
    };

    // Add Task
    document.getElementById('add-task-btn').onclick = addNewTask;
    document.getElementById('new-task-title').addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); addNewTask(); }
    });

    // Theme toggle
    document.getElementById('theme-toggle-btn').onclick = toggleTheme;

    // Logout
    document.getElementById('logout-btn').onclick = () => {
        Storage.clearAll();
        loginBound = false;
        onboardBound = false;
        mainBound = false;
        route();
    };

    // Personality selector
    document.querySelectorAll('.personality-pill').forEach(pill => {
        pill.onclick = () => {
            const mode = pill.dataset.mode;
            Storage.setPersonality(mode);
            updatePersonalityUI(mode);
        };
    });

    // Set initial personality UI
    updatePersonalityUI(Storage.getPersonality());

    // Update welcome message in chat based on personality
    updateChatWelcome();
}

function addNewTask() {
    const titleEl = document.getElementById('new-task-title');
    const dateEl = document.getElementById('new-task-date');
    const descEl = document.getElementById('new-task-desc');

    const title = titleEl.value.trim();
    if (!title) { titleEl.focus(); return; }

    Storage.addTask(title, descEl.value.trim(), dateEl.value);

    titleEl.value = '';
    dateEl.value = '';
    descEl.value = '';
    renderAll();
}

// ── Navigation ────────────────────────────────────────
function switchView(id) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${id}-view`)?.classList.add('active');
    document.querySelector(`[data-view="${id}"]`)?.classList.add('active');

    const fab = document.getElementById('open-chat');
    if (fab) {
        if (id === 'explore') fab.classList.add('hidden');
        else fab.classList.remove('hidden');
    }
}

// ── Theme ─────────────────────────────────────────────
function applyTheme(theme) {
    const isLight = theme === 'light';
    document.body.classList.toggle('light-theme', isLight);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = isLight ? 'Use Dark' : 'Use Light';
    Storage.setTheme(isLight ? 'light' : 'dark');
}

function toggleTheme() {
    const next = document.body.classList.contains('light-theme') ? 'dark' : 'light';
    applyTheme(next);
}

// ── Personality UI ────────────────────────────────────
function updatePersonalityUI(mode) {
    document.querySelectorAll('.personality-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.mode === mode);
    });

    const label = document.getElementById('chat-personality-label');
    if (label) {
        const labels = { strict: 'STRICT MODE', friendly: 'FRIENDLY MODE', coach: 'COACH MODE' };
        label.textContent = labels[mode] || 'FRIENDLY MODE';
    }
}

function updateChatWelcome() {
    const user = Storage.getUser();
    const personality = Storage.getPersonality();
    const el = document.getElementById('chat-welcome-msg');
    if (!el) return;

    const name = user.name || 'there';
    const welcomes = {
        strict: `${name}. Let's cut the small talk. What needs to get done? I'm holding you accountable.`,
        friendly: `Hey ${name}! 😊 I'm so excited to help you today! What's on your mind? Let's make today amazing! ✨`,
        coach: `Welcome, ${name}. Before we dive in — what's the ONE thing that would make today a success? 🎯`
    };

    el.textContent = welcomes[personality] || welcomes.friendly;
}

// ══════════════════════════════════════════════════════════
// RENDERING
// ══════════════════════════════════════════════════════════
function renderAll() {
    renderHome();
    renderTasks();
    renderProfile();
}

function renderHome() {
    const user = Storage.getUser();
    const tasks = Storage.getTasks();
    const pending = tasks.filter(t => t.status !== 'done');
    const streak = Storage.getStreak();

    // Greeting
    const greetEl = document.getElementById('main-greeting');
    if (greetEl) greetEl.innerHTML = getDynamicGreeting();

    // Streak
    document.getElementById('streak-num').textContent = streak;
    document.getElementById('streak-ring').textContent = streak;

    const subtitleEl = document.getElementById('streak-subtitle');
    if (subtitleEl) {
        if (streak >= 10) subtitleEl.textContent = "🔥 Unstoppable! You're on fire!";
        else if (streak >= 5) subtitleEl.textContent = "💪 Great momentum! Keep pushing!";
        else if (streak >= 1) subtitleEl.textContent = "🌱 Building your streak. Keep going!";
        else subtitleEl.textContent = "Complete tasks to build your streak";
    }

    // Hero card
    const hero = getDynamicHeroMessage();
    document.getElementById('hero-tag').textContent = hero.tag;
    document.getElementById('hero-title').textContent = hero.title;
    document.getElementById('hero-sub').textContent = hero.sub;

    // Home task pills (pending only)
    const homeEl = document.getElementById('home-tasks');
    homeEl.innerHTML = '';
    pending.slice(0, 5).forEach((t, i) => {
        const pill = createTaskPill(t);
        pill.style.animationDelay = `${i * 0.08}s`;
        homeEl.appendChild(pill);
    });
}

function renderTasks() {
    const tasks = Storage.getTasks();
    const pending = tasks.filter(t => t.status !== 'done');
    const done = tasks.filter(t => t.status === 'done');

    const tPend = document.getElementById('tasks-pending-count');
    const tDone = document.getElementById('tasks-done-count');
    if (tPend) tPend.textContent = pending.length;
    if (tDone) tDone.textContent = done.length;

    const allEl = document.getElementById('all-tasks');
    allEl.innerHTML = '';
    // Pending first, then done
    [...pending, ...done].forEach((t, i) => {
        const pill = createTaskPill(t, true);
        pill.style.animationDelay = `${i * 0.05}s`;
        allEl.appendChild(pill);
    });
}

function renderProfile() {
    const user = Storage.getUser();
    const grid = document.getElementById('profile-info-grid');
    if (!grid) return;

    const fields = [
        { label: 'Name', value: user.name },
        { label: 'Age', value: user.age },
        { label: 'Interests', value: user.interests },
        { label: 'Hobby', value: user.hobby },
        { label: 'Dream', value: user.dream },
        { label: 'Work Time', value: user.workTime },
        { label: 'Free Time', value: user.freeTime },
        { label: 'Streak', value: `🔥 ${Storage.getStreak()} tasks` }
    ];

    grid.innerHTML = fields.map(f => `
        <div class="profile-info-item">
            <div class="profile-info-label">${f.label}</div>
            <div class="profile-info-value">${f.value || '—'}</div>
        </div>
    `).join('');
}

function createTaskPill(t, showDelete = false) {
    const d = document.createElement('div');
    d.className = `task-pill ${t.status === 'done' ? 'done' : ''}`;
    d.innerHTML = `
        <div class="pill-check">${t.status === 'done' ? '✓' : ''}</div>
        <div style="flex:1">
            <div class="pill-text">${escapeHtml(t.title)}</div>
            <div class="pill-meta">${t.status === 'done' ? 'Completed ✓' : (t.description || t.scheduledTime || 'Pending')}</div>
        </div>
        ${showDelete ? '<button class="pill-delete" title="Delete">✕</button>' : ''}
    `;

    if (t.status !== 'done') {
        d.querySelector('.pill-check').onclick = (e) => {
            e.stopPropagation();
            Storage.updateTaskStatus(t.id, 'done');
            renderAll();
        };
    }

    if (showDelete) {
        const delBtn = d.querySelector('.pill-delete');
        if (delBtn) {
            delBtn.onclick = (e) => {
                e.stopPropagation();
                Storage.deleteTask(t.id);
                renderAll();
            };
        }
    }

    return d;
}

// ══════════════════════════════════════════════════════════
// CHAT + HITL
// ══════════════════════════════════════════════════════════
let isChatting = false;

async function chat() {
    if (isChatting) return;

    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    isChatting = true;

    // Add user message
    addBubble('user', text);
    Storage.addMessage('user', text);

    // Show typing
    showTyping(true);

    // Get AI response
    const history = Storage.getMessages();
    const result = await sendToAI(text, history);

    showTyping(false);
    isChatting = false;

    // Show main reply
    addBubble('ai', result.cleanReply);
    Storage.addMessage('ai', result.cleanReply);

    // HITL: Show approval card for suggested tasks
    if (result.tasks.length > 0) {
        renderHITLCard(result.tasks, 'tasks');
    }

    // HITL: Show approval for memory updates
    if (result.memories.length > 0) {
        renderHITLCard(result.memories, 'memory');
    }
}

function addBubble(type, text) {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const log = document.getElementById('chat-log');

    if (type === 'user') {
        const wrap = document.createElement('div');
        wrap.className = 'msg-wrap-user';
        wrap.innerHTML = `
            <div class="msg-user">${escapeHtml(text)}</div>
            <div class="msg-time">YOU • ${now}</div>
        `;
        log.appendChild(wrap);
    } else {
        const wrap = document.createElement('div');
        wrap.className = 'msg-wrap-ai';
        const bubble = document.createElement('div');
        bubble.className = 'msg-ai';
        typewriter(bubble, text, 8);
        wrap.appendChild(bubble);

        const time = document.createElement('div');
        time.className = 'msg-time';
        time.textContent = `AI MENTOR • ${now}`;
        wrap.appendChild(time);
        log.appendChild(wrap);
    }

    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
}

// ── HITL Cards ────────────────────────────────────────
function renderHITLCard(items, type) {
    const log = document.getElementById('chat-log');
    const card = document.createElement('div');
    card.className = 'hitl-card';

    const isTask = type === 'tasks';
    const title = isTask
        ? 'AI wants to add these tasks. Approve?'
        : 'AI wants to remember this about you. Approve?';

    card.innerHTML = `
        <div class="hitl-badge">HUMAN IN THE LOOP</div>
        <div class="hitl-title">${title}</div>
        <div class="hitl-tasks">
            ${items.map(item => `
                <div class="hitl-task-row">
                    <span class="hitl-task-icon">${isTask ? '📋' : '🧠'}</span>
                    <span>${escapeHtml(item)}</span>
                </div>
            `).join('')}
        </div>
        <div class="hitl-actions">
            <button class="hitl-approve">✓ Approve</button>
            <button class="hitl-reject">✕ Reject</button>
        </div>
    `;

    // Approve handler
    card.querySelector('.hitl-approve').onclick = () => {
        if (isTask) {
            items.forEach(taskTitle => Storage.addTask(taskTitle));
            renderAll();
        }
        // Memory items currently stored in profile context, no-op for now
        resolveHITL(card, true);
    };

    // Reject handler
    card.querySelector('.hitl-reject').onclick = () => {
        resolveHITL(card, false);
    };

    log.appendChild(card);
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
}

function resolveHITL(card, approved) {
    card.classList.add('resolved');
    const actionsDiv = card.querySelector('.hitl-actions');
    if (actionsDiv) actionsDiv.remove();

    const msg = document.createElement('div');
    msg.className = `hitl-resolved-msg ${approved ? 'approved' : 'rejected'}`;
    msg.textContent = approved ? '✓ Approved and applied' : '✕ Rejected';
    card.appendChild(msg);
}

// ── Typing Indicator ──────────────────────────────────
function showTyping(show) {
    const log = document.getElementById('chat-log');
    if (show) {
        const d = document.createElement('div');
        d.id = 'typing-ind';
        d.style = 'display:flex; gap:6px; padding:1rem; background:var(--bg-card); border-radius:20px; width:fit-content; border:1px solid var(--border-dim);';
        d.innerHTML = '<div class="dot"></div><div class="dot" style="animation-delay:0.2s"></div><div class="dot" style="animation-delay:0.4s"></div>';
        log.appendChild(d);
    } else {
        const e = document.getElementById('typing-ind');
        if (e) e.remove();
    }
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
}

// ── Typewriter Effect ─────────────────────────────────
function typewriter(el, text, speed) {
    let i = 0;
    (function type() {
        if (i < text.length) {
            el.textContent += text[i++];
            setTimeout(type, speed);
        }
    })();
}

// ── Utility ───────────────────────────────────────────
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ── Start ─────────────────────────────────────────────
init();
