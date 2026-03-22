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
    // 加载可用的语音
    loadVoices();
    
    // 语音列表加载事件
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // 语速滑块事件
    speedSlider.addEventListener('input', function() {
        speedValue.textContent = this.value + 'x';
    });
    
    // 按钮事件
    readBtn.addEventListener('click', startReading);
    pauseBtn.addEventListener('click', pauseReading);
    stopBtn.addEventListener('click', stopReading);
    configBtn.addEventListener('click', openConfigModal);
    generateBtn.addEventListener('click', generateText);

    // 字符计数
    textInput.addEventListener('input', updateCharCount);
    updateCharCount();
    
    // 配置弹窗事件
    closeModalBtn.addEventListener('click', closeConfigModal);
    cancelBtn.addEventListener('click', closeConfigModal);
    saveBtn.addEventListener('click', saveConfig);
    deleteKeyBtn.addEventListener('click', deleteSavedKey);
    togglePasswordBtn.addEventListener('click', togglePassword);
    
    // 点击弹窗外部关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeConfigModal();
        }
    });
    
    // 已保存Keys选择事件
    savedKeysSelect.addEventListener('change', function() {
        const selectedKey = this.value;
        if (selectedKey) {
            const [provider, name] = selectedKey.split('|');
            apiProviderSelect.value = provider;
            apiKeyInput.value = name;
        }
    });

    // 加载已保存的配置
    loadSavedConfigs();
    
    // 更新状态
    updateStatus('准备就绪');
}

// 加载可用语音
function loadVoices() {
    const voices = speechSynthesis.getVoices();
    console.log('可用语音数量:', voices.length);
    
    // 检查是否有英文语音
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
        textInput.focus();
        return;
    }
    
    // 如果是暂停状态,继续朗读
    if (isPaused && speechSynthesis.paused) {
        speechSynthesis.resume();
        isPaused = false;
        pauseBtn.innerHTML = '<span class="btn-icon">⏸️</span> 暂停';
        updateStatus('正在朗读...');
        textInput.classList.add('reading');
        return;
    }
    
    // 如果正在朗读,先停止
    if (speechSynthesis.speaking) {
        stopReading();
    }
    
    // 创建新的朗读实例
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // 获取选择的语音类型
    const selectedVoice = document.querySelector('input[name="voice"]:checked').value;
    const voices = speechSynthesis.getVoices();
    
    // 设置语音
    const voice = voices.find(v => v.lang === selectedVoice);
    if (voice) {
        currentUtterance.voice = voice;
    }
    currentUtterance.lang = selectedVoice;
    
    // 设置语速
    currentUtterance.rate = parseFloat(speedSlider.value);
    
    // 朗读事件
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
    
    // 开始朗读
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

// 清空文本
function clearText() {
    if (textInput.value.trim()) {
        if (confirm('确定要清空所有文本吗?')) {
            textInput.value = '';
            stopReading();
            updateStatus('文本已清空');
            textInput.focus();
        }
    } else {
        updateStatus('文本框已经是空的');
    }
}

// 更新状态
function updateStatus(message, type = 'info') {
    statusText.textContent = message;
}

// 更新字符计数
function updateCharCount() {
    const count = textInput.value.length;
    charCount.textContent = `${count} 字符`;
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

// 打开配置弹窗
function openConfigModal() {
    modal.classList.add('show');
    loadSavedConfigs();
}

// 关闭配置弹窗
function closeConfigModal() {
    modal.classList.remove('show');
    if (apiKeyInput) {
        apiKeyInput.value = '';
    }
}

// 切换密码显示
function togglePassword() {
    if (apiKeyInput && apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        togglePasswordBtn.textContent = '🔒';
    } else if (apiKeyInput) {
        apiKeyInput.type = 'password';
        togglePasswordBtn.textContent = '👁️';
    }
}

// 保存配置
function saveConfig() {
    const provider = apiProviderSelect.value;
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        updateStatus('请输入API Key', 'error');
        return;
    }

    // 保存到localStorage
    const savedConfigs = getSavedConfigs();
    const keyName = `sk-${apiKey.substring(3, 7)}...`;
    savedConfigs.push({
        provider: provider,
        name: keyName,
        fullKey: apiKey,
        timestamp: Date.now()
    });

    localStorage.setItem('apiConfigs', JSON.stringify(savedConfigs));

    // 设置为当前使用的配置
    localStorage.setItem('currentConfig', JSON.stringify({
        provider: provider,
        apiKey: apiKey
    }));

    updateStatus('配置已保存', 'success');
    loadSavedConfigs();
    closeConfigModal();
}

// 删除已保存的Key
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

// 获取已保存的配置
function getSavedConfigs() {
    const saved = localStorage.getItem('apiConfigs');
    return saved ? JSON.parse(saved) : [];
}

// 加载已保存的配置
function loadSavedConfigs() {
    const savedConfigs = getSavedConfigs();
    
    // 清空并重新填充选择框
    savedKeysSelect.innerHTML = '<option value="">-- 选择已保存的 Key --</option>';
    savedConfigs.forEach(config => {
        const option = document.createElement('option');
        option.value = `${config.provider}|${config.name}`;
        option.textContent = `${config.provider.toUpperCase()} - ${config.name}`;
        savedKeysSelect.appendChild(option);
    });
    
    // 检查是否有当前配置
    const currentConfig = localStorage.getItem('currentConfig');
    if (currentConfig) {
        const config = JSON.parse(currentConfig);
        apiProviderSelect.value = config.provider;
        apiKeyInput.value = config.apiKey;
    }
}

// ========== 文本生成相关函数 ==========

// 生成随机文本
async function generateText() {
    const themeSelect = document.getElementById('generate-theme');
    const theme = themeSelect.value;

    updateStatus('正在生成文本...', 'info');
    generateBtn.disabled = true;

    try {
        // 获取保存的配置
        const currentConfig = localStorage.getItem('currentConfig');

        let requestBody = {
            theme: theme
        };

        // 如果前端有配置,则使用前端的配置
        if (currentConfig) {
            const config = JSON.parse(currentConfig);
            requestBody.apiKey = config.apiKey;
            requestBody.provider = config.provider;
        }
        
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '生成失败');
        }
        
        const data = await response.json();
        
        // 将生成的文本放入文本框
        textInput.value = data.text;
        
        updateStatus('文本生成成功!', 'success');
        
    } catch (error) {
        console.error('生成错误:', error);
        updateStatus('生成失败: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
    }
}

// 初始化应用
init();
