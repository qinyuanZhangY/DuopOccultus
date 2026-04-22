# DuopOccultus

一个模仿多邻国节奏的神秘学学习 Web MVP（手机尺寸适配）。

## 功能概览

- 用户名/密码登录与注册
- 技能树关卡（塔罗、星座、周易、萨满）
- 每课结构：概念课 + 8 道题
- 题型支持：
  - 选择题（multiple_choice）
  - 拖拽配对（drag_match，MVP 中使用下拉配对实现）
  - 填空题（fill_blank）
  - 卡片翻转（flip_card）
- 经验值系统（XP）
- 管理后台（管理员登录后可新增/编辑/删除课程）
- 免责声明展示
- 图片占位方案：蓝底文字占位图

## 默认账号

- 学员：`demo / demo123`
- 管理员：`admin / admin123`

## 快速启动

```bash
npm install
npm start
```

启动后访问：

- 学习端：`http://localhost:3000/app`
- 管理后台：`http://localhost:3000/admin`
- 入口页：`http://localhost:3000/`

## 课程管理说明

后台中新增/编辑课程时必须满足：

- `estimatedMinutes` 在 5~8 之间
- `concept` 至少 2 段
- `questions` 必须正好 8 题
- 题型仅支持：
  - `multiple_choice`
  - `drag_match`
  - `fill_blank`
  - `flip_card`

## 测试

```bash
npm test
```
