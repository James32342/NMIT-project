import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('.env', import.meta.url) });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const fallbackQuestions = [
    {
        question: 'You are asked to present a risky idea at work. What do you do first?',
        options: ['Draft the idea alone', 'Ask a teammate for feedback', 'Prepare a step-by-step plan', 'Wait for more data'],
        answer: 'Prepare a step-by-step plan',
        category: 'Decision Style',
        difficulty: 'Balanced'
    },
    {
        question: 'After a busy day, you need to remember a list of tasks. What strategy helps most?',
        options: ['Repeat them aloud', 'Write them down visually', 'Do the easy ones first', 'Ask someone to remind you'],
        answer: 'Write them down visually',
        category: 'Memory',
        difficulty: 'Balanced'
    },
    {
        question: 'When pressure builds, which thought best describes your response?',
        options: ['Calm focus', 'Quick urgency', 'Search for support', 'Overanalyze details'],
        answer: 'Calm focus',
        category: 'Stress Response',
        difficulty: 'Insight'
    },
    {
        question: 'Choose the next move when a plan changes unexpectedly.',
        options: ['Adapt quickly', 'Stick to original', 'Ask for clarity', 'Postpone decision'],
        answer: 'Adapt quickly',
        category: 'Adaptability',
        difficulty: 'Balanced'
    }
];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.get('/health', (req, res) => {
    res.json({ status: 'ok', backend: true });
});

app.post('/api/generate-question', async (req, res) => {
    const { currentQuestionIndex = 0, userMetrics = {} } = req.body;
    const fallback = fallbackQuestions[currentQuestionIndex % fallbackQuestions.length];

    if (!GEMINI_API_KEY) {
        return res.json({ question: fallback });
    }

    const prompt = buildGenerationPrompt(currentQuestionIndex, userMetrics);

    try {
        const generatedText = await callGemini(prompt);
        const question = parseGeminiQuestion(generatedText);
        return res.json({ question });
    } catch (error) {
        console.warn('Gemini generate question failed:', error.message || error);
        return res.json({ question: fallback, warning: 'gemini-fallback' });
    }
});

app.post('/api/evaluate-answer', async (req, res) => {
    const { userAnswer = '', correctAnswer = '' } = req.body;
    if (!correctAnswer) {
        return res.status(400).json({ error: 'Missing correctAnswer' });
    }
    if (!GEMINI_API_KEY) {
        const exact = compareAnswers(userAnswer, correctAnswer);
        return res.json({ score: exact ? 100 : 0 });
    }

    const prompt = `Evaluate whether the selected answer "${userAnswer}" is correct compared to "${correctAnswer}" for this behavioral psychology multiple-choice question. Return only a number from 0 to 100.`;

    try {
        const generatedText = await callGemini(prompt);
        const score = parseEvaluationScore(generatedText);
        return res.json({ score });
    } catch (error) {
        console.warn('Gemini evaluation failed:', error.message || error);
        const exact = compareAnswers(userAnswer, correctAnswer);
        return res.json({ score: exact ? 100 : 0, warning: 'gemini-fallback' });
    }
});

app.post('/api/generate-profile', async (req, res) => {
    const { profileName = 'Guest', summary = {}, userMetrics = {} } = req.body;
    const fallback = generateLocalProfile(summary, profileName);
    if (!GEMINI_API_KEY) {
        return res.json({ profile: fallback, warning: 'gemini-fallback' });
    }

    const prompt = buildProfilePrompt(profileName, summary, userMetrics);
    try {
        const generatedText = await callGemini(prompt);
        const profile = parseProfileText(generatedText, fallback);
        return res.json({ profile });
    } catch (error) {
        console.warn('Gemini profile generation failed:', error.message || error);
        return res.json({ profile: fallback, warning: 'gemini-fallback' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
    if (!GEMINI_API_KEY) {
        console.warn('WARNING: GEMINI_API_KEY is not configured. Backend will use fallback questions only.');
    }
});

function buildGenerationPrompt(currentQuestionIndex, userMetrics) {
    let prompt = 'Create a multiple-choice behavioral psychology question that assesses stress, decision-making, memory, adaptability, or creative thinking. Provide 4 labeled options A-D, an exact correct answer, a Category label, and a Difficulty label.';
    if (currentQuestionIndex > 0) {
        const prevAccuracy = userMetrics.accuracy?.[currentQuestionIndex - 1] ?? 0;
        const prevCategory = userMetrics.categories?.[currentQuestionIndex - 1] ?? 'Behavioral';
        const prevSkipped = userMetrics.skips?.[currentQuestionIndex - 1] ? 'yes' : 'no';
        prompt += ` The next question should adapt based on previous accuracy ${prevAccuracy}%, previous category ${prevCategory}, and whether the answer was skipped: ${prevSkipped}.`;
    }
    prompt += ' Use this output format exactly: Question: ... Options: A. ... B. ... C. ... D. ... Answer: ... Category: ... Difficulty: Easy|Balanced|Hard|Insight.';
    return prompt;
}

function buildProfilePrompt(profileName, summary, userMetrics) {
    const normalizedName = profileName || 'Guest';
    return `Generate a personalized cognitive profile for ${normalizedName} using the following metrics:
- Focus: ${summary.focus ?? 0}
- Memory: ${summary.memory ?? 0}
- Creativity: ${summary.creativity ?? 0}
- Adaptability: ${summary.adaptability ?? 0}
- Average accuracy: ${summary.avgAccuracy ?? 0}
- Average response time: ${summary.avgTime ?? 0}
- Primary style: ${summary.primaryStyle ?? 'Balanced'}
- Learning mode: ${summary.learningMode ?? 'Balanced'}
- Transfer ability: ${summary.transferAbility ?? 'Medium'}
- Stress note: ${summary.stressNote ?? 'Steady pace.'}
Return only valid JSON with keys: cognitiveMap, learningStyle, personality, insights, profileText. cognitiveMap, learningStyle, personality, and insights should each be short paragraphs. Do not include any explanation outside the JSON object.`;
}

function generateLocalProfile(summary, profileName) {
    return {
        map: {
            focus: Math.round(summary.focus ?? 70),
            memory: Math.round(summary.memory ?? 70),
            creativity: Math.round(summary.creativity ?? 70),
            adaptability: Math.round(summary.adaptability ?? 70)
        },
        learning: {
            mode: summary.learningMode || 'Balanced learner',
            speed: `${Math.max(60, 100 - Math.round(summary.avgTime ?? 30))}%`,
            retention: `${Math.round(summary.avgAccuracy ?? 70)}%`,
            transfer: summary.transferAbility || 'Medium',
            description: `Based on ${profileName || 'this user'}'s profile, the preferred learning style is ${summary.learningMode || 'balanced and adaptable'}, combining active practice with reflective review.`
        },
        personality: {
            systems: `Primary tendency: ${summary.primaryStyle || 'Balanced'} thinking with solid systems awareness.`,
            empathy: 'Engages with emotional context while maintaining analytic clarity.',
            analytical: 'Shows strong pattern-based judgment and measured decision-making.',
            creative: 'Applies creative problem-solving when under adaptive pressure.'
        },
        insights: {
            psych: 'You are most effective when you balance logical structure with flexible insight.',
            growth: 'Develop consistent reflection loops and purpose-driven practice sessions.',
            hidden: 'Hidden strength: resilient adaptation and calm focus under uncertainty.',
            environment: 'Best supported by low-distraction spaces and clear milestone checkpoints.'
        },
        profileText: `${profileName || 'This profile'} reflects a ${summary.primaryStyle || 'balanced'} cognitive approach with strong memory, creativity, and adaptability markers.`
    };
}

function parseProfileText(text, fallback) {
    if (!text || typeof text !== 'string') {
        return fallback;
    }
    let parsed = null;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        // try to extract labeled sections if JSON fails
        const getField = (key) => {
            const regex = new RegExp(`${key}:\\s*([\\s\\S]*?)(?=(\\n\\w+:|$))`, 'i');
            const match = text.match(regex);
            return match ? match[1].trim() : undefined;
        };
        parsed = {
            cognitiveMap: getField('cognitiveMap') || getField('Cognitive Map') || fallback.map?.description,
            learningStyle: getField('learningStyle') || getField('Learning Style') || fallback.learning?.description,
            personality: getField('personality') || getField('Personality') || null,
            insights: getField('insights') || getField('Insights') || null,
            profileText: getField('profileText') || getField('ProfileText') || fallback.profileText
        };
    }
    const profile = {
        map: fallback.map,
        learning: fallback.learning,
        personality: fallback.personality,
        insights: fallback.insights,
        profileText: fallback.profileText
    };
    if (parsed.cognitiveMap) profile.map = {
        focus: fallback.map.focus,
        memory: fallback.map.memory,
        creativity: fallback.map.creativity,
        adaptability: fallback.map.adaptability,
        description: parsed.cognitiveMap
    };
    if (parsed.learningStyle) profile.learning.description = parsed.learningStyle;
    if (parsed.personality) {
        profile.personality = {
            systems: parsed.personality,
            empathy: parsed.personality,
            analytical: parsed.personality,
            creative: parsed.personality
        };
    }
    if (parsed.insights) {
        profile.insights = {
            psych: parsed.insights,
            growth: parsed.insights,
            hidden: parsed.insights,
            environment: parsed.insights
        };
    }
    profile.profileText = parsed.profileText || profile.profileText;
    return profile;
}

async function callGemini(prompt) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Gemini response ${response.status}${errorText ? `: ${errorText}` : ''}`);
    }
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseGeminiQuestion(text) {
    const questionMatch = text.match(/Question:\s*([\s\S]*?)Options:/i);
    const optionsMatch = text.match(/Options:\s*([\s\S]*?)Answer:/i);
    const answerMatch = text.match(/Answer:\s*(.*)/i);
    const categoryMatch = text.match(/Category:\s*(.*)/i);
    const difficultyMatch = text.match(/Difficulty:\s*(.*)/i);
    const question = questionMatch ? questionMatch[1].trim() : 'Select the response that best matches your approach.';
    const optionsText = optionsMatch ? optionsMatch[1].trim() : 'A. Pause and reflect\nB. Move forward quickly\nC. Ask for clarity\nD. Revisit assumptions';
    const options = Array.from(optionsText.matchAll(/[A-D][\.\)]\s*(.*)/gi)).map(match => match[1].trim()).filter(Boolean);
    const answer = answerMatch ? answerMatch[1].trim() : options[0] || 'Pause and reflect';
    const category = categoryMatch ? categoryMatch[1].trim() : 'Behavioral';
    const difficulty = difficultyMatch ? difficultyMatch[1].trim() : 'Balanced';
    return { question, options: options.length ? options : ['Pause and reflect', 'Move forward quickly', 'Ask for clarity', 'Revisit assumptions'], answer, category, difficulty };
}

function parseEvaluationScore(text) {
    const match = text.match(/(\d{1,3})/);
    if (!match) {
        return 0;
    }
    return Math.min(100, Math.max(0, parseInt(match[1], 10)));
}

function compareAnswers(userAnswer, correctAnswer) {
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}
