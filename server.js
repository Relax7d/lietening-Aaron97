const express = require('express');
const path = require('path');
const generateHandler = require('./api/generate');
const generateQuestionsHandler = require('./api/generate-questions');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// API 路由
app.post('/api/generate', generateHandler);
app.post('/api/generate-questions', generateQuestionsHandler);

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
