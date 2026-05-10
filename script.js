const BACKEND_URL = '/api';
const totalQuestions = 10;
let currentQuestionIndex = 0;
let questions = [];
let nextQuestionPromise = null;
let nextQuestionIndex = null;
let currentProfileName = 'Guest';
let userMetrics = {
    accuracy: [],
    timeTaken: [],
    retries: [],
    skips: [],
    hesitation: [],
    categories: []
};
let questionStartTime = 0;
let timerInterval = null;
let assessmentStarted = false;
let backendAvailable = false;

const elements = {
    profileNameInput: document.getElementById('profile-name-input'),
    profileSaveButton: document.getElementById('profile-save-btn'),
    liveStatus: document.getElementById('live-status'),
    summaryStatus: document.getElementById('summary-status'),
    totalQuestions: document.getElementById('total-questions'),
    timeDisplay: document.getElementById('time-display'),
    heroWelcome: document.getElementById('hero-welcome'),
    startAssessmentButton: document.getElementById('start-assessment'),
    retryCount: document.getElementById('retry-count'),
    skipCount: document.getElementById('skip-count'),
    progressFill: document.getElementById('progress-fill'),
    questionText: document.getElementById('question-text'),
    questionCategory: document.getElementById('question-category'),
    difficultyLabel: document.getElementById('difficulty-label'),
    optionsGrid: document.getElementById('options-grid'),
    summaryAccuracy: document.getElementById('summary-accuracy'),
    summarySpeed: document.getElementById('summary-speed'),
    summaryAdaptability: document.getElementById('summary-adaptability'),
    summaryCreativity: document.getElementById('summary-creativity'),
    statResilience: document.getElementById('stat-resilience'),
    statDecisionClarity: document.getElementById('stat-decision-clarity'),
    statEmotionalBalance: document.getElementById('stat-emotional-balance'),
    statGrowthMindset: document.getElementById('stat-growth-mindset'),
    statSocialIntelligence: document.getElementById('stat-social-intelligence'),
    statGrowth: document.getElementById('stat-growth'),
    statCareer: document.getElementById('stat-career'),
    statLearning: document.getElementById('stat-learning'),
    profile: document.getElementById('cognitive-profile'),
    velocity: document.getElementById('learning-velocity'),
    strengths: document.getElementById('hidden-strengths'),
    stress: document.getElementById('stress-insight'),
    insights: document.getElementById('ai-insights')
};

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

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(section => {
        section.classList.toggle('hidden', section.id !== `${pageId}-section`);
    });
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });
}

function startNavigation() {
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.dataset.page;
            showPage(page);
            if (page === 'assessment' && !assessmentStarted) {
                resetAssessment();
            }
        });
    });
    document.getElementById('new-analysis').addEventListener('click', resetAssessment);
    document.getElementById('reset-assessment').addEventListener('click', resetAssessment);
    document.getElementById('skip-btn').addEventListener('click', skipQuestion);
}

function resetAssessment() {
    assessmentStarted = true;
    currentQuestionIndex = 0;
    questions = [];
    userMetrics = { accuracy: [], timeTaken: [], retries: [], skips: [], hesitation: [], categories: [] };
    clearInterval(timerInterval);
    elements.progressFill.style.width = '0%';
    elements.timeDisplay.textContent = '0s';
    elements.retryCount.textContent = '0';
    elements.skipCount.textContent = '0';
    elements.summaryStatus.textContent = backendAvailable ? 'Backend ready. Begin your new analysis.' : 'Backend unavailable. Using fallback questions.';
    showPage('assessment');
    loadNextQuestion();
}

async function loadNextQuestion() {
    if (currentQuestionIndex >= totalQuestions) {
        return completeAssessment();
    }
    const question = await prefetchQuestion(currentQuestionIndex);
    questions[currentQuestionIndex] = question;
    renderQuestion(question);
    questionStartTime = Date.now();
    updateTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    if (currentQuestionIndex + 1 < totalQuestions) {
        prefetchQuestion(currentQuestionIndex + 1);
    }
}

function renderQuestion(question) {
    elements.questionCategory.textContent = `Category: ${question.category}`;
    elements.difficultyLabel.textContent = `Difficulty: ${question.difficulty}`;
    elements.questionText.textContent = question.question;
    elements.liveStatus.textContent = `Adaptive question ${currentQuestionIndex + 1} of ${totalQuestions}`;
    elements.optionsGrid.innerHTML = question.options.map(option => `
        <button class="option-button" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>
    `).join('');
    elements.optionsGrid.querySelectorAll('.option-button').forEach(button => {
        button.addEventListener('click', () => chooseOption(button.dataset.value));
    });
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function chooseOption(selection) {
    clearInterval(timerInterval);
    const currentQuestion = questions[currentQuestionIndex];
    const accuracy = await evaluateAnswer(selection, currentQuestion.answer);
    recordMetrics(accuracy, selection !== currentQuestion.answer, currentQuestion.category);
    currentQuestionIndex += 1;
    if (currentQuestionIndex >= totalQuestions) {
        return completeAssessment();
    }
    const nextQuestion = questions[currentQuestionIndex] || await prefetchQuestion(currentQuestionIndex);
    questions[currentQuestionIndex] = nextQuestion;
    renderQuestion(nextQuestion);
    questionStartTime = Date.now();
    updateTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    if (currentQuestionIndex + 1 < totalQuestions) {
        prefetchQuestion(currentQuestionIndex + 1);
    }
}

async function evaluateAnswer(userAnswer, correctAnswer) {
    if (!backendAvailable) {
        return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase() ? 100 : 0;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/evaluate-answer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userAnswer, correctAnswer })
        });
        if (!response.ok) throw new Error('Backend evaluation failed');
        const data = await response.json();
        return typeof data.score === 'number' ? data.score : 0;
    } catch (error) {
        console.warn('Backend evaluation failed, using local fallback.', error);
        return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase() ? 100 : 0;
    }
}

function recordMetrics(accuracy, skipped, category) {
    const timeTaken = Math.max(0, Math.floor((Date.now() - questionStartTime) / 1000));
    userMetrics.accuracy.push(accuracy);
    userMetrics.timeTaken.push(timeTaken);
    userMetrics.retries.push(0);
    userMetrics.skips.push(skipped ? 1 : 0);
    userMetrics.hesitation.push(timeTaken > 35 ? 1 : 0);
    userMetrics.categories.push(category || 'Behavioral');
    elements.retryCount.textContent = userMetrics.retries.reduce((sum, value) => sum + value, 0);
    elements.skipCount.textContent = userMetrics.skips.reduce((sum, value) => sum + value, 0);
}

function updateTimer() {
    const elapsed = Math.max(0, Math.floor((Date.now() - questionStartTime) / 1000));
    elements.timeDisplay.textContent = `${elapsed}s`;
}

async function createAdaptiveQuestion(index = currentQuestionIndex) {
    const fallback = fallbackQuestions[index % fallbackQuestions.length];
    if (!backendAvailable) {
        return fallback;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/generate-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentQuestionIndex: index, userMetrics })
        });
        if (!response.ok) throw new Error('Backend generation failed');
        const data = await response.json();
        return data?.question || fallback;
    } catch (error) {
        console.warn('Backend question generation failed, using fallback.', error);
        return fallback;
    }
}

function prefetchQuestion(index) {
    if (index >= totalQuestions) {
        return Promise.resolve(null);
    }
    if (questions[index]) {
        return Promise.resolve(questions[index]);
    }
    if (nextQuestionPromise && nextQuestionIndex === index) {
        return nextQuestionPromise;
    }
    nextQuestionIndex = index;
    nextQuestionPromise = createAdaptiveQuestion(index).then(question => {
        questions[index] = question;
        return question;
    }).finally(() => {
        if (nextQuestionIndex === index) {
            nextQuestionPromise = null;
            nextQuestionIndex = null;
        }
    });
    return nextQuestionPromise;
}

function getProfileStorageKey(name) {
    return `neuropathAIProfile:${name.trim().toLowerCase()}`;
}

function loadProfileName() {
    const savedName = localStorage.getItem('neuropathProfileName');
    currentProfileName = savedName ? savedName : 'Guest';
    elements.profileNameInput.value = currentProfileName;
    return currentProfileName;
}

function saveProfileName(name) {
    currentProfileName = name.trim() || 'Guest';
    elements.profileNameInput.value = currentProfileName;
    localStorage.setItem('neuropathProfileName', currentProfileName);
    if (elements.heroWelcome) {
        elements.heroWelcome.textContent = `Welcome, ${currentProfileName}`;
    }
}

function saveProfileToStorage(profile) {
    if (!profile || !currentProfileName) return;
    localStorage.setItem(getProfileStorageKey(currentProfileName), JSON.stringify(profile));
}

function loadStoredProfile() {
    if (!currentProfileName) return null;
    const stored = localStorage.getItem(getProfileStorageKey(currentProfileName));
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch (error) {
        console.warn('Failed to parse stored profile', error);
        return null;
    }
}

function applyStoredProfile(profile) {
    if (!profile) return;
    updateMap(profile.map || {});
    updatePersonality(profile.personality || {});
    updateLearning(profile.learning || {});
    updateInsights(profile.insights || {});
    if (profile.map) {
        elements.statMemory.textContent = profile.map.memory ?? elements.statMemory.textContent;
        elements.statFocus.textContent = profile.map.focus ?? elements.statFocus.textContent;
        elements.statAdaptability.textContent = profile.map.adaptability ?? elements.statAdaptability.textContent;
        elements.statCreativity.textContent = profile.map.creativity ?? elements.statCreativity.textContent;
    }
    if (profile.profileText) {
        elements.profile.textContent = profile.profileText;
    }
}

async function generateProfile(summary) {
    const fallback = {
        map: {
            focus: `${summary.focus}`,
            memory: `${summary.memory}`,
            creativity: `${summary.creativity}`,
            adaptability: `${summary.adaptability}`
        },
        learning: {
            mode: summary.learningMode,
            speed: `${Math.max(60, 100 - Math.round(summary.avgTime))}%`,
            retention: `${Math.round(summary.avgAccuracy)}%`,
            transfer: summary.transferAbility,
            description: `This profile favors ${summary.learningMode.toLowerCase()} learning patterns, blending paced reflection with adaptive challenge.`
        },
        personality: {
            systems: `Primary tendency: ${summary.primaryStyle} thinking with strong structural reasoning.`,
            empathy: `A grounded interpersonal sensitivity that balances emotional awareness with analytical clarity.`,
            analytical: `The profile shows consistent pattern recognition and strategic judgment.`,
            creative: `Creativity is expressed through adaptive problem framing and reflective insight.`
        },
        insights: {
            psych: `Your strengths emerge from combining focused clarity with flexible concept mapping.`,
            growth: `Build on your existing pace by alternating deep practice with quick experimentation.`,
            hidden: `Hidden strength: adaptable reasoning under pressure, especially in uncertain contexts.`,
            environment: `You thrive in calm, low-distraction settings with clear feedback loops.`
        },
        profileText: `${summary.primaryStyle} cognitive profile with strong memory and adaptability markers.`
    };

    if (!backendAvailable) {
        saveProfileToStorage(fallback);
        return fallback;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/generate-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                profileName: currentProfileName,
                summary,
                userMetrics
            })
        });
        if (!response.ok) throw new Error('Profile generation failed');
        const data = await response.json();
        const profile = data?.profile || fallback;
        saveProfileToStorage(profile);
        return profile;
    } catch (error) {
        console.warn('AI profile generation failed, using fallback.', error);
        saveProfileToStorage(fallback);
        return fallback;
    }
}

function computeSummary() {
    const avgAccuracy = userMetrics.accuracy.length ? userMetrics.accuracy.reduce((a, b) => a + b, 0) / userMetrics.accuracy.length : 0;
    const avgTime = userMetrics.timeTaken.length ? userMetrics.timeTaken.reduce((a, b) => a + b, 0) / userMetrics.timeTaken.length : 0;
    const profileScore = Math.min(100, Math.round(avgAccuracy + (100 - avgTime) * 0.14));
    return {
        avgAccuracy,
        avgTime,
        primaryStyle: avgAccuracy > 80 ? 'Systems-Oriented' : avgAccuracy > 65 ? 'Strategic' : 'Reflective',
        learningMode: avgTime < 20 ? 'Fast Adaptive' : avgTime < 35 ? 'Steady Learner' : 'Deep Mapper',
        transferAbility: avgAccuracy > 75 ? 'High' : avgAccuracy > 55 ? 'Medium' : 'Emerging',
        focus: Math.min(100, Math.round(profileScore * 0.85)),
        memory: Math.min(100, Math.round(profileScore * 0.92)),
        creativity: Math.min(100, Math.round(profileScore * 0.88)),
        adaptability: Math.min(100, Math.round(profileScore * 0.9)),
        stressNote: avgTime > 35 ? 'Response speed slowed; cognitive overload may be present.' : 'Steady pace with strong focus tendencies.'
    };
}

function updateMap(summary) {
    const values = [
        { key: 'map-focus', fill: 'map-focus-fill', label: 'focus' },
        { key: 'map-memory', fill: 'map-memory-fill', label: 'memory' },
        { key: 'map-creativity', fill: 'map-creativity-fill', label: 'creativity' },
        { key: 'map-adaptability', fill: 'map-adaptability-fill', label: 'adaptability' }
    ];

    values.forEach(({ key, fill, label }) => {
        const rawValue = summary[label] || 0;
        const numericValue = typeof rawValue === 'string' ? parseInt(rawValue.replace('%', ''), 10) : rawValue;
        const value = Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : 0;
        document.getElementById(key).textContent = `${value}%`;
        const fillEl = document.getElementById(fill);
        if (fillEl) {
            fillEl.style.width = `${value}%`;
        }
    });

    const canvas = document.getElementById('cognitive-map-canvas');
    const ctx = canvas.getContext('2d');
    const valuesOnly = values.map(item => {
        const rawValue = summary[item.label] || 0;
        const numericValue = typeof rawValue === 'string' ? parseInt(rawValue.replace('%', ''), 10) : rawValue;
        return Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : 0;
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    valuesOnly.forEach((value, index) => {
        const x = 60 + index * 160;
        const barHeight = (value / 100) * 180;
        ctx.fillStyle = index % 2 === 0 ? 'rgba(139,92,246,0.85)' : 'rgba(56,189,248,0.85)';
        ctx.fillRect(x, canvas.height - barHeight - 40, 80, barHeight);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(['Focus', 'Memory', 'Creativity', 'Adaptability'][index], x + 40, canvas.height - 12);
    });
}

function updatePersonality(profileOrSummary) {
    const avgAccuracy = profileOrSummary.avgAccuracy || 75;
    const avgTime = profileOrSummary.avgTime || 25;
    const primaryStyle = profileOrSummary.primaryStyle || 'Strategic';
    const adaptability = profileOrSummary.adaptability || 80;
    const creativity = profileOrSummary.creativity || 75;
    const focus = profileOrSummary.focus || 78;
    
    // Generate detailed personality explanations based on assessment metrics
    const systems = profileOrSummary.systems || generateSystemsExplanation(avgAccuracy, primaryStyle, avgTime);
    const empathy = profileOrSummary.empathy || generateEmpathyExplanation(avgAccuracy, avgTime);
    const analytical = profileOrSummary.analytical || generateAnalyticalExplanation(avgAccuracy, focus, avgTime);
    const creative = profileOrSummary.creative || generateCreativeExplanation(creativity, avgTime);
    const adaptive = profileOrSummary.adaptive || generateAdaptiveExplanation(adaptability, avgAccuracy);
    const strategic = profileOrSummary.strategic || generateStrategicExplanation(avgAccuracy, primaryStyle, focus);
    const emotional = profileOrSummary.emotional || generateEmotionalExplanation(avgAccuracy, avgTime);
    const pattern = profileOrSummary.pattern || generatePatternExplanation(avgAccuracy, focus);
    const decision = profileOrSummary.decision || generateDecisionExplanation(avgAccuracy, avgTime);
    const learning = profileOrSummary.learning || generateLearningExplanation(avgAccuracy, avgTime, adaptability);
    
    // Update DOM elements
    document.getElementById('trait-systems').textContent = systems;
    document.getElementById('trait-empathy').textContent = empathy;
    document.getElementById('trait-analytical').textContent = analytical;
    document.getElementById('trait-creative').textContent = creative;
    document.getElementById('trait-adaptive').textContent = adaptive;
    document.getElementById('trait-strategic').textContent = strategic;
    document.getElementById('trait-emotional').textContent = emotional;
    document.getElementById('trait-pattern').textContent = pattern;
    document.getElementById('trait-decision').textContent = decision;
    document.getElementById('trait-learning').textContent = learning;
}

function generateSystemsExplanation(avgAccuracy, primaryStyle, avgTime) {
    const baseText = avgAccuracy > 80 ? 
        "Exceptional systems thinking with natural ability to see interconnected patterns and structural relationships." :
        avgAccuracy > 65 ? 
        "Strong systematic approach to problem-solving, able to break down complex scenarios into manageable components." :
        "Developing systems orientation, shows potential for structured thinking with continued practice.";
    
    const timeContext = avgTime < 20 ? 
        " Processes information rapidly while maintaining structural integrity." :
        avgTime < 35 ? 
        " Balances thorough analysis with timely decision-making." :
        " Prefers deliberate, comprehensive analysis before reaching conclusions.";
    
    const styleContext = primaryStyle === 'Systems-Oriented' ? 
        " Naturally gravitates toward holistic frameworks and architectural thinking." :
        primaryStyle === 'Strategic' ? 
        " Combines systems awareness with goal-oriented strategic planning." :
        " Applies structured thinking to achieve reflective understanding.";
    
    return `${baseText} ${timeContext} ${styleContext} This manifests in your ability to create order from complexity and identify leverage points for maximum impact.`;
}

function generateEmpathyExplanation(avgAccuracy, avgTime) {
    const empathyLevel = avgAccuracy > 75 ? 
        "High emotional attunement with natural ability to understand others' perspectives and motivations." :
        avgAccuracy > 60 ? 
        "Moderate empathic reasoning, can connect with others' emotional states when given context." :
        "Developing emotional awareness, shows capacity for growth in interpersonal understanding.";
    
    const processingStyle = avgTime < 25 ? 
        "Quick emotional processing allows for rapid social adaptation." :
        avgTime < 40 ? 
        "Balanced emotional response time, considers feelings without overthinking." :
        "Deliberate emotional processing, takes time to fully understand social dynamics.";
    
    return `${empathyLevel} ${processingStyle} This trait enables you to navigate social complexities effectively and build meaningful connections through genuine understanding of human behavior.`;
}

function generateAnalyticalExplanation(avgAccuracy, focus, avgTime) {
    const analyticalDepth = avgAccuracy > 85 ? 
        "Exceptional analytical capabilities with natural talent for deep logical reasoning and critical evaluation." :
        avgAccuracy > 70 ? 
        "Strong analytical skills, able to break down problems systematically and identify key variables." :
        "Developing analytical thinking, shows promise in logical reasoning with continued practice.";
    
    const focusContext = focus > 85 ? 
        "Intense concentration allows for thorough examination of complex details." :
        focus > 70 ? 
        "Steady focus enables balanced analysis of multiple factors." :
        "Variable attention patterns, benefits from structured analytical frameworks.";
    
    const timeContext = avgTime < 30 ? 
        "Quick analytical processing while maintaining accuracy." :
        avgTime < 45 ? 
        "Measured analytical pace ensures comprehensive evaluation." :
        "Deliberate analysis prioritizes depth over speed.";
    
    return `${analyticalDepth} ${focusContext} ${timeContext} This analytical strength allows you to dissect complex information, identify patterns, and make evidence-based decisions with confidence.`;
}

function generateCreativeExplanation(creativity, avgTime) {
    const creativeLevel = creativity > 85 ? 
        "Exceptional creative thinking with natural ability to generate innovative solutions and think outside conventional boundaries." :
        creativity > 70 ? 
        "Strong creative problem-solving skills, able to approach challenges from multiple angles." :
        "Developing creative thinking, shows potential for innovative approaches with encouragement.";
    
    const timeContext = avgTime < 25 ? 
        "Rapid creative ideation generates diverse solutions quickly." :
        avgTime < 40 ? 
        "Balanced creative process allows for both innovation and practicality." :
        "Deliberate creative thinking refines ideas through careful consideration.";
    
    return `${creativeLevel} ${timeContext} Your creative expression manifests in finding novel connections between disparate concepts and developing original approaches to complex problems.`;
}

function generateAdaptiveExplanation(adaptability, avgAccuracy) {
    const adaptiveLevel = adaptability > 85 ? 
        "Exceptional adaptability with natural resilience in changing environments and ability to pivot strategies effectively." :
        adaptability > 70 ? 
        "Strong adaptive capabilities, able to adjust to new circumstances while maintaining core objectives." :
        "Developing adaptability, shows capacity to handle change with structured support.";
    
    const accuracyContext = avgAccuracy > 75 ? 
        "Adapts while maintaining high performance standards." :
        avgAccuracy > 60 ? 
        "Balances adaptation with consistent quality output." :
        "Focuses on adaptation even if it temporarily affects accuracy.";
    
    return `${adaptiveLevel} ${accuracyContext} This adaptability enables you to thrive in dynamic environments and turn unexpected challenges into opportunities for growth.`;
}

function generateStrategicExplanation(avgAccuracy, primaryStyle, focus) {
    const strategicLevel = avgAccuracy > 80 ? 
        "Exceptional strategic thinking with natural ability to see long-term implications and plan multiple steps ahead." :
        avgAccuracy > 65 ? 
        "Strong strategic planning skills, able to anticipate consequences and align actions with goals." :
        "Developing strategic thinking, shows potential for planning with guided practice.";
    
    const styleContext = primaryStyle === 'Strategic' ? 
        "Natural strategic orientation drives goal-directed behavior." :
        primaryStyle === 'Systems-Oriented' ? 
        "Combines strategic planning with systems awareness." :
        "Develops strategic thinking through reflective practice.";
    
    const focusContext = focus > 80 ? 
        "Sustained strategic focus maintains long-term vision." :
        focus > 65 ? 
        "Balanced strategic attention manages present and future." :
        "Strategic thinking benefits from focus-enhancing techniques.";
    
    return `${strategicLevel} ${styleContext} ${focusContext} Your strategic mindset enables you to navigate complexity with purpose and create pathways to achieve ambitious objectives.`;
}

function generateEmotionalExplanation(avgAccuracy, avgTime) {
    const emotionalLevel = avgAccuracy > 75 ? 
        "High emotional intelligence with natural ability to recognize, understand, and manage emotions effectively." :
        avgAccuracy > 60 ? 
        "Moderate emotional intelligence, can identify emotional patterns and respond appropriately." :
        "Developing emotional awareness, shows capacity for growth in emotional regulation.";
    
    const timeContext = avgTime < 30 ? 
        "Quick emotional processing enables rapid social adaptation." :
        avgTime < 45 ? 
        "Balanced emotional response time considers feelings thoughtfully." :
        "Deliberate emotional processing ensures thorough understanding.";
    
    return `${emotionalLevel} ${timeContext} This emotional intelligence allows you to build strong relationships, navigate conflicts constructively, and create positive emotional environments.`;
}

function generatePatternExplanation(avgAccuracy, focus) {
    const patternLevel = avgAccuracy > 85 ? 
        "Exceptional pattern recognition with natural ability to identify subtle connections and predict outcomes." :
        avgAccuracy > 70 ? 
        "Strong pattern detection skills, able to spot trends and make informed predictions." :
        "Developing pattern recognition, shows potential for improved observation skills.";
    
    const focusContext = focus > 85 ? 
        "Intense focus enhances ability to detect subtle patterns." :
        focus > 70 ? 
        "Balanced attention supports effective pattern recognition." :
        "Pattern recognition improves with structured observation techniques.";
    
    return `${patternLevel} ${focusContext} Your pattern recognition ability enables you to anticipate developments, optimize processes, and make proactive decisions based on emerging trends.`;
}

function generateDecisionExplanation(avgAccuracy, avgTime) {
    const confidenceLevel = avgAccuracy > 80 ? 
        "High decision confidence with natural ability to make timely, effective choices under pressure." :
        avgAccuracy > 65 ? 
        "Moderate decision confidence, able to make sound choices with adequate information." :
        "Developing decision-making skills, shows potential for improved confidence with practice.";
    
    const timeContext = avgTime < 20 ? 
        "Quick decision-making while maintaining accuracy." :
        avgTime < 35 ? 
        "Balanced decision pace ensures thorough consideration." :
        "Deliberate decision-making prioritizes accuracy over speed.";
    
    return `${confidenceLevel} ${timeContext} Your decision-making approach combines analytical thinking with intuitive judgment, enabling confident choices that align with your values and goals.`;
}

function generateLearningExplanation(avgAccuracy, avgTime, adaptability) {
    const learningLevel = avgAccuracy > 80 ? 
        "Exceptional learning agility with natural ability to rapidly acquire and apply new knowledge." :
        avgAccuracy > 65 ? 
        "Strong learning capabilities, able to absorb information effectively and transfer skills." :
        "Developing learning skills, shows potential for accelerated growth with proper techniques.";
    
    const timeContext = avgTime < 25 ? 
        "Quick learning pace absorbs information efficiently." :
        avgTime < 40 ? 
        "Balanced learning speed ensures deep understanding." :
        "Deliberate learning approach prioritizes comprehensive mastery.";
    
    const adaptiveContext = adaptability > 80 ? 
        "Highly adaptive learning style adjusts to new challenges seamlessly." :
        adaptability > 65 ? 
        "Flexible learning approach handles various situations well." :
        "Learning benefits from structured adaptive strategies.";
    
    return `${learningLevel} ${timeContext} ${adaptiveContext} Your learning agility enables continuous growth, skill development, and the ability to thrive in evolving environments.`;
}

function updateLearning(profileOrSummary) {
    const avgAccuracy = profileOrSummary.avgAccuracy || 75;
    const avgTime = profileOrSummary.avgTime || 25;
    const adaptability = profileOrSummary.adaptability || 80;
    const creativity = profileOrSummary.creativity || 75;
    const focus = profileOrSummary.focus || 78;
    const primaryStyle = profileOrSummary.primaryStyle || 'Strategic';
    
    // Calculate advanced learning metrics based on assessment performance
    const mode = profileOrSummary.mode || generateLearningMode(avgAccuracy, avgTime, creativity);
    const speed = profileOrSummary.speed || generateLearningSpeed(avgTime, avgAccuracy);
    const retention = profileOrSummary.retention || generateRetentionRate(avgAccuracy, focus);
    const transfer = profileOrSummary.transfer || generateTransferAbility(avgAccuracy, adaptability);
    const adaptive = profileOrSummary.adaptive || generateAdaptiveLearning(adaptability, avgTime);
    const consistency = profileOrSummary.consistency || generateConsistency(userMetrics.accuracy);
    const pressure = profileOrSummary.pressure || generatePressurePerformance(userMetrics.timeTaken, avgAccuracy);
    const complexity = profileOrSummary.complexity || generateComplexityHandling(avgAccuracy, avgTime, creativity);
    
    // Update learning metrics
    document.getElementById('learn-mode').textContent = mode;
    document.getElementById('learn-speed').textContent = speed;
    document.getElementById('learn-retention').textContent = retention;
    document.getElementById('learn-transfer').textContent = transfer;
    document.getElementById('learn-adaptability').textContent = adaptive;
    document.getElementById('learn-consistency').textContent = consistency;
    document.getElementById('learn-pressure').textContent = pressure;
    document.getElementById('learn-complexity').textContent = complexity;
    
    // Generate evidence-based analysis
    const responsePattern = generateResponsePatternEvidence(userMetrics.timeTaken, avgTime);
    const accuracyTrends = generateAccuracyTrendEvidence(userMetrics.accuracy, userMetrics.categories);
    const adaptiveBehavior = generateAdaptiveBehaviorEvidence(adaptability, userMetrics.skips);
    const learningIndicators = generateLearningIndicatorsEvidence(avgAccuracy, avgTime, focus);
    
    document.getElementById('evidence-response').textContent = responsePattern;
    document.getElementById('evidence-accuracy').textContent = accuracyTrends;
    document.getElementById('evidence-adaptive').textContent = adaptiveBehavior;
    document.getElementById('evidence-indicators').textContent = learningIndicators;
    
    // Generate comprehensive learning profile
    const description = profileOrSummary.description || generateLearningDescription(avgAccuracy, avgTime, primaryStyle, mode);
    const strategies = generateLearningStrategies(avgAccuracy, avgTime, adaptability, creativity, focus);
    
    document.getElementById('learning-description').textContent = description;
    document.getElementById('learning-strategies').innerHTML = strategies.map(strategy => `<li>${strategy}</li>`).join('');
}

function generateLearningMode(avgAccuracy, avgTime, creativity) {
    if (avgAccuracy > 85 && avgTime < 20) return "Visual + Rapid Processing";
    if (avgAccuracy > 75 && creativity > 80) return "Creative + Experimental";
    if (avgAccuracy > 80 && avgTime < 30) return "Analytical + Systematic";
    if (avgTime > 40) return "Reflective + Deep Processing";
    if (creativity > 85) return "Innovative + Exploratory";
    return "Balanced + Adaptive";
}

function generateLearningSpeed(avgTime, avgAccuracy) {
    const baseSpeed = Math.max(60, 100 - Math.round(avgTime));
    const accuracyBonus = avgAccuracy > 80 ? 5 : avgAccuracy > 65 ? 2 : 0;
    return `${Math.min(100, baseSpeed + accuracyBonus)}%`;
}

function generateRetentionRate(avgAccuracy, focus) {
    const baseRetention = Math.round(avgAccuracy);
    const focusBonus = focus > 85 ? 8 : focus > 70 ? 4 : 0;
    return `${Math.min(100, baseRetention + focusBonus)}%`;
}

function generateTransferAbility(avgAccuracy, adaptability) {
    const transferScore = (avgAccuracy * 0.6 + adaptability * 0.4);
    if (transferScore > 85) return "Excellent";
    if (transferScore > 70) return "High";
    if (transferScore > 55) return "Medium";
    return "Developing";
}

function generateAdaptiveLearning(adaptability, avgTime) {
    const adaptiveScore = adaptability - Math.max(0, avgTime - 25) * 0.5;
    if (adaptiveScore > 80) return "Exceptional";
    if (adaptiveScore > 65) return "Strong";
    if (adaptiveScore > 50) return "Moderate";
    return "Emerging";
}

function generateConsistency(accuracyArray) {
    if (!accuracyArray.length) return "Insufficient data";
    const variance = calculateVariance(accuracyArray);
    if (variance < 100) return "Highly Consistent";
    if (variance < 300) return "Consistent";
    if (variance < 600) return "Variable";
    return "Highly Variable";
}

function generatePressurePerformance(timeArray, avgAccuracy) {
    const avgResponseTime = timeArray.reduce((a, b) => a + b, 0) / timeArray.length;
    const pressureScore = avgAccuracy > 75 && avgResponseTime < 30 ? "Excellent" :
                        avgAccuracy > 65 && avgResponseTime < 40 ? "Good" :
                        avgAccuracy > 55 ? "Moderate" : "Needs Development";
    return pressureScore;
}

function generateComplexityHandling(avgAccuracy, avgTime, creativity) {
    const complexityScore = (avgAccuracy * 0.5 + creativity * 0.3 + (100 - avgTime) * 0.2);
    if (complexityScore > 80) return "Expert Level";
    if (complexityScore > 65) return "Advanced";
    if (complexityScore > 50) return "Competent";
    return "Developing";
}

function generateResponsePatternEvidence(timeArray, avgTime) {
    const fastResponses = timeArray.filter(t => t < 20).length;
    const slowResponses = timeArray.filter(t => t > 40).length;
    const total = timeArray.length;
    
    if (fastResponses / total > 0.6) return "You demonstrate quick processing with ${fastResponses} rapid responses (<20s), indicating strong intuitive decision-making abilities.";
    if (slowResponses / total > 0.4) return "You show deliberate thinking with ${slowResponses} thoughtful responses (>40s), suggesting thorough analytical processing.";
    return `Balanced response pattern with average time of ${avgTime.toFixed(1)}s, showing adaptable processing speed based on question complexity.`;
}

function generateAccuracyTrendEvidence(accuracyArray, categories) {
    const avgAccuracy = accuracyArray.reduce((a, b) => a + b, 0) / accuracyArray.length;
    const highAccuracy = accuracyArray.filter(a => a > 80).length;
    const categoryPerformance = analyzeCategoryPerformance(accuracyArray, categories);
    
    return `Maintained ${avgAccuracy.toFixed(1)}% average accuracy with ${highAccuracy} high-performance responses (>80%). ${categoryPerformance}`;
}

function generateAdaptiveBehaviorEvidence(adaptability, skipsArray) {
    const totalSkips = skipsArray.reduce((a, b) => a + b, 0);
    const adaptabilityLevel = adaptability > 80 ? "high" : adaptability > 65 ? "moderate" : "developing";
    
    return `Demonstrated ${adaptabilityLevel} adaptability with ${totalSkips} strategic skips, showing ability to recognize when to seek additional information or change approach.`;
}

function generateLearningIndicatorsEvidence(avgAccuracy, avgTime, focus) {
    const learningVelocity = (avgAccuracy / Math.max(1, avgTime)) * 10;
    const learningType = learningVelocity > 3 ? "rapid" : learningVelocity > 1.5 ? "steady" : "deliberate";
    
    return `Learning velocity indicates ${learningType} knowledge acquisition (${learningVelocity.toFixed(2)}). Combined with ${focus}% focus score, suggests strong potential for continuous skill development.`;
}

function generateLearningDescription(avgAccuracy, avgTime, primaryStyle, mode) {
    const performanceLevel = avgAccuracy > 80 ? "high-performing" : avgAccuracy > 65 ? "competent" : "developing";
    const processingStyle = avgTime < 25 ? "quick processor" : avgTime < 40 ? "balanced processor" : "deep processor";
    
    return `As a ${performanceLevel} ${primaryStyle.toLowerCase()} learner with ${mode.toLowerCase()} tendencies, you demonstrate ${processingStyle} capabilities. Your assessment results indicate strong potential for growth through structured practice and adaptive learning strategies.`;
}

function generateLearningStrategies(avgAccuracy, avgTime, adaptability, creativity, focus) {
    const strategies = [];
    
    if (avgAccuracy > 80) {
        strategies.push("Leverage your high accuracy by taking on challenging projects that stretch your capabilities");
        strategies.push("Consider mentoring others to reinforce your own understanding");
    } else if (avgAccuracy > 65) {
        strategies.push("Focus on building consistency through regular practice sessions");
        strategies.push("Use self-assessment to identify and address knowledge gaps");
    } else {
        strategies.push("Start with foundational concepts before advancing to complex topics");
        strategies.push("Utilize spaced repetition techniques to improve retention");
    }
    
    if (avgTime < 25) {
        strategies.push("Your quick processing speed suits time-sensitive learning environments");
        strategies.push("Balance speed with thoroughness to avoid overlooking details");
    } else if (avgTime < 40) {
        strategies.push("Your balanced pace allows for both efficiency and depth");
        strategies.push("Use this balance to tackle both quick and complex learning tasks");
    } else {
        strategies.push("Your deliberate approach excels in deep, complex subject matter");
        strategies.push("Break large topics into smaller segments to maintain momentum");
    }
    
    if (adaptability > 80) {
        strategies.push("Thrive in diverse learning environments and cross-functional projects");
        strategies.push("Explore interdisciplinary subjects to maximize your adaptive strengths");
    }
    
    if (creativity > 80) {
        strategies.push("Apply creative problem-solving techniques to traditional subjects");
        strategies.push("Use visual learning tools and mind mapping to enhance understanding");
    }
    
    if (focus > 85) {
        strategies.push("Your intense focus is ideal for deep-dive learning sessions");
        strategies.push("Consider Pomodoro techniques to maintain high focus levels");
    }
    
    return strategies.slice(0, 6); // Return top 6 strategies
}

function calculateVariance(array) {
    const mean = array.reduce((a, b) => a + b, 0) / array.length;
    const squaredDiffs = array.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / array.length;
}

function analyzeCategoryPerformance(accuracyArray, categories) {
    const categoryScores = {};
    categories.forEach((category, index) => {
        if (!categoryScores[category]) {
            categoryScores[category] = [];
        }
        categoryScores[category].push(accuracyArray[index]);
    });
    
    const categoryAverages = Object.entries(categoryScores).map(([cat, scores]) => ({
        category: cat,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length
    }));
    
    const bestCategory = categoryAverages.reduce((best, current) => 
        current.avg > best.avg ? current : best
    );
    
    return `Strongest performance in ${bestCategory.category} (${bestCategory.avg.toFixed(1)}% accuracy).`;
}

function updateInsights(profileOrSummary) {
    const avgAccuracy = profileOrSummary.avgAccuracy || 75;
    const avgTime = profileOrSummary.avgTime || 25;
    const adaptability = profileOrSummary.adaptability || 80;
    const creativity = profileOrSummary.creativity || 75;
    const focus = profileOrSummary.focus || 78;
    const primaryStyle = profileOrSummary.primaryStyle || 'Strategic';
    
    // Generate comprehensive insights based on assessment performance
    const cognitive = profileOrSummary.cognitive || generateCognitiveInsight(avgAccuracy, avgTime, focus, userMetrics.accuracy);
    const psych = profileOrSummary.psych || generatePsychologicalInsight(avgAccuracy, avgTime, primaryStyle, userMetrics.categories);
    const learning = profileOrSummary.learning || generateLearningVelocityInsight(avgAccuracy, avgTime, adaptability, userMetrics.timeTaken);
    const adaptive = profileOrSummary.adaptive || generateAdaptiveCapacityInsight(adaptability, userMetrics.skips, userMetrics.hesitation);
    const pressure = profileOrSummary.pressure || generatePressureResponseInsight(userMetrics.timeTaken, avgAccuracy, userMetrics.hesitation);
    const growth = profileOrSummary.growth || generateGrowthTrajectoryInsight(avgAccuracy, adaptability, creativity, userMetrics.accuracy);
    const hidden = profileOrSummary.hidden || generateHiddenStrengthsInsight(avgTime, adaptability, creativity, userMetrics.categories);
    const environment = profileOrSummary.environment || generateOptimalEnvironmentInsight(focus, avgTime, userMetrics.timeTaken);
    
    // Update insight cards
    document.getElementById('insight-cognitive').textContent = cognitive;
    document.getElementById('insight-psych').textContent = psych;
    document.getElementById('insight-learning').textContent = learning;
    document.getElementById('insight-adaptive').textContent = adaptive;
    document.getElementById('insight-pressure').textContent = pressure;
    document.getElementById('insight-growth').textContent = growth;
    document.getElementById('insight-hidden').textContent = hidden;
    document.getElementById('insight-environment').textContent = environment;
    
    // Generate performance evidence metrics
    const responseAnalysis = generateResponseTimeAnalysis(userMetrics.timeTaken);
    const accuracyAnalysis = generateAccuracyConsistencyAnalysis(userMetrics.accuracy);
    const adaptationAnalysis = generateAdaptationSpeedAnalysis(userMetrics.skips, userMetrics.hesitation);
    const categoryAnalysis = generateCategoryPerformanceAnalysis(userMetrics.categories, userMetrics.accuracy);
    
    document.getElementById('metric-response').textContent = responseAnalysis;
    document.getElementById('metric-accuracy').textContent = accuracyAnalysis;
    document.getElementById('metric-adaptation').textContent = adaptationAnalysis;
    document.getElementById('metric-categories').textContent = categoryAnalysis;
    
    // Generate actionable recommendations
    const immediateActions = generateImmediateActions(avgAccuracy, avgTime, adaptability);
    const longtermDevelopment = generateLongtermDevelopment(primaryStyle, creativity, focus);
    const skillEnhancement = generateSkillEnhancement(avgAccuracy, adaptability, creativity);
    
    document.getElementById('recommendations-immediate').innerHTML = immediateActions.map(action => `<li>${action}</li>`).join('');
    document.getElementById('recommendations-longterm').innerHTML = longtermDevelopment.map(action => `<li>${action}</li>`).join('');
    document.getElementById('recommendations-skills').innerHTML = skillEnhancement.map(action => `<li>${action}</li>`).join('');
}

function generateCognitiveInsight(avgAccuracy, avgTime, focus, accuracyArray) {
    const cognitiveScore = (avgAccuracy * 0.4 + focus * 0.3 + (100 - avgTime) * 0.3);
    const consistency = calculateVariance(accuracyArray);
    const consistencyLevel = consistency < 200 ? "highly consistent" : consistency < 500 ? "consistent" : "variable";
    
    const performanceLevel = cognitiveScore > 85 ? "exceptional cognitive performance" :
                            cognitiveScore > 70 ? "strong cognitive capabilities" :
                            cognitiveScore > 55 ? "developing cognitive skills" : "emerging cognitive potential";
    
    return `Your assessment reveals ${performanceLevel} with ${consistencyLevel} accuracy patterns. Based on ${avgAccuracy.toFixed(1)}% average accuracy and ${focus}% focus score, you demonstrate ${avgTime < 30 ? 'quick processing' : 'deliberate thinking'} with strong analytical foundations. This cognitive profile suggests excellence in ${cognitiveScore > 75 ? 'complex problem-solving and strategic thinking' : 'structured learning and skill development'}.`;
}

function generatePsychologicalInsight(avgAccuracy, avgTime, primaryStyle, categories) {
    const stressResponse = avgTime > 40 ? "thoughtful under pressure" : avgTime < 25 ? "thrives under pressure" : "balanced under pressure";
    const decisionStyle = avgAccuracy > 80 ? "confident decision-maker" : avgAccuracy > 65 ? "methodical decision-maker" : "cautious decision-maker";
    
    const categoryInsight = analyzePsychologicalCategories(categories, avgAccuracy);
    
    return `As a ${primaryStyle.toLowerCase()} thinker, you exhibit ${stressResponse} tendencies with ${decisionStyle} patterns. Your ${avgAccuracy.toFixed(1)}% accuracy indicates ${avgAccuracy > 75 ? 'strong self-awareness and emotional regulation' : 'developing emotional intelligence with growth potential'}. ${categoryInsight} This psychological profile suggests you excel in ${primaryStyle === 'Systems-Oriented' ? 'structured environments with clear frameworks' : primaryStyle === 'Strategic' ? 'goal-oriented settings with long-term vision' : 'reflective environments with deep thinking opportunities'}.`;
}

function generateLearningVelocityInsight(avgAccuracy, avgTime, adaptability, timeArray) {
    const learningVelocity = (avgAccuracy / Math.max(1, avgTime)) * 10;
    const timeProgression = analyzeTimeProgression(timeArray);
    const adaptabilityBonus = adaptability > 80 ? "enhanced by high adaptability" : adaptability > 65 ? "supported by moderate adaptability" : "requiring adaptability development";
    
    const velocityLevel = learningVelocity > 4 ? "rapid learner" : learningVelocity > 2.5 ? "steady learner" : "deliberate learner";
    
    return `Your learning velocity of ${learningVelocity.toFixed(2)} indicates ${velocityLevel} characteristics, ${adaptabilityBonus}. With ${avgAccuracy.toFixed(1)}% accuracy and ${avgTime.toFixed(1)}s average response time, you ${timeProgression}. This learning profile suggests optimal knowledge acquisition through ${learningVelocity > 3 ? 'immersive, challenging experiences' : 'structured, progressive learning paths'} with immediate feedback loops.`;
}

function generateAdaptiveCapacityInsight(adaptability, skipsArray, hesitationArray) {
    const totalSkips = skipsArray.reduce((a, b) => a + b, 0);
    const totalHesitation = hesitationArray.reduce((a, b) => a + b, 0);
    const adaptabilityScore = adaptability - (totalSkips * 2) - (totalHesitation * 1);
    
    const adaptabilityLevel = adaptabilityScore > 80 ? "exceptional adaptability" :
                            adaptabilityScore > 65 ? "strong adaptability" :
                            adaptabilityScore > 50 ? "moderate adaptability" : "developing adaptability";
    
    const strategicBehavior = totalSkips > 0 ? `strategic skipping behavior (${totalSkips} skips)` : "persistent approach";
    const hesitationPattern = totalHesitation > 0 ? `thoughtful hesitation patterns (${totalHesitation} instances)` : "confident response patterns";
    
    return `Your adaptive capacity demonstrates ${adaptabilityLevel} with ${strategicBehavior} and ${hesitationPattern}. This indicates ${adaptabilityScore > 70 ? 'strong flexibility in changing circumstances' : 'potential for growth in adaptive situations'}. Your adaptability manifests in ${totalSkips > 2 ? 'knowing when to seek additional information' : 'persistent problem-solving approaches'}, suggesting ${adaptabilityScore > 75 ? 'excellent situational awareness' : 'developing contextual sensitivity'}.`;
}

function generatePressureResponseInsight(timeArray, avgAccuracy, hesitationArray) {
    const avgResponseTime = timeArray.reduce((a, b) => a + b, 0) / timeArray.length;
    const pressureResponses = timeArray.filter((t, i) => hesitationArray[i] === 1).length;
    const pressureScore = avgAccuracy > 75 && avgResponseTime < 30 ? 90 :
                         avgAccuracy > 65 && avgResponseTime < 40 ? 75 :
                         avgAccuracy > 55 ? 60 : 45;
    
    const pressureType = pressureScore > 80 ? "thrives under pressure" :
                        pressureScore > 65 ? "manages pressure well" :
                        pressureScore > 50 ? "moderate pressure response" : "pressure-sensitive";
    
    return `Your pressure response analysis indicates ${pressureType} with ${pressureResponses} hesitation instances during challenging questions. Maintaining ${avgAccuracy.toFixed(1)}% accuracy under ${avgResponseTime.toFixed(1)}s average response time shows ${pressureScore > 70 ? 'strong mental resilience and focus maintenance' : 'developing stress management skills'}. This suggests optimal performance in ${pressureScore > 75 ? 'high-stakes, time-sensitive environments' : 'structured, low-pressure settings with adequate preparation time'}.`;
}

function generateGrowthTrajectoryInsight(avgAccuracy, adaptability, creativity, accuracyArray) {
    const growthPotential = (avgAccuracy * 0.4 + adaptability * 0.3 + creativity * 0.3);
    const accuracyTrend = analyzeAccuracyTrend(accuracyArray);
    const adaptabilityMultiplier = adaptability > 80 ? 1.2 : adaptability > 65 ? 1.1 : 1.0;
    const adjustedGrowth = growthPotential * adaptabilityMultiplier;
    
    const trajectoryLevel = adjustedGrowth > 85 ? "exponential growth trajectory" :
                           adjustedGrowth > 70 ? "strong growth trajectory" :
                           adjustedGrowth > 55 ? "steady growth trajectory" : "emerging growth trajectory";
    
    return `Your growth trajectory analysis reveals ${trajectoryLevel} with ${accuracyTrend}. Based on ${avgAccuracy.toFixed(1)}% current performance and ${adaptability}% adaptability score, you demonstrate ${adjustedGrowth > 75 ? 'high potential for rapid skill development' : 'solid foundation for continuous improvement'}. Your growth is ${creativity > 80 ? 'accelerated by strong creative problem-solving abilities' : creativity > 65 ? 'supported by creative thinking skills' : 'ready for creative development'}, suggesting optimal advancement through ${adjustedGrowth > 70 ? 'challenging, diverse experiences' : 'structured, progressive learning environments'}.`;
}

function generateHiddenStrengthsInsight(avgTime, adaptability, creativity, categories) {
    const hiddenStrengths = [];
    
    if (avgTime < 25 && adaptability > 75) {
        hiddenStrengths("rapid adaptive thinking under time pressure");
    }
    if (creativity > 85 && avgTime > 35) {
        hiddenStrengths("deep creative processing with innovative outcomes");
    }
    if (adaptability > 80) {
        hiddenStrengths("situational flexibility and quick strategic pivoting");
    }
    if (categories.includes('Memory') && avgTime < 30) {
        hiddenStrengths("efficient information encoding and retrieval");
    }
    if (categories.includes('Decision Style') && adaptability > 75) {
        hiddenStrengths("adaptive decision-making in uncertain contexts");
    }
    
    const primaryHidden = hiddenStrengths.length > 0 ? hiddenStrengths[0] : "latent pattern recognition abilities";
    const secondaryHidden = hiddenStrengths.length > 1 ? hiddenStrengths[1] : "emerging analytical intuition";
    
    return `Hidden strengths analysis reveals exceptional ${primaryHidden} as your primary latent ability, with ${secondaryHidden} as secondary potential. These strengths emerge from your ${avgTime < 30 ? 'quick processing' : 'deliberate thinking'} combined with ${adaptability > 75 ? 'high adaptability' : 'developing flexibility'}, suggesting untapped potential in ${creativity > 80 ? 'innovative problem domains' : 'analytical challenges requiring novel approaches'}. These hidden abilities become most apparent in ${categories.includes('Stress Response') ? 'high-pressure situations requiring quick adaptation' : 'complex problem-solving scenarios'}.`;
}

function generateOptimalEnvironmentInsight(focus, avgTime, timeArray) {
    const timeVariability = calculateVariance(timeArray);
    const focusLevel = focus > 85 ? "intense focus" : focus > 70 ? "moderate focus" : "developing focus";
    const pacePreference = avgTime < 25 ? "fast-paced" : avgTime < 40 ? "balanced pace" : "deliberate pace";
    
    const environmentType = focus > 80 && timeVariability < 200 ? "structured, low-distraction environment" :
                           focus > 65 && timeVariability < 400 ? "semi-structured environment with minimal interruptions" :
                           "flexible environment with adaptive support systems";
    
    const stimulationLevel = avgTime < 30 ? "moderate stimulation with clear objectives" :
                           "low stimulation with extended concentration periods";
    
    return `Optimal environment analysis indicates you thrive in ${environmentType} with ${stimulationLevel}. Your ${focusLevel} and ${pacePreference} preferences suggest peak performance in ${focus > 80 ? 'quiet, dedicated spaces with minimal context switching' : 'collaborative environments with periodic focused work sessions'}. The ${timeVariability < 300 ? 'consistent response patterns' : 'adaptive response variability'} indicate ${timeVariability < 300 ? 'preference for routine and predictability' : 'flexibility to handle dynamic work conditions'}, making you ideal for ${focus > 75 ? 'deep work requiring sustained concentration' : 'versatile roles requiring adaptability'}.`;
}

// Helper functions for detailed analysis
function analyzeTimeProgression(timeArray) {
    if (timeArray.length < 3) return "limited progression data";
    const firstHalf = timeArray.slice(0, Math.floor(timeArray.length / 2));
    const secondHalf = timeArray.slice(Math.floor(timeArray.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg < firstAvg * 0.9) return "improving speed and efficiency over time";
    if (secondAvg > firstAvg * 1.1) return "increasing deliberation as assessment progressed";
    return "consistent performance throughout the assessment";
}

function analyzePsychologicalCategories(categories, avgAccuracy) {
    const categorySet = [...new Set(categories)];
    if (categorySet.includes('Stress Response')) {
        return `Strong performance in stress-related scenarios (${avgAccuracy.toFixed(1)}% accuracy) indicates emotional resilience.`;
    }
    if (categorySet.includes('Decision Style')) {
        return `Effective decision-making patterns suggest confident judgment and strategic thinking.`;
    }
    return `Balanced performance across diverse psychological domains indicates versatile cognitive abilities.`;
}

function analyzeAccuracyTrend(accuracyArray) {
    if (accuracyArray.length < 3) return "limited trend data";
    const firstHalf = accuracyArray.slice(0, Math.floor(accuracyArray.length / 2));
    const secondHalf = accuracyArray.slice(Math.floor(accuracyArray.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg + 5) return "positive learning curve with improving accuracy";
    if (secondAvg < firstAvg - 5) return "performance fatigue suggesting need for breaks";
    return "stable performance with consistent accuracy levels";
}

function generateResponseTimeAnalysis(timeArray) {
    const avgTime = timeArray.reduce((a, b) => a + b, 0) / timeArray.length;
    const fastest = Math.min(...timeArray);
    const slowest = Math.max(...timeArray);
    const variability = calculateVariance(timeArray);
    
    return `Average: ${avgTime.toFixed(1)}s | Range: ${fastest}s-${slowest}s | Variability: ${variability < 200 ? 'Low' : variability < 500 ? 'Medium' : 'High'}`;
}

function generateAccuracyConsistencyAnalysis(accuracyArray) {
    const avgAccuracy = accuracyArray.reduce((a, b) => a + b, 0) / accuracyArray.length;
    const consistency = calculateVariance(accuracyArray);
    const highPerformance = accuracyArray.filter(a => a > 80).length;
    
    return `Average: ${avgAccuracy.toFixed(1)}% | High scores: ${highPerformance}/${accuracyArray.length} | Consistency: ${consistency < 200 ? 'High' : consistency < 500 ? 'Medium' : 'Low'}`;
}

function generateAdaptationSpeedAnalysis(skipsArray, hesitationArray) {
    const totalSkips = skipsArray.reduce((a, b) => a + b, 0);
    const totalHesitation = hesitationArray.reduce((a, b) => a + b, 0);
    const adaptabilityScore = 100 - (totalSkips * 5) - (totalHesitation * 2);
    
    return `Skips: ${totalSkips} | Hesitations: ${totalHesitation} | Adaptability Score: ${Math.max(0, adaptabilityScore)}/100`;
}

function generateCategoryPerformanceAnalysis(categories, accuracyArray) {
    const categoryScores = {};
    categories.forEach((category, index) => {
        if (!categoryScores[category]) categoryScores[category] = [];
        categoryScores[category].push(accuracyArray[index]);
    });
    
    const categoryAverages = Object.entries(categoryScores).map(([cat, scores]) => ({
        category: cat,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length
    }));
    
    const bestCategory = categoryAverages.reduce((best, current) => current.avg > best.avg ? current : best);
    return `Best: ${bestCategory.category} (${bestCategory.avg.toFixed(1)}%) | Categories: ${categoryAverages.length}`;
}

function generateImmediateActions(avgAccuracy, avgTime, adaptability) {
    const actions = [];
    
    if (avgAccuracy > 80) {
        actions.push("Challenge yourself with advanced problems to maintain growth momentum");
    } else if (avgAccuracy > 65) {
        actions.push("Focus on consistency through daily practice sessions");
    } else {
        actions.push("Build foundational knowledge with structured learning materials");
    }
    
    if (avgTime > 35) {
        actions.push("Practice time management techniques to improve response speed");
    }
    
    if (adaptability > 80) {
        actions.push("Seek diverse learning experiences to leverage your adaptability");
    }
    
    return actions.slice(0, 3);
}

function generateLongtermDevelopment(primaryStyle, creativity, focus) {
    const actions = [];
    
    if (primaryStyle === 'Systems-Oriented') {
        actions.push("Develop expertise in complex system design and architecture");
    } else if (primaryStyle === 'Strategic') {
        actions.push("Build strategic planning and leadership capabilities");
    } else {
        actions.push("Cultivate deep analytical and research skills");
    }
    
    if (creativity > 80) {
        actions.push("Explore innovative problem-solving methodologies");
    }
    
    if (focus > 85) {
        actions.push("Master deep work techniques for complex projects");
    }
    
    return actions.slice(0, 3);
}

function generateSkillEnhancement(avgAccuracy, adaptability, creativity) {
    const actions = [];
    
    if (avgAccuracy > 75) {
        actions.push("Advanced analytical reasoning and critical thinking");
    }
    
    if (adaptability > 75) {
        actions.push("Cross-functional skill development and versatility");
    }
    
    if (creativity > 75) {
        actions.push("Creative problem-solving and innovation techniques");
    }
    
    if (avgAccuracy < 70) {
        actions.push("Foundational skill building and knowledge consolidation");
    }
    
    return actions.slice(0, 3);
}

function skipQuestion() {
    clearInterval(timerInterval);
    const category = questions[currentQuestionIndex]?.category || 'Behavioral';
    recordMetrics(0, true, category);
    currentQuestionIndex += 1;
    if (currentQuestionIndex >= totalQuestions) {
        return completeAssessment();
    }
    const nextQuestion = questions[currentQuestionIndex] || prefetchQuestion(currentQuestionIndex);
    Promise.resolve(nextQuestion).then(question => {
        questions[currentQuestionIndex] = question;
        renderQuestion(question);
        questionStartTime = Date.now();
        updateTimer();
        clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        if (currentQuestionIndex + 1 < totalQuestions) {
            prefetchQuestion(currentQuestionIndex + 1);
        }
    });
}

async function completeAssessment() {
    clearInterval(timerInterval);
    elements.progressFill.style.width = '100%';
    const summary = computeSummary();
    elements.summaryAccuracy.textContent = `${Math.round(summary.avgAccuracy)}%`;
    elements.summarySpeed.textContent = `${Math.max(55, 100 - Math.round(summary.avgTime))}%`;
    elements.summaryAdaptability.textContent = `${summary.adaptability}%`;
    elements.summaryCreativity.textContent = `${summary.creativity}%`;
    
    // Calculate behavioral attributes
    const behavioralAttributes = calculateBehavioralAttributes(summary, userMetrics);
    updateBehavioralStats(behavioralAttributes);
    
    elements.statGrowth.textContent = `${Math.min(99, Math.round(summary.avgAccuracy + 8))}%`;
    elements.statCareer.textContent = `${Math.min(98, 80 + Math.round(summary.avgAccuracy / 10))}%`;
    elements.statLearning.textContent = `${Math.min(100, 60 + Math.round((100 - summary.avgTime) / 2))}%`;
    const profile = await generateProfile(summary);
    elements.profile.textContent = profile.profileText || `${summary.primaryStyle} thinking with strong structural reasoning.`;
    elements.velocity.textContent = profile.learning?.description ? profile.learning.description : `Avg response ${summary.avgTime.toFixed(1)}s, retention ${Math.round(summary.avgAccuracy)}%, transfer ${summary.transferAbility}.`;
    elements.strengths.textContent = profile.insights?.hidden || 'Hidden strength: strategic abstraction and adaptive problem framing.';
    elements.stress.textContent = summary.stressNote;
    elements.insights.textContent = profile.insights?.growth || 'Use high-focus sprints with periodic review for optimal cognitive training.';
    updateMap(profile.map || summary);
    updatePersonality(profile.personality || {
        systems: `Primary tendency: ${summary.primaryStyle} thinking with strong structural reasoning.`,
        empathy: 'Strong human-context awareness and emotional reasoning.',
        analytical: 'Analytical clarity with strong pattern-based judgment.',
        creative: 'Creative problem framing under pressure.'
    });
    updateLearning(profile.learning || {
        mode: summary.learningMode,
        speed: `${Math.max(60, 100 - Math.round(summary.avgTime))}%`,
        retention: `${Math.round(summary.avgAccuracy)}%`,
        transfer: summary.transferAbility,
        description: 'This profile favors iterative practice, vivid examples, and flexible reflection loops.'
    });
    updateInsights(profile.insights || {
        psych: 'You blend analytical rigor with quiet pattern detection, giving you a strong strategic edge.',
        growth: 'Focus on alternating creative ideation with structured execution cycles.',
        hidden: 'Hidden tendency: adaptability under uncertain conditions.',
        environment: 'Best environment: energizing low-distraction spaces with clear milestones.'
    });
    showPage('insights');
}

function calculateBehavioralAttributes(summary, metrics) {
    const { avgAccuracy, avgTime, adaptability, creativity, focus } = summary;
    const { accuracy, timeTaken, skips, hesitation, categories } = metrics;
    
    // Resilience: Based on consistency and recovery from mistakes
    const resilience = calculateResilience(accuracy, hesitation, avgTime);
    
    // Decision Clarity: Based on accuracy and response time consistency
    const decisionClarity = calculateDecisionClarity(accuracy, timeTaken, skips);
    
    // Emotional Balance: Based on performance under pressure and time patterns
    const emotionalBalance = calculateEmotionalBalance(timeTaken, hesitation, categories);
    
    // Growth Mindset: Based on improvement patterns and adaptability
    const growthMindset = calculateGrowthMindset(accuracy, adaptability, timeTaken);
    
    // Social Intelligence: Based on empathy-related categories and strategic skipping
    const socialIntelligence = calculateSocialIntelligence(categories, skips, avgAccuracy);
    
    return {
        resilience,
        decisionClarity,
        emotionalBalance,
        growthMindset,
        socialIntelligence
    };
}

function calculateResilience(accuracyArray, hesitationArray, avgTime) {
    const avgAccuracy = accuracyArray.reduce((a, b) => a + b, 0) / accuracyArray.length;
    const consistency = 1 - (calculateVariance(accuracyArray) / 10000); // Normalize variance
    const hesitationPenalty = hesitationArray.reduce((a, b) => a + b, 0) / accuracyArray.length * 10;
    const timeBonus = avgTime < 30 ? 10 : avgTime < 45 ? 5 : 0;
    
    const resilience = Math.min(100, Math.max(0, 
        avgAccuracy * 0.4 + consistency * 100 * 0.4 + timeBonus - hesitationPenalty
    ));
    
    return Math.round(resilience);
}

function calculateDecisionClarity(accuracyArray, timeArray, skipArray) {
    const avgAccuracy = accuracyArray.reduce((a, b) => a + b, 0) / accuracyArray.length;
    const avgTime = timeArray.reduce((a, b) => a + b, 0) / timeArray.length;
    const timeConsistency = 1 - (calculateVariance(timeArray) / 1000); // Normalize time variance
    const totalSkips = skipArray.reduce((a, b) => a + b, 0);
    const skipPenalty = Math.min(20, totalSkips * 3);
    
    const decisionClarity = Math.min(100, Math.max(0,
        avgAccuracy * 0.5 + timeConsistency * 100 * 0.3 + (avgTime < 35 ? 20 : 10) - skipPenalty
    ));
    
    return Math.round(decisionClarity);
}

function calculateEmotionalBalance(timeArray, hesitationArray, categories) {
    const avgTime = timeArray.reduce((a, b) => a + b, 0) / timeArray.length;
    const totalHesitation = hesitationArray.reduce((a, b) => a + b, 0);
    const timeStability = 1 - (calculateVariance(timeArray) / 1000);
    
    // Check for stress-related categories
    const hasStressCategories = categories.includes('Stress Response');
    const stressBonus = hasStressCategories && totalHesitation < 2 ? 15 : 0;
    
    const emotionalBalance = Math.min(100, Math.max(0,
        timeStability * 100 * 0.4 + (avgTime < 40 ? 30 : 20) + 
        (totalHesitation === 0 ? 20 : Math.max(0, 20 - totalHesitation * 5)) + stressBonus
    ));
    
    return Math.round(emotionalBalance);
}

function calculateGrowthMindset(accuracyArray, adaptability, timeArray) {
    const avgAccuracy = accuracyArray.reduce((a, b) => a + b, 0) / accuracyArray.length;
    const improvement = calculateImprovementTrend(accuracyArray);
    const avgTime = timeArray.reduce((a, b) => a + b, 0) / timeArray.length;
    
    const growthMindset = Math.min(100, Math.max(0,
        avgAccuracy * 0.3 + adaptability * 0.3 + improvement * 100 * 0.2 + 
        (avgTime < 35 ? 20 : 10)
    ));
    
    return Math.round(growthMindset);
}

function calculateSocialIntelligence(categories, skipArray, avgAccuracy) {
    const hasDecisionCategories = categories.includes('Decision Style');
    const hasMemoryCategories = categories.includes('Memory');
    const totalSkips = skipArray.reduce((a, b) => a + b, 0);
    
    // Strategic skipping can indicate social awareness (knowing when to seek help)
    const strategicSkipping = totalSkips > 0 && totalSkips < 3 ? 15 : 0;
    const categoryBonus = (hasDecisionCategories ? 10 : 0) + (hasMemoryCategories ? 5 : 0);
    
    const socialIntelligence = Math.min(100, Math.max(0,
        avgAccuracy * 0.4 + strategicSkipping + categoryBonus + 25
    ));
    
    return Math.round(socialIntelligence);
}

function calculateImprovementTrend(accuracyArray) {
    if (accuracyArray.length < 3) return 0;
    
    const firstHalf = accuracyArray.slice(0, Math.floor(accuracyArray.length / 2));
    const secondHalf = accuracyArray.slice(Math.floor(accuracyArray.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return Math.max(-0.2, Math.min(0.2, (secondAvg - firstAvg) / 100));
}

function updateBehavioralStats(attributes) {
    elements.statResilience.textContent = attributes.resilience;
    elements.statDecisionClarity.textContent = attributes.decisionClarity;
    elements.statEmotionalBalance.textContent = attributes.emotionalBalance;
    elements.statGrowthMindset.textContent = attributes.growthMindset;
    elements.statSocialIntelligence.textContent = attributes.socialIntelligence;
}

async function checkBackend() {
    try {
        const response = await fetch('/health');
        return response.ok;
    } catch (error) {
        return false;
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    elements.totalQuestions.textContent = totalQuestions;
    startNavigation();
    loadProfileName();
    elements.profileSaveButton.addEventListener('click', () => {
        saveProfileName(elements.profileNameInput.value);
        const storedProfile = loadStoredProfile();
        if (storedProfile) {
            applyStoredProfile(storedProfile);
            elements.summaryStatus.textContent = `Loaded saved profile for ${currentProfileName}.`;
        }
    });
    const storedProfile = loadStoredProfile();
    if (storedProfile) {
        applyStoredProfile(storedProfile);
    }
    if (elements.heroWelcome) {
        elements.heroWelcome.textContent = `Welcome, ${currentProfileName}`;
    }
    if (elements.startAssessmentButton) {
        elements.startAssessmentButton.addEventListener('click', resetAssessment);
    }
    backendAvailable = await checkBackend();
    const statusText = backendAvailable ? 'Backend ready. Gemini proxy connected.' : 'Backend unavailable. Using fallback questions.';
    elements.summaryStatus.textContent = storedProfile ? `Loaded saved profile for ${currentProfileName}. ${statusText}` : statusText;
    elements.liveStatus.textContent = backendAvailable ? 'Backend connected. Assessment is ready.' : 'Backend offline. Fallback mode active.';
    showPage('overview');
});
