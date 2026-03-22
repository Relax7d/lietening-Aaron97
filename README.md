# 英语听力朗读应用

一个基于 Web 的英语听力练习应用，支持 AI 生成英文文本和雅思听力题目。

## 功能特点

- 🎧 语音朗读（支持美音/英音）
- 🎲 AI 自动生成英文文本
- 📝 生成雅思听力题目（选择题/填空题）
- ⚙️ 多个 AI 提供商支持（DeepSeek、智谱、百度、阿里）
- 🎚️ 语速调节
- 🎨 现代化 UI 设计

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入 GitHub 仓库
3. 设置环境变量：
   - `DEFAULT_API_KEY`: 你的 API Key
   - `DEFAULT_PROVIDER`: `deepseek` (可选)
4. 部署

## 环境变量

- `DEFAULT_API_KEY`: 默认 API Key（可选，用户可在前端配置）
- `DEFAULT_PROVIDER`: 默认提供商（默认：deepseek）

## 本地运行

```bash
npm install
npm start
```

访问 http://localhost:3000
