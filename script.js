// 获取DOM元素
const textInput = document.getElementById('text-input');
const charCount = document.getElementById('char-count');
const readBtn = document.getElementById('read-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const configBtn = document.getElementById('config-btn');
const generateBtn = document.getElementById('generate-btn');
const generateQuestionsBtn = document.getElementById('generate-questions-btn');
const clearQuestionsBtn = document.getElementById('clear-questions-btn');
const speedSlider = document.getElementById('speed');
const speedValue = document.getElementById('speed-value');
const statusText = document.getElementById('status-text');
const statusBar = document.getElementById('status-bar');
const voiceRadios = document.querySelectorAll('input[name="voice"]');
const voiceGenderRadios = document.querySelectorAll('input[name="voice-gender"]');
const difficultySelect = document.getElementById('difficulty');
const themeSelect = document.getElementById('theme-select');
const ieltsScenarioSelect = document.getElementById('ielts-scenario');
const questionTypeSelect = document.getElementById('question-type');
const questionCountSelect = document.getElementById('question-count');
const questionsSection = document.getElementById('questions-section');
const questionsContainer = document.getElementById('questions-container');

// 配置弹窗元素
const modal = document.getElementById('config-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const apiProviderSelect = document.getElementById('api-provider');
const apiKeyInput = document.getElementById('api-key');
const savedKeysSelect = document.getElementById('saved-keys');
const deleteKeyBtn = document.getElementById('delete-key-btn');
const togglePasswordBtn = document.getElementById('toggle-password');

// 语音合成对象
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isPaused = false;

// 初始化
function init() {
    loadVoices();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    speedSlider.addEventListener('input', function() {
        speedValue.textContent = this.value + 'x';
    });
    
    readBtn.addEventListener('click', startReading);
    pauseBtn.addEventListener('click', pauseReading);
    stopBtn.addEventListener('click', stopReading);
    configBtn.addEventListener('click', openConfigModal);
    generateBtn.addEventListener('click', generateText);
    generateQuestionsBtn.addEventListener('click', generateQuestions);

    if (clearQuestionsBtn) {
        clearQuestionsBtn.addEventListener('click', clearQuestions);
    }

    textInput.addEventListener('input', updateCharCount);
    updateCharCount();
    
    closeModalBtn.addEventListener('click', closeConfigModal);
    cancelBtn.addEventListener('click', closeConfigModal);
    saveBtn.addEventListener('click', saveConfig);
    deleteKeyBtn.addEventListener('click', deleteSavedKey);
    togglePasswordBtn.addEventListener('click', togglePassword);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeConfigModal();
        }
    });
    
    savedKeysSelect.addEventListener('change', function() {
        const selectedKey = this.value;
        if (selectedKey) {
            const [provider, name] = selectedKey.split('|');
            apiProviderSelect.value = provider;
            apiKeyInput.value = name;
        }
    });

    difficultySelect.addEventListener('change', updateQuestionCountOptions);

    loadSavedConfigs();
    updateQuestionCountOptions();
    updateStatus('准备就绪');
}

// 加载可用语音
function loadVoices() {
    const voices = speechSynthesis.getVoices();
    
    const usVoice = voices.find(v => v.lang === 'en-US');
    const gbVoice = voices.find(v => v.lang === 'en-GB');
    
    if (!usVoice && !gbVoice) {
        updateStatus('警告: 未检测到英文语音', 'warning');
    }
}

// 开始朗读
function startReading() {
    const text = textInput.value.trim();
    
    if (!text) {
        updateStatus('请先输入要朗读的英文文本', 'warning');
        return;
    }
    
    if (isPaused && speechSynthesis.paused) {
        speechSynthesis.resume();
        isPaused = false;
        pauseBtn.innerHTML = '<span class="btn-icon">⏸️</span> 暂停';
        updateStatus('正在朗读...');
        textInput.classList.add('reading');
        return;
    }
    
    if (speechSynthesis.speaking) {
        stopReading();
    }
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    const selectedVoice = document.querySelector('input[name="voice"]:checked').value;
    const selectedGender = document.querySelector('input[name="voice-gender"]:checked').value;
    const voices = speechSynthesis.getVoices();
    
    let filteredVoices = voices.filter(v => v.lang === selectedVoice);
    
    if (selectedGender === 'female') {
        filteredVoices = filteredVoices.filter(v => 
            v.name.includes('Female') || v.name.includes('female') || 
            v.name.includes('Zira') || v.name.includes('Victoria') || 
            v.name.includes('Samantha') || v.name.includes('Moira') ||
            v.name.includes('Google US English') ||
            v.name.includes('Google UK English Female')
        );
    } else {
        filteredVoices = filteredVoices.filter(v => 
            !v.name.includes('Female') && !v.name.includes('female') &&
            v.name !== 'Zira' && v.name !== 'Victoria' &&
            v.name !== 'Samantha' && v.name !== 'Moira' &&
            !v.name.includes('Google UK English Female')
        );
    }
    
    if (filteredVoices.length > 0) {
        currentUtterance.voice = filteredVoices[0];
    } else {
        const defaultVoice = voices.find(v => v.lang === selectedVoice);
        if (defaultVoice) {
            currentUtterance.voice = defaultVoice;
        }
    }
    currentUtterance.lang = selectedVoice;
    currentUtterance.rate = parseFloat(speedSlider.value);
    
    currentUtterance.onstart = function() {
        updateStatus('正在朗读...');
        readBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        textInput.classList.add('reading');
    };
    
    currentUtterance.onend = function() {
        updateStatus('朗读完成');
        readBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        textInput.classList.remove('reading');
        isPaused = false;
    };
    
    currentUtterance.onerror = function(event) {
        console.error('朗读错误:', event.error);
        updateStatus('朗读出错: ' + getErrorMessage(event.error), 'error');
        readBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        textInput.classList.remove('reading');
    };
    
    speechSynthesis.speak(currentUtterance);
}

// 暂停/继续朗读
function pauseReading() {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        isPaused = true;
        pauseBtn.innerHTML = '<span class="btn-icon">▶️</span> 继续';
        updateStatus('已暂停');
        textInput.classList.remove('reading');
    } else if (isPaused) {
        speechSynthesis.resume();
        isPaused = false;
        pauseBtn.innerHTML = '<span class="btn-icon">⏸️</span> 暂停';
        updateStatus('正在朗读...');
        textInput.classList.add('reading');
    }
}

// 停止朗读
function stopReading() {
    speechSynthesis.cancel();
    isPaused = false;
    pauseBtn.innerHTML = '<span class="btn-icon">⏸️</span> 暂停';
    updateStatus('已停止');
    readBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
    textInput.classList.remove('reading');
}

// 更新状态
function updateStatus(message, type = 'info') {
    statusText.textContent = message;

    statusBar.className = 'status-bar';
    if (type === 'error') {
        statusBar.style.borderColor = 'var(--error)';
        statusBar.style.background = 'rgba(239, 68, 68, 0.1)';
        statusBar.style.color = 'var(--error)';
    } else if (type === 'warning') {
        statusBar.style.borderColor = 'var(--warning)';
        statusBar.style.background = 'rgba(245, 158, 11, 0.1)';
        statusBar.style.color = 'var(--warning)';
    } else if (type === 'success') {
        statusBar.style.borderColor = 'var(--success)';
        statusBar.style.background = 'rgba(16, 185, 129, 0.1)';
        statusBar.style.color = 'var(--success)';
    } else {
        statusBar.style.borderColor = 'var(--neutral-200)';
        statusBar.style.background = 'var(--neutral-100)';
        statusBar.style.color = 'var(--neutral-600)';
    }
}

// 更新字符计数
function updateCharCount() {
    const count = textInput.value.length;
    charCount.textContent = `${count} 字符`;
}

// 根据难度级别更新题目数量选项的可用性
function updateQuestionCountOptions() {
    const difficulty = difficultySelect.value;
    const options = questionCountSelect.options;

    for (let i = 0; i < options.length; i++) {
        options[i].disabled = false;
        options[i].text = options[i].text.replace(/\s*\(需要[^\)]+\)/, '');
    }

    if (difficulty === 'beginner' || difficulty === 'intermediate') {
        options[1].disabled = true;
        options[2].disabled = true;
        options[1].text = '10 道题 (需要高级)';
        options[2].text = '15 道题 (需要母语)';
        if (questionCountSelect.value === '10' || questionCountSelect.value === '15') {
            questionCountSelect.value = '5';
        }
    } else if (difficulty === 'advanced') {
        options[2].disabled = true;
        options[2].text = '15 道题 (需要母语)';
        if (questionCountSelect.value === '15') {
            questionCountSelect.value = '10';
        }
    }
}

// 清除题目
function clearQuestions() {
    questionsContainer.innerHTML = '';
    questionsSection.style.display = 'none';
    currentQuestions = [];
    updateStatus('题目已清除');
}

// 获取错误信息
function getErrorMessage(error) {
    const errorMessages = {
        'canceled': '朗读已取消',
        'interrupted': '朗读被中断',
        'interrupted-by-error': '朗读因错误被中断',
        'not-allowed': '不允许朗读',
        'network': '网络错误',
        'synthesis-unavailable': '语音合成不可用',
        'voice-unavailable': '语音不可用',
        'text-too-long': '文本过长'
    };
    
    return errorMessages[error] || '未知错误';
}

// 页面卸载时停止朗读
window.addEventListener('beforeunload', function() {
    stopReading();
});

// ========== 配置弹窗相关函数 ==========

function openConfigModal() {
    modal.classList.add('show');
    loadSavedConfigs();
}

function closeConfigModal() {
    modal.classList.remove('show');
    if (apiKeyInput) {
        apiKeyInput.value = '';
    }
}

function togglePassword() {
    if (apiKeyInput && apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        togglePasswordBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        `;
    } else if (apiKeyInput) {
        apiKeyInput.type = 'password';
        togglePasswordBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
    }
}

function saveConfig() {
    const provider = apiProviderSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        updateStatus('请输入API Key', 'error');
        return;
    }

    const savedConfigs = getSavedConfigs();
    const keyName = `sk-${apiKey.substring(3, 7)}...`;
    savedConfigs.push({
        provider: provider,
        name: keyName,
        fullKey: apiKey,
        timestamp: Date.now()
    });

    localStorage.setItem('apiConfigs', JSON.stringify(savedConfigs));

    localStorage.setItem('currentConfig', JSON.stringify({
        provider: provider,
        apiKey: apiKey
    }));

    updateStatus('配置已保存', 'success');
    loadSavedConfigs();
    closeConfigModal();
}

function deleteSavedKey() {
    const selectedKey = savedKeysSelect.value;
    if (!selectedKey) {
        updateStatus('请先选择要删除的Key', 'warning');
        return;
    }

    if (confirm('确定要删除这个配置吗?')) {
        const savedConfigs = getSavedConfigs();
        const [provider, name] = selectedKey.split('|');
        const index = savedConfigs.findIndex(
            c => c.provider === provider && c.name === name
        );

        if (index > -1) {
            savedConfigs.splice(index, 1);
            localStorage.setItem('apiConfigs', JSON.stringify(savedConfigs));
            loadSavedConfigs();
            updateStatus('配置已删除', 'success');
        }
    }
}

function getSavedConfigs() {
    const saved = localStorage.getItem('apiConfigs');
    return saved ? JSON.parse(saved) : [];
}

function loadSavedConfigs() {
    const savedConfigs = getSavedConfigs();
    
    savedKeysSelect.innerHTML = '<option value="">选择已保存的配置</option>';
    savedConfigs.forEach(config => {
        const option = document.createElement('option');
        option.value = `${config.provider}|${config.name}`;
        option.textContent = `${config.provider.toUpperCase()} - ${config.name}`;
        savedKeysSelect.appendChild(option);
    });
    
    const currentConfig = localStorage.getItem('currentConfig');
    if (currentConfig) {
        const config = JSON.parse(currentConfig);
        apiProviderSelect.value = config.provider;
        apiKeyInput.value = config.apiKey;
    }
}

// ========== 文本生成相关函数 ==========

async function generateText() {
    const theme = themeSelect.value;
    const difficulty = difficultySelect.value;
    const ieltsScenario = ieltsScenarioSelect.value;
    const isIELTS = ieltsScenario && ieltsScenario !== 'general';

    if (generateBtn.disabled) {
        updateStatus('正在生成中，请稍候...', 'warning');
        return;
    }

    const currentConfig = localStorage.getItem('currentConfig');

    if (!currentConfig) {
        updateStatus('请先配置 API Key', 'error');
        openConfigModal();
        return;
    }

    const config = JSON.parse(currentConfig);
    const provider = config.provider;
    const apiKey = config.apiKey;

    const difficultyLevels = {
        beginner: 'elementary school level',
        intermediate: 'middle school level',
        advanced: 'college level',
        native: 'native English speaker level'
    };

    const themeDescriptions = {
        story: 'stories and narratives',
        news: 'news articles',
        conversation: 'everyday conversations',
        learning: 'educational content',
        essay: 'short essays',
        science: 'scientific topics',
        technology: 'technology and innovation',
        culture: 'cultural topics',
        business: 'business and professional contexts',
        daily: 'daily life situations'
    };

    const scenarioDescriptions = {
        'introduction': 'introduction and monologue',
        'group-discussion': 'group discussion',
        'tutorial': 'tutorial and seminar',
        'lecture': 'academic lecture'
    };

    const allThemes = ['story', 'news', 'conversation', 'learning', 'essay', 'science', 'technology', 'culture', 'business', 'daily'];
    const finalTheme = theme === 'random' ?
        allThemes[Math.floor(Math.random() * allThemes.length)] :
        theme;

    const finalThemeDesc = themeDescriptions[finalTheme] || finalTheme;
    const difficultyDesc = difficultyLevels[difficulty] || difficulty;
    const finalScenarioDesc = scenarioDescriptions[ieltsScenario] || ieltsScenario;

    updateStatus('正在生成文本...', 'info');
    generateBtn.disabled = true;

    try {
        let systemPrompt = '';
        let userPrompt = '';
        let url = '';
        let headers = {};
        let requestData = {};

        const lengthRequirement = isIELTS ? 
            (difficulty === 'beginner' ? '160-240' : difficulty === 'intermediate' ? '300-400' : difficulty === 'advanced' ? '440-560' : '600-800') :
            (difficulty === 'beginner' ? '100-160' : difficulty === 'intermediate' ? '200-300' : difficulty === 'advanced' ? '360-440' : '500-700');

        // 构建提示词
        systemPrompt = `You are an English listening practice material generator. Generate ONE English text about ${finalThemeDesc}. Word count: EXACTLY ${lengthRequirement} words. Use ${difficultyDesc} vocabulary and grammar. Do NOT repeat same information. Do NOT generate multiple similar texts. Do NOT include any explanations, meta-commentary, or "Here is text". Output ONLY the text itself, nothing else.`;

        if (isIELTS) {
            systemPrompt += ` This is an IELTS listening text for ${finalScenarioDesc} scenario.`;
            userPrompt = `Generate an IELTS-style English text about ${finalThemeDesc}. CRITICAL: Word count MUST be EXACTLY ${lengthRequirement} words. This is ${finalScenarioDesc}. STRICT REQUIREMENTS: (1) Generate ONLY ONE text, (2) Do NOT repeat content, (3) Make it suitable for IELTS listening practice, (4) Do NOT include any intro/outro text, (5) Output ONLY the text.`;
        } else {
            userPrompt = `Generate an English text about ${finalThemeDesc}. CRITICAL: Word count MUST be EXACTLY ${lengthRequirement} words. STRICT REQUIREMENTS: (1) Generate ONLY ONE text, (2) Do NOT repeat content, (3) Make it interesting and suitable for listening practice, (4) Do NOT include any intro/outro text, (5) Output ONLY the text.`;
        }

        // 根据提供商调用 API
        switch (provider) {
            case 'deepseek':
                url = 'https://api.deepseek.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestData = {
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                };
                break;

            case 'zhipu':
                url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestData = {
                    model: 'glm-4',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                };
                break;

            case 'baidu':
                url = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro';
                headers = {
                    'Content-Type': 'application/json'
                };
                requestData = {
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_output_tokens: 2000
                };
                url += `?access_token=${apiKey}`;
                break;

            case 'qwen':
                url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestData = {
                    model: 'qwen-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                };
                break;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || '生成失败');
        }

        const data = await response.json();
        let generatedText = '';

        if (provider === 'deepseek' || provider === 'zhipu' || provider === 'qwen') {
            generatedText = data.choices[0].message.content;
        } else if (provider === 'baidu') {
            generatedText = data.result;
        }

        generatedText = generatedText.trim();
        if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
            generatedText = generatedText.slice(1, -1);
        }

        textInput.value = generatedText;
        updateStatus('文本生成成功!', 'success');
        
    } catch (error) {
        console.error('生成错误:', error);
        updateStatus('生成失败: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
    }
}

// ========== 雅思题目生成相关函数 ==========

let currentQuestions = [];

async function generateQuestions() {
    const text = textInput.value.trim();

    if (!text) {
        updateStatus('请先生成或输入英文文本', 'warning');
        return;
    }

    if (generateQuestionsBtn.disabled) {
        updateStatus('正在生成中，请稍候...', 'warning');
        return;
    }

    if (text.length > 10000) {
        updateStatus('文本过长，请缩短后重新生成', 'error');
        return;
    }

    const difficulty = difficultySelect.value;
    const ieltsScenario = ieltsScenarioSelect.value;
    const questionCount = parseInt(questionCountSelect.value);
    
    if (difficulty === 'beginner') {
        updateStatus('⚠️ 雅思题目需要中级或以上难度才能生成', 'warning');
        
        const confirmUpgrade = confirm(
            '当前难度为初级，雅思题目需要中级或以上难度。\n\n' +
            '是否自动切换到中级难度？'
        );
        
        if (confirmUpgrade) {
            difficultySelect.value = 'intermediate';
            updateStatus('已切换到中级难度，请重新点击生成雅思题', 'info');
        }
        return;
    }
    
    const questionType = questionTypeSelect.value;
    const difficultyLabels = {
        beginner: '初级',
        intermediate: '中级',
        advanced: '高级',
        native: '母语水平'
    };
    
    const scenarioLabels = {
        'introduction': '介绍说明类',
        'group-discussion': '小组讨论',
        'tutorial': '师生讨论',
        'lecture': '学术讲座'
    };
    
    const questionTypeLabels = {
        'all': '全部题型',
        'multiple-choice': '选择题',
        'fill-blanks': '填空题'
    };
    
    const scenarioInfo = scenarioLabels[ieltsScenario] || ieltsScenario;
    updateStatus(`正在生成${scenarioInfo}${difficultyLabels[difficulty]}雅思${questionTypeLabels[questionType]}...`, 'info');
    generateQuestionsBtn.disabled = true;

    try {
        const currentConfig = localStorage.getItem('currentConfig');

        if (!currentConfig) {
            updateStatus('请先配置 API Key', 'error');
            openConfigModal();
            return;
        }

        const config = JSON.parse(currentConfig);
        const provider = config.provider;
        const apiKey = config.apiKey;

        let promptContent = '';
        const scenarioContext = ieltsScenario ? `\nThis text is from "${ieltsScenario}" scenario.` : '';

        if (questionType === 'multiple-choice') {
            promptContent = `Based on following English text, generate ${questionCount} IELTS-style multiple-choice listening comprehension questions. Each question must have 4 options (A, B, C, D).\n\nText:\n${text}\n${scenarioContext}\n\nFormat your response as a JSON array:\n[\n  {\n    "type": "multiple-choice",\n    "question": "Your question text",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "correctAnswer": 0,\n    "explanation": "Brief explanation"\n  }\n]\n\nImportant:\n- correctAnswer should be 0 for A, 1 for B, 2 for C, 3 for D\n- Return ONLY JSON array, no other text`;

        } else if (questionType === 'fill-blanks') {
            promptContent = `Based on following English text, generate ${questionCount} IELTS-style fill-in-the-blank listening comprehension questions.\n\nText:\n${text}\n${scenarioContext}\n\nFormat your response as a JSON array:\n[\n  {\n    "type": "fill-blanks",\n    "question": "Your question with blank (use _____ for blank)",\n    "correctAnswer": "The exact word or phrase",\n    "explanation": "Brief explanation"\n  }\n]\n\nImportant:\n- Use _____ to indicate blank in question\n- Return ONLY JSON array, no other text`;

        } else {
            const mcCount = Math.ceil(questionCount * 0.6);
            const fbCount = questionCount - mcCount;
            promptContent = `Based on following English text, generate ${questionCount} IELTS-style listening comprehension questions.\n\nText:\n${text}\n${scenarioContext}\n\nGenerate approximately ${mcCount} multiple-choice questions and ${fbCount} fill-in-the-blank questions.\n\nFormat your response as a JSON array with mixed types.\n- Return ONLY JSON array, no other text`;
        }

        let systemPrompt = 'You are an expert IELTS examiner specializing in creating listening comprehension questions. Generate high-quality, challenging questions based on given text.';

        let url = '';
        let headers = {};
        let requestData = {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: promptContent }
            ],
            temperature: 0.7,
            max_tokens: 1800
        };

        switch (provider) {
            case 'deepseek':
                url = 'https://api.deepseek.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestData.model = 'deepseek-chat';
                break;

            case 'zhipu':
                url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestData.model = 'glm-4';
                break;

            case 'baidu':
                url = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro';
                headers = {
                    'Content-Type': 'application/json'
                };
                requestData.model = 'ernie-4.0-8k';
                requestData.max_output_tokens = 1800;
                url += `?access_token=${apiKey}`;
                break;

            case 'qwen':
                url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };
                requestData.model = 'qwen-turbo';
                break;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || '生成题目失败');
        }

        const data = await response.json();
        let questionsText = '';

        if (provider === 'deepseek' || provider === 'zhipu' || provider === 'qwen') {
            questionsText = data.choices[0].message.content;
        } else if (provider === 'baidu') {
            questionsText = data.result;
        }

        questionsText = questionsText.trim();

        if (questionsText.startsWith('```json')) {
            questionsText = questionsText.slice(7);
        } else if (questionsText.startsWith('```')) {
            questionsText = questionsText.slice(3);
        }
        if (questionsText.endsWith('```')) {
            questionsText = questionsText.slice(0, -3);
        }
        questionsText = questionsText.trim();

        let questions;
        try {
            questions = JSON.parse(questionsText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError.message);
            const jsonMatch = questionsText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                try {
                    questions = JSON.parse(jsonMatch[0]);
                } catch (e) {
                    throw new Error('无法解析AI返回的题目数据');
                }
            } else {
                throw new Error('无法解析AI返回的题目数据');
            }
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('生成的题目格式不正确');
        }

        questions = questions.filter(q => {
            if (!q.question || !q.type) return false;

            if (q.type === 'multiple-choice') {
                return Array.isArray(q.options) &&
                       q.options.length === 4 &&
                       typeof q.correctAnswer === 'number' &&
                       q.correctAnswer >= 0 &&
                       q.correctAnswer <= 3;
            } else if (q.type === 'fill-blanks') {
                return q.correctAnswer &&
                       typeof q.correctAnswer === 'string' &&
                       q.correctAnswer.trim().length > 0;
            }

            return false;
        });

        if (questions.length === 0) {
            throw new Error('未能生成有效的题目');
        }

        const finalQuestions = questions.slice(0, questionCount);

        currentQuestions = [];
        currentQuestions = finalQuestions;
        displayQuestions(currentQuestions);
        questionsSection.style.display = 'block';
        updateStatus(`雅思题目生成成功！共 ${finalQuestions.length} 道题`, 'success');

        setTimeout(() => {
            questionsSection.scrollIntoView({ behavior: 'smooth' });
        }, 300);
        
    } catch (error) {
        console.error('生成题目错误:', error);
        updateStatus('生成题目失败: ' + error.message, 'error');
    } finally {
        generateQuestionsBtn.disabled = false;
    }
}

function displayQuestions(questions) {
    questionsContainer.innerHTML = '';
    
    questions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-item';
        questionDiv.dataset.index = index;
        questionDiv.dataset.type = q.type || 'multiple-choice';
        
        const questionNumber = document.createElement('div');
        questionNumber.className = 'question-number';
        const typeLabel = q.type === 'fill-blanks' ? '📝 填空' : '❓ 选择';
        questionNumber.textContent = `${typeLabel} Question ${index + 1}`;
        
        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = q.question;
        
        questionDiv.appendChild(questionNumber);
        questionDiv.appendChild(questionText);
        
        if (q.type === 'fill-blanks') {
            const answerInput = document.createElement('div');
            answerInput.className = 'fill-blank-answer';
            
            const inputLabel = document.createElement('label');
            inputLabel.textContent = '您的答案: ';
            
            const inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'blank-input';
            inputField.placeholder = '在此输入答案...';
            inputField.dataset.questionIndex = index;
            
            inputField.addEventListener('input', (e) => {
                currentQuestions[index].userAnswer = e.target.value.trim();
            });
            
            answerInput.appendChild(inputLabel);
            answerInput.appendChild(inputField);
            questionDiv.appendChild(answerInput);
        } else {
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'question-options';
            
            const optionLabels = ['A', 'B', 'C', 'D'];
            q.options.forEach((option, optIndex) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'option-item';
                optionDiv.dataset.option = optIndex;
                
                const optionLabel = document.createElement('div');
                optionLabel.className = 'option-label';
                optionLabel.textContent = optionLabels[optIndex];
                
                const optionText = document.createElement('div');
                optionText.className = 'option-text';
                optionText.textContent = option;
                
                optionDiv.appendChild(optionLabel);
                optionDiv.appendChild(optionText);
                
                optionDiv.addEventListener('click', () => selectOption(index, optIndex));
                
                optionsDiv.appendChild(optionDiv);
            });
            
            questionDiv.appendChild(optionsDiv);
        }
        
        questionsContainer.appendChild(questionDiv);
    });
    
    const checkBtn = document.createElement('button');
    checkBtn.className = 'check-answers-btn';
    checkBtn.textContent = '✓ 检查答案';
    checkBtn.addEventListener('click', checkAnswers);
    questionsContainer.appendChild(checkBtn);
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-display';
    scoreDiv.id = 'score-display';
    scoreDiv.innerHTML = `
        <div>您的得分</div>
        <div class="score-number" id="score-number">0/0</div>
        <div class="score-message" id="score-message"></div>
    `;
    questionsContainer.appendChild(scoreDiv);
}

function selectOption(questionIndex, optionIndex) {
    const questionDiv = document.querySelector(`.question-item[data-index="${questionIndex}"]`);
    const options = questionDiv.querySelectorAll('.option-item');
    options.forEach(opt => opt.classList.remove('selected'));
    
    const selectedOption = questionDiv.querySelector(`.option-item[data-option="${optionIndex}"]`);
    selectedOption.classList.add('selected');
    
    if (!currentQuestions[questionIndex].userAnswer) {
        currentQuestions[questionIndex].userAnswer = optionIndex;
    } else {
        currentQuestions[questionIndex].userAnswer = optionIndex;
    }
}

function checkAnswers() {
    let correctCount = 0;
    const totalQuestions = currentQuestions.length;
    
    currentQuestions.forEach((q, index) => {
        const questionDiv = document.querySelector(`.question-item[data-index="${index}"]`);
        const questionType = questionDiv.dataset.type;
        
        if (questionType === 'fill-blanks') {
            const inputField = questionDiv.querySelector('.blank-input');
            const userAnswer = q.userAnswer ? q.userAnswer.trim() : '';
            const correctAnswer = q.correctAnswer.trim();

            if (questionDiv.querySelector('.result-message')) {
                questionDiv.querySelector('.result-message').remove();
            }

            if (!userAnswer || userAnswer.length === 0) {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'result-message wrong';
                resultDiv.innerHTML = `
                    <span>✗ 错误</span>
                    <span>请先输入答案</span>
                    <span>正确答案: ${q.correctAnswer}</span>
                `;
                questionDiv.appendChild(resultDiv);
            } else {
                const userAnswerLower = userAnswer.toLowerCase();
                const correctAnswerLower = correctAnswer.toLowerCase();
                const isCorrect = userAnswerLower === correctAnswerLower ||
                                userAnswerLower.includes(correctAnswerLower) ||
                                correctAnswerLower.includes(userAnswerLower);

                const resultDiv = document.createElement('div');
                resultDiv.className = 'result-message ' + (isCorrect ? 'correct' : 'wrong');
                resultDiv.innerHTML = `
                    <span>${isCorrect ? '✓ 正确!' : '✗ 错误'}</span>
                    <span>正确答案: ${q.correctAnswer}</span>
                `;
                questionDiv.appendChild(resultDiv);

                if (isCorrect) correctCount++;
            }
            
        } else {
            const options = questionDiv.querySelectorAll('.option-item');
            
            options.forEach((opt, optIndex) => {
                opt.classList.remove('correct-answer', 'wrong-answer');
                
                if (optIndex === q.correctAnswer) {
                    opt.classList.add('correct-answer');
                } else if (q.userAnswer !== undefined && optIndex === q.userAnswer && optIndex !== q.correctAnswer) {
                    opt.classList.add('wrong-answer');
                }
            });
            
            if (q.userAnswer === q.correctAnswer) {
                correctCount++;
            }
        }
        
        if (!questionDiv.querySelector('.explanation')) {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'explanation';
            let answerText = '';
            if (questionType === 'fill-blanks') {
                answerText = q.correctAnswer;
            } else {
                answerText = ['A', 'B', 'C', 'D'][q.correctAnswer];
            }
            explanationDiv.innerHTML = `
                <div class="explanation-text">
                    <strong>解析：</strong>${q.explanation || '正确答案是 ' + answerText}
                </div>
            `;
            questionDiv.appendChild(explanationDiv);
        }
        
        setTimeout(() => {
            const explanation = questionDiv.querySelector('.explanation');
            if (explanation) explanation.classList.add('show');
        }, index * 100);
    });
    
    const scoreDisplay = document.getElementById('score-display');
    const scoreNumber = document.getElementById('score-number');
    const scoreMessage = document.getElementById('score-message');
    
    const percentage = (correctCount / totalQuestions) * 100;
    scoreNumber.textContent = `${correctCount}/${totalQuestions}`;
    
    if (percentage === 100) {
        scoreMessage.textContent = '🎉 完美！您全部答对了！';
    } else if (percentage >= 80) {
        scoreMessage.textContent = '👏 太棒了！您的表现非常出色！';
    } else if (percentage >= 60) {
        scoreMessage.textContent = '💪 继续努力，您做得不错！';
    } else if (percentage >= 40) {
        scoreMessage.textContent = '📚 建议多听几遍，再试试看！';
    } else {
        scoreMessage.textContent = '🔁 建议反复听力练习，加油！';
    }
    
    scoreDisplay.classList.add('show');
    updateStatus(`您的得分: ${correctCount}/${totalQuestions}`, 'success');
}

init();
