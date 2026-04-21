/**
 * PushAI v2 — AI Engine
 * Direct NVIDIA API calls, personality modes, HITL parsing
 */

// Using corsproxy.io to bypass browser CORS restrictions for pure frontend deployments (GitHub Pages)
const NVIDIA_API_URL = 'https://corsproxy.io/?https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_API_KEY = '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';

// ── Personality System Prompts ──
const PERSONALITY_PROMPTS = {
    strict: `You are PAI — a no-nonsense, high-performance productivity enforcer.
TONE: Direct, authoritative, accountability-focused. No sugarcoating.
STYLE:
- Short, punchy sentences. Cut the fluff.
- Call out procrastination directly.
- Set hard deadlines. Use urgency language.
- "You said you'd do X. Have you? No excuses."
- Minimal emojis. Only ⚠️ and ⏰ when critical.
- Never say "it's okay" — say "fix it now."`,

    friendly: `You are PAI — a warm, enthusiastic, and genuinely supportive AI friend.
TONE: Encouraging, positive, empathetic, celebration-focused. Use emojis! 🚀✨🎉
STYLE:
- Celebrate every small win with genuine excitement.
- Use encouraging phrases: "You've got this!", "I'm proud of you!"
- Ask about their feelings and wellbeing.
- Offer help gently, never push too hard.
- Use warm metaphors and analogies.
- Always end with something positive and actionable.`,

    coach: `You are PAI — a strategic performance coach and mentor.
TONE: Thoughtful, Socratic, growth-oriented. Like a wise mentor at a campfire.
STYLE:
- Ask probing questions before giving answers: "What's really blocking you?"
- Use frameworks: "Let's break this into 3 pillars..."
- Reference patterns: "Top performers do X because..."
- Challenge assumptions diplomatically.
- Focus on systems, not goals. Build habits.
- End with ONE specific next step. Not five. One.
- Occasional emojis for warmth: 🎯💡🧠`
};

// ── Build System Prompt ──
function buildSystemPrompt(personality = 'friendly') {
    const user = Storage.getUser();
    const tasks = Storage.getTasks();
    const activeTasks = tasks.filter(t => t.status !== 'done');
    const doneTasks = tasks.filter(t => t.status === 'done');
    const streak = Storage.getStreak();
    const today = new Date().toISOString().slice(0, 10);
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    const personalityPrompt = PERSONALITY_PROMPTS[personality] || PERSONALITY_PROMPTS.friendly;

    return `${personalityPrompt}

DATE: ${today} (${timeOfDay})
USER PROFILE:
- Name: ${user.name || 'Unknown'}
- Age: ${user.age || 'Unknown'}
- Interests: ${user.interests || 'Unknown'}
- Hobby: ${user.hobby || 'Unknown'}
- Dream: ${user.dream || 'Unknown'}
- Work Time: ${user.workTime || 'Unknown'}
- Free Time: ${user.freeTime || 'Unknown'}

CURRENT STATE:
- Active tasks: ${activeTasks.length} (${activeTasks.map(t => t.title).join(', ') || 'none'})
- Completed tasks: ${doneTasks.length}
- Current streak: ${streak} tasks done

AGENTIC ACTIONS (use these tags when appropriate):
- To suggest adding tasks: [AGENT_ADD_TASKS: Task1 | Task2 | Task3]
- To remember a user fact: [MEMORY_UPDATE: User prefers X]

FORMATTING RULES:
- Use bullet points, never inline lists.
- Keep responses concise but impactful.
- Personalize based on user profile data above.
- Always address user by name if known.`;
}

// ── Parse HITL Tags from AI Response ──
function parseHITLActions(reply) {
    const actions = { tasks: [], memories: [], cleanReply: reply };

    // Parse task suggestions
    const taskMatch = reply.match(/\[AGENT_ADD_TASKS:\s*(.*?)\]/);
    if (taskMatch) {
        actions.tasks = taskMatch[1].split('|').map(t => t.trim()).filter(Boolean);
        actions.cleanReply = actions.cleanReply.replace(/\[AGENT_ADD_TASKS:.*?\]/g, '').trim();
    }

    // Parse memory updates
    const memMatch = reply.match(/\[MEMORY_UPDATE:\s*(.*?)\]/);
    if (memMatch) {
        actions.memories = [memMatch[1].trim()];
        actions.cleanReply = actions.cleanReply.replace(/\[MEMORY_UPDATE:.*?\]/g, '').trim();
    }

    return actions;
}

// ── Send Message to NVIDIA API ──
async function sendToAI(userMessage, chatHistory = []) {
    const personality = Storage.getPersonality();
    const systemPrompt = buildSystemPrompt(personality);

    const messages = [{ role: 'system', content: systemPrompt }];

    // Add recent history (last 8 messages)
    const recentHistory = chatHistory.slice(-8);
    for (const msg of recentHistory) {
        messages.push({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.text
        });
    }

    messages.push({ role: 'user', content: userMessage });

    try {
        const response = await fetch(NVIDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`
            },
            body: JSON.stringify({
                model: 'meta/llama-3.1-8b-instruct',
                messages,
                temperature: 0.7,
                max_tokens: 600
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `API error ${response.status}`);
        }

        const data = await response.json();
        const rawReply = data.choices?.[0]?.message?.content || 'No response from AI.';
        return parseHITLActions(rawReply);

    } catch (err) {
        console.error('AI Error:', err);
        return {
            tasks: [],
            memories: [],
            cleanReply: `⚠️ AI connection issue: ${err.message}. Stay focused — you've got this!`
        };
    }
}

// ── Dynamic Push Messages ──
function getDynamicGreeting() {
    const user = Storage.getUser();
    const hour = new Date().getHours();
    const name = user.name || 'Champion';
    const streak = Storage.getStreak();

    const greetings = {
        morning: [
            `Good morning, ${name}! ☀️ Let's crush it today.`,
            `Rise and grind, ${name}! Your goals await. 🔥`,
            `Morning, ${name}! Fresh day, fresh wins.`
        ],
        afternoon: [
            `Good afternoon, ${name}! Keep the momentum. 💪`,
            `Hey ${name}! Halfway through — stay locked in. 🎯`,
            `Afternoon push, ${name}! You're doing great.`
        ],
        evening: [
            `Good evening, ${name}! Time for a strong finish. 🌙`,
            `Evening, ${name}! Let's wrap up strong tonight. ✨`,
            `Hey ${name}! Wind down with purpose. 🧠`
        ]
    };

    const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    const pool = greetings[period];
    let greeting = pool[Math.floor(Math.random() * pool.length)];

    if (streak >= 5) greeting += ` 🔥 ${streak}-task streak!`;

    return greeting;
}

function getDynamicHeroMessage() {
    const tasks = Storage.getTasks();
    const pending = tasks.filter(t => t.status !== 'done');
    const user = Storage.getUser();

    if (pending.length === 0) {
        return {
            tag: 'All Clear',
            title: "You're all caught up! 🎉",
            sub: user.dream ? `Focus on your dream: ${user.dream}` : 'Time to set new goals.'
        };
    }

    const top = pending[0];
    const messages = [
        { tag: "Today's Priority", title: top.title, sub: top.description || 'Get this done today.' },
        { tag: 'Focus Zone', title: top.title, sub: `${pending.length} tasks waiting. Start here.` },
        { tag: 'Next Up', title: top.title, sub: user.interests ? `Aligned with: ${user.interests}` : 'Make it count.' }
    ];

    return messages[Math.floor(Math.random() * messages.length)];
}
