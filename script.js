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
    
    console.log('可用语音:', voices.length);
    if (usVoice) console.log('美音:', usVoice.name);
    if (gbVoice) console.log('英音:', gbVoice.name);
}

// 开始朗读
function startReading() {
    const text = textInput.value.trim();
    
    if (!text) {
        updateStatus('请先输入或生成英文文本', 'warning');
        return;
    }
    
    speechSynthesis.cancel();
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    const voiceType = document.querySelector('input[name="voice"]:checked').value;
    const voiceGender = document.querySelector('input[name="voice-gender"]:checked').value;
    
    const voices = speechSynthesis.getVoices();
    let selectedVoice = null;
    
    if (voiceType === 'en-US') {
        selectedVoice = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes(voiceGender));
    } else {
        selectedVoice = voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes(voiceGender));
    }
    
    if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang === voiceType);
    }
    
    if (selectedVoice) {
        currentUtterance.voice = selectedVoice;
    }
    
    currentUtterance.rate = parseFloat(speedSlider.value);
    
    currentUtterance.onstart = function() {
        updateStatus('正在朗读...', 'info');
        readBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
    };
    
    currentUtterance.onend = function() {
        updateStatus('朗读完成', 'success');
        readBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        isPaused = false;
    };
    
    currentUtterance.onerror = function(event) {
        console.error('语音合成错误:', event);
        updateStatus('朗读出错: ' + event.error, 'error');
        readBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
    };
    
    speechSynthesis.speak(currentUtterance);
    isPaused = false;
}

// 暂停朗读
function pauseReading() {
    if (speechSynthesis.speaking) {
        if (isPaused) {
            speechSynthesis.resume();
            isPaused = false;
            updateStatus('继续朗读...', 'info');
        } else {
            speechSynthesis.pause();
            isPaused = true;
            updateStatus('已暂停', 'warning');
        }
    }
}

// 停止朗读
function stopReading() {
    speechSynthesis.cancel();
    isPaused = false;
    updateStatus('已停止', 'info');
    readBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
}

// 更新状态
function updateStatus(message, type = 'info') {
    statusText.textContent = message;
    statusBar.className = 'status-bar status-' + type;
}

// 更新字符计数
function updateCharCount() {
    const count = textInput.value.length;
    charCount.textContent = count + ' 字符';
}

// ========== 文本生成相关函数 ==========

async function generateText() {
    const theme = themeSelect.value;
    const difficulty = difficultySelect.value;
    const ieltsScenario = ieltsScenarioSelect.value;

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

    generateBtn.disabled = true;
    updateStatus('正在生成文本...', 'info');

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                difficulty,
                theme,
                ieltsScenario,
                apiKey,
                provider
            })
        });

        if (!response.ok) {
            let errorText = '';
            try {
                const errorData = await response.json();
                errorText = errorData.error || errorData.message || '生成失败';
            } catch (e) {
                errorText = await response.text();
            }
            console.error('API Error:', errorText);
            throw new Error(errorText);
        }

        const data = await response.json();
        let generatedText = data.text || '';

        if (!generatedText) {
            throw new Error('API 返回的数据为空');
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

        const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                difficulty,
                questionType,
                ieltsScenario,
                apiKey,
                provider,
                questionCount
            })
        });

        if (!response.ok) {
            let errorText = '';
            try {
                const errorData = await response.json();
                errorText = errorData.error || errorData.message || '生成失败';
            } catch (e) {
                errorText = await response.text();
            }
            console.error('API Error:', errorText);
            throw new Error(errorText);
        }

        const data = await response.json();
        let questions = data.questions || [];

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('生成的题目格式不正确或为空');
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

// 清除题目
function clearQuestions() {
    questionsContainer.innerHTML = '';
    questionsSection.style.display = 'none';
    currentQuestions = [];
    updateStatus('已清除题目', 'info');
}

// 更新题目数量选项
function updateQuestionCountOptions() {
    const difficulty = difficultySelect.value;
    const options = questionCountSelect.options;
    
    options[1].disabled = difficulty !== 'advanced' && difficulty !== 'native'; // 10题
    options[2].disabled = difficulty !== 'native'; // 15题
}

// ========== 配置管理相关函数 ==========

function openConfigModal() {
    modal.classList.add('show');
}

function closeConfigModal() {
    modal.classList.remove('show');
}

function saveConfig() {
    const provider = apiProviderSelect.value;
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('请输入 API Key');
        return;
    }
    
    const config = {
        provider,
        apiKey,
        name: `${provider} - ${apiKey.substring(0, 8)}...`
    };
    
    localStorage.setItem('currentConfig', JSON.stringify(config));
    
    const savedConfigs = JSON.parse(localStorage.getItem('savedConfigs') || '[]');
    savedConfigs.push(config);
    localStorage.setItem('savedConfigs', JSON.stringify(savedConfigs));
    
    loadSavedConfigs();
    closeConfigModal();
    updateStatus('API 配置已保存', 'success');
}

function loadSavedConfigs() {
    const savedConfigs = JSON.parse(localStorage.getItem('savedConfigs') || '[]');
    savedKeysSelect.innerHTML = '<option value="">选择已保存的配置</option>';
    
    savedConfigs.forEach((config, index) => {
        const option = document.createElement('option');
        option.value = `${config.provider}|${config.apiKey}`;
        option.textContent = config.name;
        savedKeysSelect.appendChild(option);
    });
}

function deleteSavedKey() {
    const selectedKey = savedKeysSelect.value;
    if (!selectedKey) {
        alert('请先选择要删除的配置');
        return;
    }
    
    if (!confirm('确定要删除这个配置吗？')) {
        return;
    }
    
    const savedConfigs = JSON.parse(localStorage.getItem('savedConfigs') || '[]');
    const [provider, apiKey] = selectedKey.split('|');
    
    const newConfigs = savedConfigs.filter(config => 
        config.provider !== provider || config.apiKey !== apiKey
    );
    
    localStorage.setItem('savedConfigs', JSON.stringify(newConfigs));
    loadSavedConfigs();
    savedKeysSelect.value = '';
}

function togglePassword() {
    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        togglePasswordBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M1 1l22 22"></path>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
            </svg>
        `;
    } else {
        apiKeyInput.type = 'password';
        togglePasswordBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
    }
}

// 初始化
init();
