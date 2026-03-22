# IELTS 场景生成问题修复

## 🔴 问题现象

**用户反馈**:
- 选择"师生讨论"场景
- 期望: 生成对话文本,包含多个 Speaker
- 实际: 生成独白文本,没有对话格式

---

## 🔍 根本原因

### 旧代码的问题

```javascript
// 旧代码: 完全忽略 IELTS 场景!
systemPrompt = `You are an English listening practice material generator.`;
userPrompt = `Generate one English text about ${finalThemeDesc}.
              Use ${difficultyDesc} vocabulary.
              Word count: ${lengthRequirement} words.
              Output ONLY the text, nothing else.`;
```

**问题**:
- ❌ 所有场景都是"Generate one English text"
- ❌ 没有区分独白和对话
- ❌ 没有 Speaker 标签要求
- ❌ "师生讨论"应该生成对话,但提示词没有要求

### IELTS 场景应该是什么样?

| IELTS 场景 | 对应 IELTS Section | 文本类型 | Speaker 要求 |
|------------|------------------|----------|-------------|
| Introduction (介绍说明) | Section 2 | 独白 | 1 个 Speaker |
| Group Discussion (小组讨论) | Section 3 | 对话 | 2-3 个 Speakers (A, B, C) |
| Tutorial (师生讨论) | Section 3 | 对话 | 2 个 Speakers (Professor, Student) |
| Lecture (学术讲座) | Section 4 | 独白 | 1 个 Speaker (Professor) |

---

## ✅ 修复方案

### 根据场景生成不同提示词

#### 1. Introduction (介绍/独白)

**System Prompt**:
```
You are an IELTS listening test material generator for Section 2 (introduction/monologue).
```

**User Prompt**:
```
Generate ONE IELTS Section 2 style introduction/monologue about [主题] for [难度] level.
Word count: [字数] words.

CRITICAL REQUIREMENTS:
(1) This should be a MONOLOGUE by ONE speaker, NOT a dialogue
(2) Focus on information, facts, descriptions, and explanations
(3) The speaker should present information clearly and directly
(4) Use natural spoken English with pauses and transitions
(5) DO NOT include "Speaker A:", "Speaker B:" or any dialogue markers
(6) Output ONLY the monologue text, nothing else, no intro/outro
```

**示例输出**:
```
Welcome to our campus tour. Today we'll explore the main library facilities.
The library is located in the center of campus, open from 8 AM to 10 PM daily.
We have five floors, each with different resources...
(独白,没有 Speaker 标签)
```

---

#### 2. Group Discussion (小组讨论)

**System Prompt**:
```
You are an IELTS listening test material generator for Section 3 (group discussion).
```

**User Prompt**:
```
Generate ONE IELTS Section 3 style group discussion between 2-3 speakers about [主题] for [难度] level.
Word count: [字数] words.

CRITICAL REQUIREMENTS:
(1) This MUST be a DIALOGUE with MULTIPLE speakers
(2) Use speaker labels like "Speaker A:", "Speaker B:", "Speaker C:" for each line
(3) Include different viewpoints, agreements, disagreements, and conclusions
(4) Make it sound like a natural group discussion
(5) Each speaker should have multiple lines of dialogue
(6) Output ONLY the dialogue text, nothing else, no intro/outro
```

**示例输出**:
```
Speaker A: I think we should focus on environmental protection first.
Speaker B: I agree, but we also need to consider economic factors.
Speaker C: Both are important. Maybe we can find a balance?
Speaker A: Let's discuss specific solutions...
(对话,有多个 Speaker 标签)
```

---

#### 3. Tutorial (师生讨论)

**System Prompt**:
```
You are an IELTS listening test material generator for Section 3 (tutorial/seminar).
```

**User Prompt**:
```
Generate ONE IELTS Section 3 style tutorial/dialogue between a professor and 1-2 students about [主题] for [难度] level.
Word count: [字数] words.

CRITICAL REQUIREMENTS:
(1) This MUST be a DIALOGUE with "Professor:" and "Student:" (or "Student 1:", "Student 2:") labels
(2) The professor should explain concepts, give feedback, and ask questions
(3) Students should ask questions, clarify doubts, and respond
(4) Include educational content, explanations, and academic language appropriate for tutorials
(5) Both professor and students should have multiple lines of dialogue
(6) Output ONLY the dialogue text, nothing else, no intro/outro
```

**示例输出**:
```
Professor: Today we'll discuss research methodology for your final projects.
Student: Professor, could you explain qualitative research methods?
Professor: Of course. Qualitative research focuses on understanding...
Student: That's helpful. How do we collect qualitative data?
Professor: Good question. Methods include interviews, observations...
(对话,有 Professor 和 Student 标签)
```

---

#### 4. Lecture (学术讲座)

**System Prompt**:
```
You are an IELTS listening test material generator for Section 4 (academic lecture).
```

**User Prompt**:
```
Generate ONE IELTS Section 4 style academic lecture by a professor about [主题] for [难度] level.
Word count: [字数] words.

CRITICAL REQUIREMENTS:
(1) This should be a MONOLOGUE by ONE professor/expert, NOT a dialogue
(2) Focus on academic content, theories, concepts, and research findings
(3) Use academic language, explanations, and examples
(4) Structure lecture with introduction, main points, and conclusion
(5) DO NOT include "Speaker A:", "Speaker B:" or any dialogue markers
(6) Output ONLY the lecture text, nothing else, no intro/outro
```

**示例输出**:
```
Welcome to today's lecture on climate change and its global impact.
Climate change refers to long-term shifts in weather patterns and temperatures.
The primary causes include greenhouse gas emissions, deforestation...
(独白,没有 Speaker 标签)
```

---

## 📊 修复前后对比

### 修复前
```javascript
// 所有场景都是同一个提示词
systemPrompt = "You are an English listening practice material generator."
userPrompt = "Generate one English text about [主题]..."
```

**结果**:
- ❌ "师生讨论" → 生成独白 (错误!)
- ❌ "小组讨论" → 生成独白 (错误!)
- ❌ 没有 Speaker 标签
- ❌ 对话场景变成独白

### 修复后
```javascript
// 根据场景生成不同提示词
if (isIELTS) {
    const scenarioPrompts = {
        'introduction': { /* Section 2 独白 */ },
        'group-discussion': { /* Section 3 对话 */ },
        'tutorial': { /* Section 3 教程对话 */ },
        'lecture': { /* Section 4 讲座 */ }
    };
}
```

**结果**:
- ✅ "介绍说明" → 独白,1个 Speaker
- ✅ "小组讨论" → 对话,2-3个 Speakers (A, B, C)
- ✅ "师生讨论" → 对话,2个 Speakers (Professor, Student)
- ✅ "学术讲座" → 独白,1个 Speaker

---

## 🎯 控制力说明

### 用户提到的"控制力"

**难度级别 > 内容主题 > 雅思场景**

但实际情况:

1. **难度级别** (强控制)
   - ✅ 影响词汇复杂度
   - ✅ 影响句子结构
   - ✅ 影响字数要求

2. **内容主题** (中控制)
   - ✅ 决定讨论的话题
   - ✅ 影响使用的词汇
   - ✅ 影响背景知识

3. **雅思场景** (弱控制 - 之前!)
   - ❌ 旧代码:完全忽略场景
   - ✅ 新代码:严格区分对话/独白

**修复后**: 雅思场景的控制力大幅提升!

---

## 🧪 测试验证

### 测试场景 1: 师生讨论

**输入**:
- 主题: Technology
- 难度: Intermediate
- 场景: Tutorial (师生讨论)

**预期输出**:
```
Professor: Today we'll discuss the impact of artificial intelligence on modern society.
Student: Professor, could you explain what AI is?
Professor: Artificial intelligence refers to computer systems that can perform tasks...
Student: What are some practical applications?
Professor: Great question. Applications include autonomous vehicles...
(多行对话,Professor 和 Student 都有多句话)
```

**验证点**:
- ✅ 有 Professor 标签
- ✅ 有 Student 标签
- ✅ 是对话格式
- ✅ 每个角色有多行
- ✅ 符合教程内容

---

### 测试场景 2: 小组讨论

**输入**:
- 主题: Climate Change
- 难度: Advanced
- 场景: Group Discussion (小组讨论)

**预期输出**:
```
Speaker A: Climate change is the most pressing issue of our time.
Speaker B: I agree, but we must consider economic impacts.
Speaker C: Both are important. We need sustainable solutions.
Speaker A: Let's discuss specific strategies...
(3个 Speakers,轮流对话)
```

**验证点**:
- ✅ 有 Speaker A, B, C 标签
- ✅ 是对话格式
- ✅ 有不同观点
- ✅ 符合小组讨论形式

---

### 测试场景 3: 介绍说明

**输入**:
- 主题: Campus Facilities
- 难度: Beginner
- 场景: Introduction (介绍说明)

**预期输出**:
```
Welcome to our university. Today I'll introduce the main campus facilities.
The library is located in the center, open daily from 8 AM to 10 PM.
We also have a sports complex with gym, pool, and tennis courts...
(独白,1个 Speaker)
```

**验证点**:
- ✅ 没有 Speaker 标签
- ✅ 是独白格式
- ✅ 介绍性内容
- ✅ 清晰的信息传递

---

## 💡 使用建议

### 1. 选择合适的场景

**练习目标** → **选择场景**

- 练习听力细节 → Introduction (Section 2)
- 练习多人对话 → Group Discussion (Section 3)
- 练习师生互动 → Tutorial (Section 3)
- 练习学术听力 → Lecture (Section 4)

### 2. 查看生成结果

**对话场景**:
- 检查是否有 Speaker 标签
- 检查每个角色是否有多行对话
- 检查是否自然流畅

**独白场景**:
- 检查是否没有 Speaker 标签
- 检查是否是连贯的独白
- 检查逻辑是否清晰

### 3. 调整难度

**如果生成的对话/独白太难**:
- 降低难度: Advanced → Intermediate → Beginner

**如果太简单**:
- 提高难度: Beginner → Intermediate → Advanced

---

## 🔧 代码变更

### 修复前的代码

```javascript
let userPrompt = '';
let systemPrompt = '';
let finalThemeDesc = themeDescriptions[finalTheme] || finalTheme;

systemPrompt = `You are an English listening practice material generator.`;
userPrompt = `Generate one English text about ${finalThemeDesc}.
              Use ${difficultyDesc} vocabulary.
              Word count: ${lengthRequirement} words.
              Output ONLY the text, nothing else.`;
```

### 修复后的代码

```javascript
let userPrompt = '';
let systemPrompt = '';
let finalThemeDesc = themeDescriptions[finalTheme] || finalTheme;

// 根据 IELTS 场景生成不同类型的文本
if (isIELTS) {
    const scenarioPrompts = {
        'introduction': {
            system: 'You are an IELTS listening test material generator for Section 2 (introduction/monologue).',
            user: `Generate ONE IELTS Section 2 style introduction/monologue about ${finalThemeDesc}...`
        },
        'group-discussion': {
            system: 'You are an IELTS listening test material generator for Section 3 (group discussion).',
            user: `Generate ONE IELTS Section 3 style group discussion between 2-3 speakers about ${finalThemeDesc}...`
        },
        'tutorial': {
            system: 'You are an IELTS listening test material generator for Section 3 (tutorial/seminar).',
            user: `Generate ONE IELTS Section 3 style tutorial/dialogue between a professor and 1-2 students about ${finalThemeDesc}...`
        },
        'lecture': {
            system: 'You are an IELTS listening test material generator for Section 4 (academic lecture).',
            user: `Generate ONE IELTS Section 4 style academic lecture by a professor about ${finalThemeDesc}...`
        }
    };

    const scenarioKey = ieltsScenario || 'introduction';
    const scenarioPrompt = scenarioPrompts[scenarioKey] || scenarioPrompts['introduction'];

    systemPrompt = scenarioPrompt.system;
    userPrompt = scenarioPrompt.user;
} else {
    // 非 IELTS 模式
    systemPrompt = `You are an English listening practice material generator.`;
    userPrompt = `Generate one English text about ${finalThemeDesc}...`;
}
```

---

## 📝 总结

### 问题根源
旧代码完全忽略了 IELTS 场景,所有场景都生成同样的"独白"文本。

### 修复方案
根据 IELTS 场景生成不同的提示词:
- Introduction → Section 2 独白
- Group Discussion → Section 3 对话 (Speaker A, B, C)
- Tutorial → Section 3 教程对话 (Professor, Student)
- Lecture → Section 4 学术独白

### 控制力提升
- ✅ 场景现在有强控制力
- ✅ 对话场景会生成对话格式
- ✅ 独白场景会生成独白格式
- ✅ 符合 IELTS 各 Section 的特点

### 预期效果
- ✅ "师生讨论" → 对话,有 Professor 和 Student
- ✅ "小组讨论" → 对话,有 Speaker A, B, C
- ✅ "介绍说明" → 独白,1个 Speaker
- ✅ "学术讲座" → 独白,1个 Professor

---

**最后更新**: 2026-03-22
**状态**: ✅ 代码已修复,场景控制力大幅提升

---

## 🚀 立即测试

### 步骤 1: 提交代码

```bash
cd c:\Users\aaron\listening-app-new
git add api/generate.js IELTS-SCENARIO-FIX.md
git commit -m "Fix IELTS scenario generation with proper dialogue/monologue"
git push
```

### 步骤 2: 等待部署

Vercel 会自动部署,约 1-2 分钟。

### 步骤 3: 测试场景

1. 访问应用: https://lietening-aaron97.vercel.app/
2. 选择"师生讨论"场景
3. 点击生成
4. 检查输出:
   - ✅ 有 Professor 标签
   - ✅ 有 Student 标签
   - ✅ 是对话格式
   - ✅ 每个角色有多行

### 步骤 4: 测试其他场景

- 介绍说明 → 应该是独白,无 Speaker 标签
- 小组讨论 → 应该是对话,有 Speaker A, B, C
- 学术讲座 → 应该是独白,1个 Professor

**完成!** 🎉
