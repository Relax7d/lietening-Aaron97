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
        const { difficulty, theme, ieltsScenario, apiKey, provider } = req.body;

        const finalApiKey = apiKey || process.env.DEFAULT_API_KEY;
        const finalProvider = provider || process.env.DEFAULT_PROVIDER || 'deepseek';
        const finalTheme = theme || 'story';

        console.log('Using API Key:', finalApiKey ? finalApiKey.substring(0, 10) + '...' : 'none');
        console.log('Theme:', finalTheme);
        console.log('Difficulty:', difficulty);
        console.log('IELTS Scenario:', ieltsScenario);

        if (!finalApiKey) {
            return res.status(400).json({ error: '请先配置API Key' });
        }

        const difficultyInstructions = {
            beginner: 'simple vocabulary and basic grammar',
            intermediate: 'moderate vocabulary and varied sentence structures',
            advanced: 'complex vocabulary and sophisticated language',
            native: 'native-level vocabulary and nuanced language'
        };

        const difficultyLevels = {
            beginner: 'elementary school level',
            intermediate: 'middle school level',
            advanced: 'college level',
            native: 'native English speaker level'
        };

        const difficultyDesc = difficultyLevels[difficulty] || difficulty;
        const isIELTS = ieltsScenario && ieltsScenario !== 'general';

        const scenarioDescriptions = {
            'introduction': 'introduction and monologue',
            'group-discussion': 'group discussion',
            'tutorial': 'tutorial and seminar',
            'lecture': 'academic lecture'
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

        let lengthRequirement = '200-300';
        
        if (isIELTS) {
            if (difficulty === 'native') {
                lengthRequirement = '500-600';
            } else if (difficulty === 'advanced') {
                lengthRequirement = '400-500';
            } else if (difficulty === 'intermediate') {
                lengthRequirement = '300-400';
            } else {
                lengthRequirement = '200-300';
            }
        } else {
            if (difficulty === 'native') {
                lengthRequirement = '300-400';
            } else if (difficulty === 'advanced') {
                lengthRequirement = '250-350';
            } else if (difficulty === 'intermediate') {
                lengthRequirement = '200-250';
            } else {
                lengthRequirement = '150-200';
            }
        }

        let userPrompt = '';
        let systemPrompt = '';
        let finalThemeDesc = themeDescriptions[finalTheme] || finalTheme;

        // 根据 IELTS 场景生成不同类型的文本
        if (isIELTS) {
            const scenarioPrompts = {
                'introduction': {
                    system: 'You are an IELTS listening test material generator for Section 2 (introduction/monologue).',
                    user: `Generate ONE IELTS Section 2 style introduction/monologue about ${finalThemeDesc} for ${difficultyDesc} level. Word count: ${lengthRequirement} words. CRITICAL REQUIREMENTS: (1) This should be a MONOLOGUE by ONE speaker, NOT a dialogue, (2) Focus on information, facts, descriptions, and explanations, (3) The speaker should present information clearly and directly, (4) Use natural spoken English with pauses and transitions, (5) DO NOT include "Speaker A:", "Speaker B:" or any dialogue markers, (6) Output ONLY the monologue text, nothing else, no intro/outro.`
                },
                'group-discussion': {
                    system: 'You are an IELTS listening test material generator for Section 3 (group discussion).',
                    user: `Generate ONE IELTS Section 3 style group discussion between 2-3 speakers about ${finalThemeDesc} for ${difficultyDesc} level. Word count: ${lengthRequirement} words. CRITICAL REQUIREMENTS: (1) This MUST be a DIALOGUE with MULTIPLE speakers, (2) Use speaker labels like "Speaker A:", "Speaker B:", "Speaker C:" for each line, (3) Include different viewpoints, agreements, disagreements, and conclusions, (4) Make it sound like a natural group discussion, (5) Each speaker should have multiple lines of dialogue, (6) Output ONLY the dialogue text, nothing else, no intro/outro.`
                },
                'tutorial': {
                    system: 'You are an IELTS listening test material generator for Section 3 (tutorial/seminar).',
                    user: `Generate ONE IELTS Section 3 style tutorial/dialogue between a professor and 1-2 students about ${finalThemeDesc} for ${difficultyDesc} level. Word count: ${lengthRequirement} words. CRITICAL REQUIREMENTS: (1) This MUST be a DIALOGUE with "Professor:" and "Student:" (or "Student 1:", "Student 2:") labels, (2) The professor should explain concepts, give feedback, and ask questions, (3) Students should ask questions, clarify doubts, and respond, (4) Include educational content, explanations, and academic language appropriate for tutorials, (5) Both professor and students should have multiple lines of dialogue, (6) Output ONLY the dialogue text, nothing else, no intro/outro.`
                },
                'lecture': {
                    system: 'You are an IELTS listening test material generator for Section 4 (academic lecture).',
                    user: `Generate ONE IELTS Section 4 style academic lecture by a professor about ${finalThemeDesc} for ${difficultyDesc} level. Word count: ${lengthRequirement} words. CRITICAL REQUIREMENTS: (1) This should be a MONOLOGUE by ONE professor/expert, NOT a dialogue, (2) Focus on academic content, theories, concepts, and research findings, (3) Use academic language, explanations, and examples, (4) Structure the lecture with introduction, main points, and conclusion, (5) DO NOT include "Speaker A:", "Speaker B:" or any dialogue markers, (6) Output ONLY the lecture text, nothing else, no intro/outro.`
                }
            };

            const scenarioKey = ieltsScenario || 'introduction';
            const scenarioPrompt = scenarioPrompts[scenarioKey] || scenarioPrompts['introduction'];

            systemPrompt = scenarioPrompt.system;
            userPrompt = scenarioPrompt.user;
        } else {
            // 非 IELTS 模式
            systemPrompt = `You are an English listening practice material generator.`;
            userPrompt = `Generate one English text about ${finalThemeDesc}. Use ${difficultyDesc} vocabulary. Word count: ${lengthRequirement} words. Output ONLY the text, nothing else.`;
        }

        let requestData = {};
        let url = '';
        let headers = {};

        switch (finalProvider) {
            case 'deepseek':
                url = 'https://api.deepseek.com/v1/chat/completions';
                headers = {
                    'Authorization': 'Bearer ' + finalApiKey,
                    'Content-Type': 'application/json'
                };
                requestData = {
                    model: 'deepseek-chat',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1500
                };
                break;

            case 'zhipu':
                url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
                headers = {
                    'Authorization': 'Bearer ' + finalApiKey,
                    'Content-Type': 'application/json'
                };
                requestData = {
                    model: 'glm-4',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
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
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    temperature: 0.7,
                    max_output_tokens: 2000
                };
                url += '?access_token=' + finalApiKey;
                break;

            case 'qwen':
                url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
                headers = {
                    'Authorization': 'Bearer ' + finalApiKey,
                    'Content-Type': 'application/json'
                };
                requestData = {
                    model: 'qwen-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: userPrompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                };
                break;

            default:
                return res.status(400).json({ error: '不支持的API提供商' });
        }

        console.log('Calling', finalProvider, 'API...');

        // 添加超时和重试机制
        const maxRetries = 3;
        let retryCount = 0;
        let response;

        while (retryCount < maxRetries) {
            try {
                response = await axios.post(url, requestData, {
                    headers,
                    timeout: 45000  // 45秒超时
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

        let generatedText = '';

        if (finalProvider === 'deepseek' || finalProvider === 'zhipu' || finalProvider === 'qwen') {
            generatedText = response.data.choices[0].message.content;
        } else if (finalProvider === 'baidu') {
            generatedText = response.data.result;
        }

        generatedText = generatedText.trim();
        if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
            generatedText = generatedText.slice(1, -1);
        }

        console.log('Generated text:', generatedText.substring(0, 50) + '...');

        res.json({ success: true, text: generatedText });

    } catch (error) {
        console.error('生成错误:', error.message);

        if (error.response) {
            console.error('API响应错误:', error.response.data);
            return res.status(error.response.status || 500).json({
                error: error.response.data.error ? error.response.data.error.message : '生成文本失败',
                details: error.response.data
            });
        }

        res.status(500).json({
            error: '生成文本失败',
            message: error.message
        });
    }
};
