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
            promptContent = 'Generate ' + questionCount + ' multiple choice questions about this text:\n' + text + '\n\nReturn JSON: [{"type":"multiple-choice","question":"text","options":["A","B","C","D"],"correctAnswer":0,"explanation":"text"}]';

        } else if (questionType === 'fill-blanks') {
            promptContent = 'Generate ' + questionCount + ' fill-in-the-blank questions about this text:\n' + text + '\n\nReturn JSON: [{"type":"fill-blanks","question":"text with _____","correctAnswer":"word","explanation":"text"}]';

        } else {
            promptContent = 'Generate ' + questionCount + ' mixed questions about this text:\n' + text + '\n\nReturn JSON: [{"type":"multiple-choice","question":"text","options":["A","B","C","D"],"correctAnswer":0,"explanation":"text"},{"type":"fill-blanks","question":"text with _____","correctAnswer":"word","explanation":"text"}]';
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
            max_tokens: 1500
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

        // 添加超时和重试机制
        const maxRetries = 3;
        let retryCount = 0;
        let response;

        while (retryCount < maxRetries) {
            try {
                response = await axios.post(url, requestData, {
                    headers,
                    timeout: 60000  // 60秒超时
                });
                break;  // 成功则跳出循环
            } catch (error) {
                retryCount++;
                console.error(`API调用失败 (尝试 ${retryCount}/${maxRetries}):`, error.message);

                if (retryCount >= maxRetries) {
                    throw error;  // 重试次数用完,抛出错误
                }

                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
        }

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
