# DuopOccultus

模仿多邻国节奏的神秘学学习 Web 应用：

- 学习端：`/app`（手机尺寸）
- 管理后台：`/admin`（桌面网页）

## 核心学习流程（已按新需求重构）

1. 登录后首屏顶部可直接切换课程（如：塔罗入门、星座入门、萨满入门、塔罗进阶等）
2. 进入课程后显示路径图（每个路径点是一个课）
3. 点击路径点进入学习：
   - 第一章：3~5 分钟文本阅读
   - 第二章：8 道题
4. 每道题必须答对才能进入下一题（答错立即重试）
5. 8 题全对后自动完成该路径点并进入下一个路径点
6. 会记录“上次离开课程和路径点”，下次打开自动继续

## 默认账号

- 学员：`demo / demo123`
- 管理员：`admin / admin123`

## 快速启动

```bash
npm install
npm start
```

访问：

- 入口：`http://localhost:3000/`
- 学习端：`http://localhost:3000/app`
- 后台：`http://localhost:3000/admin`

## 后台内容管理

后台支持按“课程（course）”和“路径点（path node）”管理学习内容：

- 课程字段：名称、技能模块、等级、排序
- 路径点字段：标题、阅读时长（3~5）、排序、文本、题目 JSON（8 题）

校验规则：

- 路径点阅读时长必须 3~5 分钟
- 路径点必须包含 8 道题
- 题型仅支持：
  - `multiple_choice`
  - `drag_match`
  - `fill_blank`
  - `flip_card`

## 测试

```bash
npm test
```

## 塔罗课程节点数据

- 文件路径：`courses/tarot_course_nodes.json`
- 内容：新增 30 个课程节点（`TAROT-001` ~ `TAROT-030`）
- 设计原则：按 `beginner -> intermediate -> advanced` 循序渐进，并通过 `prerequisites` 描述先修关系
- 难度标记：`difficulty` 采用 1-5 递增
