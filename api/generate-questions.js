const axios = require('axios');

module.exports = async function handler(req, res) {
    // CORS 处理
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text, difficulty, questionType, ieltsScenario, apiKey, provider, questionCount = 5 } = req.body;

        if (!text || text.trim().length < 50) {
            return res.status(400).json({ error: '文本内容太短，无法生成题目' });
        }

        const finalApiKey = apiKey || process.env.DEFAULT_API_KEY;
        const finalProvider = provider || process.env.DEFAULT_PROVIDER || 'deepseek';

        console.log('Generating IELTS questions for', difficulty, 'level, type:', questionType, ', scenario:', ieltsScenario, ', count:', questionCount, '...');

        const difficultyInstructions = {
            beginner: 'simple vocabulary and basic grammar',
            intermediate: 'moderate vocabulary and varied sentence structures',
            advanced: 'complex vocabulary and sophisticated language',
            native: 'native-level vocabulary and nuanced language'
        };

        let promptContent = '';
        const scenarioContext = ieltsScenario ? '\nThis text is from "' + ieltsScenario + '" scenario.' : '';

        if (questionType === 'multiple-choice') {
            promptContent = 'Based on following English text, generate ' + questionCount + ' IELTS-style multiple-choice listening comprehension questions. Each question must have 4 options (A, B, C, D).\n\nText:\n' + text + '\n' + scenarioContext + '\n\nFormat your response as a JSON array:\n[\n  {\n    "type": "multiple-choice",\n    "question": "Your question text",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "correctAnswer": 0,\n    "explanation": "Brief explanation"\n  }\n]\n\nImportant:\n- correctAnswer should be 0 for A, 1 for B, 2 for C, 3 for D\n- Return ONLY JSON array, no other text';

        } else if (questionType === 'fill-blanks') {
            promptContent = 'Based on following English text, generate ' + questionCount + ' IELTS-style fill-in-the-blank listening comprehension questions.\n\nText:\n' + text + '\n' + scenarioContext + '\n\nFormat your response as a JSON array:\n[\n  {\n    "type": "fill-blanks",\n    "question": "Your question with blank (use _____ for blank)",\n    "correctAnswer": "The exact word or phrase",\n    "explanation": "Brief explanation"\n  }\n]\n\nImportant:\n- Use _____ to indicate blank in question\n- Return ONLY JSON array, no other text';

        } else {
            const mcCount = Math.ceil(questionCount * 0.6);
            const fbCount = questionCount - mcCount;
            promptContent = 'Based on following English text, generate ' + questionCount + ' IELTS-style listening comprehension questions.\n\nText:\n' + text + '\n' + scenarioContext + '\n\nGenerate approximately ' + mcCount + ' multiple-choice questions and ' + fbCount + ' fill-in-the-blank questions.\n\nFormat your response as a JSON array with mixed types.\n- Return ONLY JSON array, no other text';
        }

        let requestData = {
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert IELTS examiner specializing in creating listening comprehension questions.'
                },
                {
                    role: 'user',
                    content: promptContent
                }
            ],
            temperature: 0.7,
            max_tokens: 1800
        };

        let url = '';
        let headers = {};

        switch (finalProvider) {
            case 'deepseek':
                url = 'https://api.deepseek.com/v1/chat/completions';
                headers = {
                    'Authorization': 'Bearer ' + finalApiKey,
                    'Content-Type': 'application/json'
                };
                requestData.model = 'deepseek-chat';
                requestData.timeout = 90000;
                break;

            case 'zhipu':
                url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                headers = {
                    'Authorization': 'Bearer ' + finalApiKey,
                    'Content-Type': 'application/json'
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
                url += '?access_token=' + finalApiKey;
                break;

            case 'qwen':
                url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
                headers = {
                    'Authorization': 'Bearer ' + finalApiKey,
                    'Content-Type': 'application/json'
                };
                requestData.model = 'qwen-turbo';
                break;

            default:
                return res.status(400).json({ error: '不支持的API提供商' });
        }

        console.log('Calling', finalProvider, 'API for questions...');

        const response = await axios.post(url, requestData, { headers });

        let questionsText = '';

        if (finalProvider === 'deepseek' || finalProvider === 'zhipu' || finalProvider === 'qwen') {
            questionsText = response.data.choices[0].message.content;
        } else if (finalProvider === 'baidu') {
            questionsText = response.data.result;
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

        console.log('Raw questions count:', questions.length);
        console.log('Sample question:', JSON.stringify(questions[0], null, 2));

        questions = questions.filter(q => {
            if (!q.question || !q.type) {
                console.log('Filtered: missing question or type', q);
                return false;
            }

            if (q.type === 'multiple-choice') {
                const valid = Array.isArray(q.options) &&
                       q.options.length === 4 &&
                       typeof q.correctAnswer === 'number' &&
                       q.correctAnswer >= 0 &&
                       q.correctAnswer <= 3;
                if (!valid) console.log('Filtered: invalid multiple-choice', q);
                return valid;
            } else if (q.type === 'fill-blanks') {
                const valid = q.correctAnswer &&
                       typeof q.correctAnswer === 'string' &&
                       q.correctAnswer.trim().length > 0;
                if (!valid) console.log('Filtered: invalid fill-blanks', q);
                return valid;
            }

            console.log('Filtered: unknown type', q);
            return false;
        });

        if (questions.length === 0) {
            console.error('All questions were filtered out. Original questions:', questions);
            throw new Error('未能生成有效的题目');
        }

        const finalQuestions = questions.slice(0, questionCount);

        console.log('Successfully generated ' + finalQuestions.length + ' questions');

        res.json({
            success: true,
            questions: finalQuestions
        });

    } catch (error) {
        console.error('题目生成错误:', error.message);

        if (error.response) {
            console.error('API响应错误:', error.response.data);
            return res.status(error.response.status || 500).json({
                error: error.response.data.error ? error.response.data.error.message : '题目生成失败',
                details: error.response.data
            });
        }

        res.status(500).json({
            error: '生成题目失败',
            message: error.message
        });
    }
};
