// 获取DOM元素
const textInput = document.getElementById('text-input');
const readBtn = document.getElementById('read-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const configBtn = document.getElementById('config-btn');
const generateBtn = document.getElementById('generate-btn');
const speedSlider = document.getElementById('speed');
const speedValue = document.getElementById('speed-value');
const statusText = document.getElementById('status-text');
const voiceRadios = document.querySelectorAll('input[name="voice"]');

// 配置弹窗元素
const modal = document.getElementById('config-modal');
const closeModalBtn = document.getElementById('close-modal');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const apiKeyInput = document.getElementById('api-key');
const savedKeysSelect = document.getElementById('saved-keys');
const deleteKeyBtn = document.getElementById('delete-key-btn');
const togglePasswordBtn = document.getElementById('toggle-password');
const themeSelect = document.getElementById('generate-theme');

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
            const key = selectedKey.split('|')[1];
            apiKeyInput.value = key;
        }
    });
    
    loadSavedConfigs();
    updateStatus('准备就绪');
}

function loadVoices() {
    const voices = speechSynthesis.getVoices();
    const usVoice = voices.find(v => v.lang === 'en-US');
    const gbVoice = voices.find(v => v.lang === 'en-GB');
    
    if (!usVoice && !gbVoice) {
        updateStatus('警告: 未检测到英文语音', 'warning');
    }
}

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
        return;
    }
    
    if (speechSynthesis.speaking) {
        stopReading();
    }
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    const selectedVoice = document.querySelector('input[name="voice"]:checked').value;
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === selectedVoice);
    
    if (voice) {
        currentUtterance.voice = voice;
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
        updateStatus('朗读出错: ' + event.error, 'error');
        readBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        textInput.classList.remove('reading');
    };
    
    speechSynthesis.speak(currentUtterance);
}

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

function updateStatus(message, type = 'info') {
    statusText.textContent = message;
}

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
        togglePasswordBtn.textContent = '🔒';
    } else if (apiKeyInput) {
        apiKeyInput.type = 'password';
        togglePasswordBtn.textContent = '👁️';
    }
}

function saveConfig() {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        updateStatus('请输入API Key', 'error');
        return;
    }

    const savedConfigs = getSavedConfigs();
    const keyName = `sk-${apiKey.substring(3, 7)}...`;
    savedConfigs.push({
        name: keyName,
        fullKey: apiKey,
        timestamp: Date.now()
    });

    localStorage.setItem('apiConfigs', JSON.stringify(savedConfigs));
    localStorage.setItem('currentConfig', JSON.stringify({
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
        const name = selectedKey.split('|')[1];
        const index = savedConfigs.findIndex(c => c.name === name);

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
    
    savedKeysSelect.innerHTML = '<option value="">-- 选择已保存的 Key --</option>';
    savedConfigs.forEach(config => {
        const option = document.createElement('option');
        option.value = `deepseek|${config.name}`;
        option.textContent = `DeepSeek - ${config.name}`;
        savedKeysSelect.appendChild(option);
    });
    
    const currentConfig = localStorage.getItem('currentConfig');
    if (currentConfig) {
        const config = JSON.parse(currentConfig);
        apiKeyInput.value = config.apiKey;
    }
}

async function generateText() {
    const currentConfig = localStorage.getItem('currentConfig');
    
    if (!currentConfig) {
        updateStatus('请先配置 API Key', 'error');
        openConfigModal();
        return;
    }
    
    const config = JSON.parse(currentConfig);
    const apiKey = config.apiKey;
    let theme = themeSelect.value;
    
    if (theme === 'random') {
        const themes = ['故事', '新闻', '对话', '科技', '文化', '商务', '学习', '日常'];
        theme = themes[Math.floor(Math.random() * themes.length)];
    }
    
    updateStatus('正在生成文本...', 'info');
    generateBtn.disabled = true;
    
    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an English listening practice material generator. Generate ONE English text about ' + theme + '. Word count: EXACTLY 200-300 words. Do NOT repeat same information. Do NOT generate multiple similar texts. Do NOT include any explanations, meta-commentary, or "Here is text". Output ONLY the text itself, nothing else. The text should be a continuous, coherent single text suitable for listening practice.'
                    },
                    {
                        role: 'user',
                        content: 'Generate an English text about ' + theme + '. CRITICAL: Word count MUST be EXACTLY 200-300 words. STRICT REQUIREMENTS: (1) Generate ONLY ONE text, (2) Do NOT repeat content, (3) Make it interesting and suitable for listening practice, (4) Do NOT include any intro/outro text, (5) Output ONLY the text.'
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || '生成失败');
        }
        
        const data = await response.json();
        let generatedText = data.choices[0].message.content.trim();
        
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

window.addEventListener('beforeunload', function() {
    stopReading();
});

init();
