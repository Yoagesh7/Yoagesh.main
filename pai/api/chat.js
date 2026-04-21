/**
 * PushAI v2 — Vercel Serverless Function
 * Proxies requests to NVIDIA API to hide key and fix CORS
 */

export default async function handler(req, res) {
    // 1. Set CORS headers for portfolio domain flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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';
    const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

    try {
        const response = await fetch(NVIDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        return res.status(response.status).json(data);

    } catch (err) {
        console.error('Proxy Error:', err);
        return res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
}
