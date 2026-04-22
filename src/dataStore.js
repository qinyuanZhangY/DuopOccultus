const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { gradeLesson, gradeQuestion } = require("./grading");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");
const LEVELS = ["beginner", "advanced"];

function makeId(size = 10) {
  return crypto.randomUUID().replace(/-/g, "").slice(0, size);
}

function levelLabel(level) {
  return level === "advanced" ? "进阶" : "入门";
}

function normalizeQuestion(question, index) {
  return {
    ...question,
    id: `q${index + 1}`,
  };
}

function sanitizeQuestion(question) {
  const clone = { ...question };
  delete clone.answer;
  delete clone.correctMap;
  return clone;
}

function byOrder(a, b) {
  return a.order - b.order;
}

function createPointBlueprints() {
  return [
    {
      skillId: "tarot",
      level: "beginner",
      title: "塔罗入门：牌组与直觉",
      chapterText: [
        "塔罗常见体系为 78 张：22 张大阿尔卡那 + 56 张小阿尔卡那。",
        "入门重点不是背诵全部牌义，而是通过关键词建立联想。",
        "抽牌时可以先观察画面：人物动作、颜色、符号，再联想到问题场景。",
        "塔罗学习用于兴趣和自我反思，不替代专业建议。",
      ],
      questions: [
        {
          type: "multiple_choice",
          prompt: "塔罗常见牌组总数是？",
          options: ["22", "56", "78", "108"],
          answer: "78",
        },
        {
          type: "multiple_choice",
          prompt: "大阿尔卡那通常有多少张？",
          options: ["12", "22", "34", "56"],
          answer: "22",
        },
        {
          type: "drag_match",
          prompt: "将牌义关键词与含义配对",
          leftItems: ["愚者", "力量", "隐士"],
          rightItems: ["内在勇气", "探索与开始", "独处与寻找答案"],
          correctMap: {
            愚者: "探索与开始",
            力量: "内在勇气",
            隐士: "独处与寻找答案",
          },
        },
        {
          type: "fill_blank",
          prompt: "学习塔罗时，第一步常从观察画面与___开始。",
          answer: "联想",
        },
        {
          type: "flip_card",
          front: "女祭司",
          back: "直觉、内在知识、安静观察",
          prompt: "翻开卡片后，女祭司更强调哪种能力？",
          options: ["外在竞争", "直觉", "冒险冲动", "立即行动"],
          answer: "直觉",
        },
        {
          type: "multiple_choice",
          prompt: "小阿尔卡那更常对应哪类主题？",
          options: ["日常关系与事件", "纯历史知识", "天文物理", "生物分类"],
          answer: "日常关系与事件",
        },
        {
          type: "fill_blank",
          prompt: "塔罗练习中，记录抽牌与感受有助于形成个人___。",
          answer: "牌感",
        },
        {
          type: "multiple_choice",
          prompt: "以下哪项更符合塔罗入门学习态度？",
          options: ["一次就要全会", "只记单一答案", "用关键词和情境理解", "完全不看图像"],
          answer: "用关键词和情境理解",
        },
      ],
    },
    {
      skillId: "tarot",
      level: "advanced",
      title: "塔罗进阶：牌阵与解读结构",
      chapterText: [
        "进阶练习重点是“问题定义 + 牌阵位置 + 叙事整合”。",
        "同一张牌在不同位置会出现不同侧重点，例如“障碍位”与“建议位”。",
        "解读时建议按顺序表达：现状、影响因素、可行动作。",
        "保持边界意识：描述趋势，而不是替别人做决定。",
      ],
      questions: [
        {
          type: "multiple_choice",
          prompt: "在牌阵中，最先应明确的是？",
          options: ["牌是否稀有", "问题范围", "抽牌速度", "牌桌颜色"],
          answer: "问题范围",
        },
        {
          type: "fill_blank",
          prompt: "同一张牌在“建议位”更偏向可执行的___。",
          answer: "行动",
        },
        {
          type: "drag_match",
          prompt: "配对牌阵位置与常见作用",
          leftItems: ["现状位", "障碍位", "建议位"],
          rightItems: ["当前核心状态", "影响推进的问题", "可尝试的下一步"],
          correctMap: {
            现状位: "当前核心状态",
            障碍位: "影响推进的问题",
            建议位: "可尝试的下一步",
          },
        },
        {
          type: "flip_card",
          front: "节制",
          back: "整合、平衡、调配资源",
          prompt: "如果节制出现在“障碍位”，最可能提示？",
          options: ["过度极端", "机会爆发", "关系结束", "必须放弃"],
          answer: "过度极端",
        },
        {
          type: "multiple_choice",
          prompt: "进阶解读更推荐哪种表达方式？",
          options: ["绝对结论", "仅说好坏", "现状-影响-行动", "只读单张"],
          answer: "现状-影响-行动",
        },
        {
          type: "fill_blank",
          prompt: "为了可复盘，建议记录问题、牌阵和解读___。",
          answer: "过程",
        },
        {
          type: "multiple_choice",
          prompt: "边界意识在解读中意味着？",
          options: ["替对方决策", "宣称必然结果", "提供参考并尊重自主性", "拒绝解释"],
          answer: "提供参考并尊重自主性",
        },
        {
          type: "multiple_choice",
          prompt: "当出现矛盾信息时，较合理的做法是？",
          options: ["强行统一", "回到问题定义与牌位语境", "直接忽略", "重新洗牌直到满意"],
          answer: "回到问题定义与牌位语境",
        },
      ],
    },
    {
      skillId: "zodiac",
      level: "beginner",
      title: "星座入门：元素与模式",
      chapterText: [
        "12 星座常按四元素分类：火、土、风、水。",
        "还可按三种模式划分：本位、固定、变动。",
        "入门学习可先掌握元素气质，再理解星座差异。",
        "星座内容用于兴趣表达，不作为绝对标签。",
      ],
      questions: [
        {
          type: "multiple_choice",
          prompt: "白羊座常归为哪一元素？",
          options: ["火", "土", "风", "水"],
          answer: "火",
        },
        {
          type: "drag_match",
          prompt: "配对元素与特征",
          leftItems: ["火元素", "土元素", "水元素"],
          rightItems: ["重感受与共情", "行动力与热情", "务实与稳定"],
          correctMap: {
            火元素: "行动力与热情",
            土元素: "务实与稳定",
            水元素: "重感受与共情",
          },
        },
        {
          type: "fill_blank",
          prompt: "本位、固定、变动在占星中被称为三种___。",
          answer: "模式",
        },
        {
          type: "multiple_choice",
          prompt: "以下哪项更符合固定模式倾向？",
          options: ["快速切换", "持续坚持", "随机变化", "回避目标"],
          answer: "持续坚持",
        },
        {
          type: "flip_card",
          front: "双鱼座",
          back: "敏感、想象力、共情",
          prompt: "双鱼座更容易体现哪种特点？",
          options: ["结构化管理", "理性剥离", "共情感受", "绝对控制"],
          answer: "共情感受",
        },
        {
          type: "multiple_choice",
          prompt: "星座入门最推荐的顺序是？",
          options: ["先背全部行星", "先学元素和模式", "先做复杂推运", "只看娱乐排行"],
          answer: "先学元素和模式",
        },
        {
          type: "fill_blank",
          prompt: "学习星座时，建议避免给他人贴上绝对___。",
          answer: "标签",
        },
        {
          type: "multiple_choice",
          prompt: "风元素常和哪类能力相关？",
          options: ["沟通思考", "体力劳动", "睡眠质量", "饮食偏好"],
          answer: "沟通思考",
        },
      ],
    },
    {
      skillId: "zodiac",
      level: "advanced",
      title: "星座进阶：星盘三要素",
      chapterText: [
        "常见的入门进阶框架：太阳、月亮、上升。",
        "太阳常代表核心意识，月亮代表情绪模式，上升代表外在风格。",
        "三者组合解读比单看太阳星座更立体。",
        "表达时应强调“倾向”而非“命定”。",
      ],
      questions: [
        {
          type: "multiple_choice",
          prompt: "月亮在基础解读中更偏向？",
          options: ["社会地位", "情绪反应", "职业技能", "财富总量"],
          answer: "情绪反应",
        },
        {
          type: "drag_match",
          prompt: "配对三要素与说明",
          leftItems: ["太阳", "月亮", "上升"],
          rightItems: ["外在呈现风格", "核心意识与目标感", "情绪与安全需求"],
          correctMap: {
            太阳: "核心意识与目标感",
            月亮: "情绪与安全需求",
            上升: "外在呈现风格",
          },
        },
        {
          type: "fill_blank",
          prompt: "把太阳、月亮、上升结合起来，可减少单一___。",
          answer: "刻板印象",
        },
        {
          type: "flip_card",
          front: "上升狮子",
          back: "外在表达更热情、自信、舞台感",
          prompt: "上升狮子最可能影响的是？",
          options: ["童年创伤", "外在第一印象", "学历高低", "血型偏好"],
          answer: "外在第一印象",
        },
        {
          type: "multiple_choice",
          prompt: "进阶解读时更建议？",
          options: ["只看太阳", "完全定性命运", "多要素综合", "忽略语境"],
          answer: "多要素综合",
        },
        {
          type: "fill_blank",
          prompt: "负责任的表述应强调：这是一种行为___。",
          answer: "倾向",
        },
        {
          type: "multiple_choice",
          prompt: "当不同要素信息冲突时，合理做法是？",
          options: ["选最顺眼的", "看生活场景与阶段", "全部作废", "当作错误数据"],
          answer: "看生活场景与阶段",
        },
        {
          type: "multiple_choice",
          prompt: "以下哪项更接近进阶目标？",
          options: ["制造绝对判断", "提升自我观察", "替他人下结论", "回避反思"],
          answer: "提升自我观察",
        },
      ],
    },
    {
      skillId: "yijing",
      level: "beginner",
      title: "周易入门：阴阳与八卦",
      chapterText: [
        "周易的核心之一是阴阳变化：阴爻与阳爻的组合形成卦象。",
        "八卦是基础符号体系，可用于理解自然与关系变化。",
        "入门学习重点是象义理解，不必一开始追求复杂推演。",
        "应用时可用于思考与反省，不替代现实判断。",
      ],
      questions: [
        {
          type: "multiple_choice",
          prompt: "周易基础中的两种爻是？",
          options: ["金与木", "阴与阳", "天与地", "风与火"],
          answer: "阴与阳",
        },
        {
          type: "drag_match",
          prompt: "配对卦象关键词",
          leftItems: ["乾", "坤", "坎"],
          rightItems: ["险与流动", "顺承与承载", "刚健与创造"],
          correctMap: {
            乾: "刚健与创造",
            坤: "顺承与承载",
            坎: "险与流动",
          },
        },
        {
          type: "fill_blank",
          prompt: "八卦可视作理解变化规律的符号___。",
          answer: "系统",
        },
        {
          type: "multiple_choice",
          prompt: "周易入门最先建议做什么？",
          options: ["背诵全书", "理解象义基础", "只看结果", "忽略上下文"],
          answer: "理解象义基础",
        },
        {
          type: "flip_card",
          front: "坤卦",
          back: "顺势、包容、承载",
          prompt: "坤卦更强调哪种行动风格？",
          options: ["强攻", "顺势承载", "快速跳跃", "彻底隔离"],
          answer: "顺势承载",
        },
        {
          type: "multiple_choice",
          prompt: "阴阳变化的学习价值更接近？",
          options: ["固定答案", "观察动态关系", "预测彩票", "替代科学"],
          answer: "观察动态关系",
        },
        {
          type: "fill_blank",
          prompt: "阅读卦象时，需要结合问题情境与现实___。",
          answer: "背景",
        },
        {
          type: "multiple_choice",
          prompt: "以下哪项更适合作为入门练习？",
          options: ["记录日常变化并对应象义", "追求绝对神秘", "排斥思考", "直接断言他人命运"],
          answer: "记录日常变化并对应象义",
        },
      ],
    },
    {
      skillId: "yijing",
      level: "advanced",
      title: "周易进阶：卦位与决策反思",
      chapterText: [
        "进阶可从“卦位关系、主客互动、时机判断”三个角度展开。",
        "同一卦象在不同问题中会有不同侧重点。",
        "周易实践可用于决策反思：识别风险、节奏与边界。",
        "建议结合现实信息交叉验证，保持理性。",
      ],
      questions: [
        {
          type: "multiple_choice",
          prompt: "进阶使用周易时最需要结合的是？",
          options: ["现实信息", "随机猜测", "单一感受", "网络热词"],
          answer: "现实信息",
        },
        {
          type: "drag_match",
          prompt: "配对分析维度与说明",
          leftItems: ["时机", "主客关系", "风险边界"],
          rightItems: ["明确可承受范围", "判断推进或等待", "区分自己与外部因素"],
          correctMap: {
            时机: "判断推进或等待",
            主客关系: "区分自己与外部因素",
            风险边界: "明确可承受范围",
          },
        },
        {
          type: "fill_blank",
          prompt: "进阶解读常用于辅助___，而非替代行动。",
          answer: "决策",
        },
        {
          type: "flip_card",
          front: "既济",
          back: "阶段性完成后仍需警惕变化",
          prompt: "既济常提醒我们？",
          options: ["一劳永逸", "继续维护与复盘", "立即放弃", "无需沟通"],
          answer: "继续维护与复盘",
        },
        {
          type: "multiple_choice",
          prompt: "面对不确定结果时，更推荐？",
          options: ["停止思考", "结合多源信息再判断", "立刻下绝对结论", "忽视风险"],
          answer: "结合多源信息再判断",
        },
        {
          type: "fill_blank",
          prompt: "周易进阶练习里，复盘记录能提升判断___。",
          answer: "质量",
        },
        {
          type: "multiple_choice",
          prompt: "“主客关系”主要帮助你识别？",
          options: ["色彩偏好", "作用来源", "历史年代", "设备型号"],
          answer: "作用来源",
        },
        {
          type: "multiple_choice",
          prompt: "合理的进阶目标是？",
          options: ["制造神秘感", "提升决策反思能力", "追求不可证伪结论", "替代专业咨询"],
          answer: "提升决策反思能力",
        },
      ],
    },
    {
      skillId: "shaman",
      level: "beginner",
      title: "萨满入门：自然连接与仪式感",
      chapterText: [
        "萨满学习常强调与自然、节律和内在感受的连接。",
        "入门实践可从简短呼吸、专注聆听、记录梦境开始。",
        "仪式感本质是帮助专注与自我整理。",
        "学习中保持尊重不同文化背景，避免刻板化理解。",
      ],
      questions: [
        {
          type: "multiple_choice",
          prompt: "萨满入门练习更强调什么？",
          options: ["复杂理论", "自然连接与觉察", "高强度体能", "技术编程"],
          answer: "自然连接与觉察",
        },
        {
          type: "drag_match",
          prompt: "配对练习与目标",
          leftItems: ["呼吸专注", "记录梦境", "自然散步"],
          rightItems: ["观察象征线索", "稳定当下状态", "建立环境感知"],
          correctMap: {
            呼吸专注: "稳定当下状态",
            记录梦境: "观察象征线索",
            自然散步: "建立环境感知",
          },
        },
        {
          type: "fill_blank",
          prompt: "仪式感可以帮助我们更容易进入___状态。",
          answer: "专注",
        },
        {
          type: "multiple_choice",
          prompt: "以下哪项是更友好的入门方式？",
          options: ["每天 5 分钟安静观察", "追求夸张表现", "强迫他人参与", "否定他人文化"],
          answer: "每天 5 分钟安静观察",
        },
        {
          type: "flip_card",
          front: "鼓点节律",
          back: "重复节奏可帮助稳定注意力",
          prompt: "鼓点练习常用于？",
          options: ["分散注意", "稳态进入", "提高噪音", "快速结束"],
          answer: "稳态进入",
        },
        {
          type: "multiple_choice",
          prompt: "学习萨满相关内容时应注意？",
          options: ["文化尊重", "绝对化解释", "拒绝记录", "过度表演"],
          answer: "文化尊重",
        },
        {
          type: "fill_blank",
          prompt: "入门练习建议保持___，以观察变化。",
          answer: "连续性",
        },
        {
          type: "multiple_choice",
          prompt: "哪项更符合娱乐体验型学习目标？",
          options: ["轻量习惯与自我感受", "做严肃临床诊断", "替代医疗", "宣称唯一真理"],
          answer: "轻量习惯与自我感受",
        },
      ],
    },
    {
      skillId: "shaman",
      level: "advanced",
      title: "萨满进阶：象征解读与个人实践",
      chapterText: [
        "进阶练习可把体验记录整理为“象征-情绪-行动”三栏。",
        "象征解读强调个人语境，不同人可能有不同联想。",
        "通过周期复盘，能看见习惯、情绪与行为的关联。",
        "实践应保持安全边界与现实平衡。",
      ],
      questions: [
        {
          type: "multiple_choice",
          prompt: "象征解读更强调什么？",
          options: ["统一标准答案", "个人语境", "随机联想", "他人评价"],
          answer: "个人语境",
        },
        {
          type: "drag_match",
          prompt: "配对进阶记录三栏",
          leftItems: ["象征", "情绪", "行动"],
          rightItems: ["下一步微小实践", "出现的意象与线索", "当下身体或心理感受"],
          correctMap: {
            象征: "出现的意象与线索",
            情绪: "当下身体或心理感受",
            行动: "下一步微小实践",
          },
        },
        {
          type: "fill_blank",
          prompt: "进阶复盘的价值在于识别长期___。",
          answer: "模式",
        },
        {
          type: "flip_card",
          front: "动物象征：鹰",
          back: "更高视角、观察全局、拉开距离",
          prompt: "鹰的象征在实践中可提醒你？",
          options: ["盲目投入", "换视角看问题", "立即对抗", "忽略细节"],
          answer: "换视角看问题",
        },
        {
          type: "multiple_choice",
          prompt: "安全边界在进阶实践中意味着？",
          options: ["忽略身体信号", "保持休息与现实平衡", "过量练习", "长期失眠"],
          answer: "保持休息与现实平衡",
        },
        {
          type: "fill_blank",
          prompt: "把象征体验转化成可执行任务，有助于形成___闭环。",
          answer: "行动",
        },
        {
          type: "multiple_choice",
          prompt: "当解释出现偏差时，优先做什么？",
          options: ["扩大结论", "回看记录并校正假设", "责怪他人", "停止全部实践"],
          answer: "回看记录并校正假设",
        },
        {
          type: "multiple_choice",
          prompt: "进阶目标更接近以下哪项？",
          options: ["炫技展示", "稳定自我观察与实践节律", "获得唯一答案", "回避现实问题"],
          answer: "稳定自我观察与实践节律",
        },
      ],
    },
  ];
}

function defaultSkills() {
  return [
    {
      id: "tarot",
      name: "塔罗",
      description: "从牌义关键词到牌阵解读结构",
      color: "#4a72ff",
      order: 1,
    },
    {
      id: "zodiac",
      name: "星座",
      description: "元素模式与星盘三要素",
      color: "#2f9bff",
      order: 2,
    },
    {
      id: "yijing",
      name: "周易",
      description: "阴阳八卦与决策反思",
      color: "#1f78b4",
      order: 3,
    },
    {
      id: "shaman",
      name: "萨满",
      description: "自然连接与象征实践",
      color: "#155fa0",
      order: 4,
    },
  ];
}

function createCourses(skills) {
  const sortedSkills = [...skills].sort(byOrder);
  const courses = [];
  sortedSkills.forEach((skill, index) => {
    LEVELS.forEach((level, levelIndex) => {
      courses.push({
        id: `${skill.id}-${level}`,
        skillId: skill.id,
        level,
        title: `${skill.name}${levelLabel(level)}`,
        color: skill.color,
        order: index * 10 + levelIndex,
      });
    });
  });
  return courses.sort(byOrder);
}

function createSeedPoints(courses) {
  const blueprints = createPointBlueprints();
  const pointOrderMap = new Map();
  return blueprints.map((blueprint) => {
    const courseId = `${blueprint.skillId}-${blueprint.level}`;
    const order = (pointOrderMap.get(courseId) || 0) + 1;
    pointOrderMap.set(courseId, order);
    const course = courses.find((item) => item.id === courseId);
    return {
      id: makeId(10),
      courseId,
      skillId: blueprint.skillId,
      level: blueprint.level,
      title: blueprint.title,
      order,
      estimatedMinutes: 8,
      readingMinutes: 4,
      chapterText: blueprint.chapterText,
      questions: blueprint.questions.map(normalizeQuestion),
      color: course?.color || "#4a72ff",
    };
  });
}

async function createSeedData() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const learnerHash = await bcrypt.hash("demo123", 10);
  const skills = defaultSkills();
  const courses = createCourses(skills);
  const points = createSeedPoints(courses);
  const firstCourseId = courses[0]?.id ?? null;
  const firstPointId = points.find((point) => point.courseId === firstCourseId)?.id ?? null;

  return {
    disclaimer:
      "本应用仅用于文化兴趣学习与娱乐体验，不构成医疗、法律、投资或人生决策建议。",
    skills,
    courses,
    points,
    users: [
      {
        id: makeId(10),
        username: "admin",
        passwordHash: adminHash,
        role: "admin",
        xp: 0,
        completedPoints: {},
        lastSession: {
          courseId: firstCourseId,
          pointId: firstPointId,
        },
      },
      {
        id: makeId(10),
        username: "demo",
        passwordHash: learnerHash,
        role: "learner",
        xp: 0,
        completedPoints: {},
        lastSession: {
          courseId: firstCourseId,
          pointId: firstPointId,
        },
      },
    ],
  };
}

function sortPoints(points) {
  return [...points].sort((a, b) => {
    if (a.courseId === b.courseId) {
      return a.order - b.order;
    }
    return a.courseId.localeCompare(b.courseId, "zh-Hans-CN");
  });
}

class DataStore {
  constructor() {
    this.db = null;
  }

  async init() {
    try {
      const raw = await fs.readFile(DB_PATH, "utf8");
      this.db = JSON.parse(raw);
      await this.migrateIfNeeded();
      await this.save();
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      this.db = await createSeedData();
      await this.save();
    }
  }

  async migrateIfNeeded() {
    const hasNewSchema = Array.isArray(this.db.courses) && Array.isArray(this.db.points);
    if (!hasNewSchema) {
      this.db = await this.migrateLegacySchema(this.db);
    }

    this.db.skills = Array.isArray(this.db.skills) ? this.db.skills : defaultSkills();
    this.db.courses = Array.isArray(this.db.courses) ? this.db.courses : createCourses(this.db.skills);
    this.db.points = Array.isArray(this.db.points) ? this.db.points : [];
    this.db.users = Array.isArray(this.db.users) ? this.db.users : [];
    this.db.users.forEach((user) => this.ensureUserFields(user));
  }

  async migrateLegacySchema(legacyDb) {
    if (!Array.isArray(legacyDb.lessons)) {
      return createSeedData();
    }

    const skills = Array.isArray(legacyDb.skills) && legacyDb.skills.length > 0 ? legacyDb.skills : defaultSkills();
    const courses = createCourses(skills);
    const pointOrderMap = new Map();
    const points = legacyDb.lessons.map((lesson) => {
      const courseId = `${lesson.skillId}-${lesson.level}`;
      const order = (pointOrderMap.get(courseId) || 0) + 1;
      pointOrderMap.set(courseId, order);
      return {
        id: lesson.id || makeId(10),
        courseId,
        skillId: lesson.skillId,
        level: lesson.level,
        title: lesson.title,
        order,
        estimatedMinutes: Number(lesson.estimatedMinutes || 8),
        readingMinutes: 4,
        chapterText: lesson.concept || [],
        questions: (lesson.questions || []).map(normalizeQuestion),
        color: courses.find((course) => course.id === courseId)?.color || "#4a72ff",
      };
    });

    const fallbackCourseId = courses[0]?.id ?? null;
    const fallbackPointId = points.find((item) => item.courseId === fallbackCourseId)?.id ?? null;
    const users = (legacyDb.users || []).map((user) => ({
      ...user,
      xp: Number(user.xp || 0),
      completedPoints: user.completedPoints || user.completedLessons || {},
      lastSession: {
        courseId: user.lastSession?.courseId || fallbackCourseId,
        pointId: user.lastSession?.pointId || fallbackPointId,
      },
    }));

    return {
      disclaimer:
        legacyDb.disclaimer ||
        "本应用仅用于文化兴趣学习与娱乐体验，不构成医疗、法律、投资或人生决策建议。",
      skills,
      courses,
      points,
      users,
    };
  }

  ensureUserFields(user) {
    user.completedPoints = user.completedPoints || user.completedLessons || {};
    delete user.completedLessons;
    if (!user.lastSession || typeof user.lastSession !== "object") {
      const firstCourseId = this.db.courses[0]?.id ?? null;
      const firstPointId = this.getCoursePoints(firstCourseId)[0]?.id ?? null;
      user.lastSession = { courseId: firstCourseId, pointId: firstPointId };
    }
    if (!Number.isFinite(user.xp)) {
      user.xp = 0;
    }
  }

  async save() {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(this.db, null, 2), "utf8");
  }

  getDisclaimer() {
    return this.db.disclaimer;
  }

  getUserByUsername(username) {
    return this.db.users.find((user) => user.username === username);
  }

  getUserById(userId) {
    return this.db.users.find((user) => user.id === userId);
  }

  getSafeUser(user) {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      xp: user.xp,
      completedPoints: user.completedPoints,
      lastSession: user.lastSession,
    };
  }

  async createUser({ username, password, role = "learner" }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const firstCourseId = this.db.courses[0]?.id ?? null;
    const firstPointId = this.getCoursePoints(firstCourseId)[0]?.id ?? null;
    const user = {
      id: makeId(10),
      username,
      passwordHash,
      role,
      xp: 0,
      completedPoints: {},
      lastSession: {
        courseId: firstCourseId,
        pointId: firstPointId,
      },
    };
    this.db.users.push(user);
    await this.save();
    return user;
  }

  getCoursePoints(courseId) {
    return sortPoints(this.db.points.filter((point) => point.courseId === courseId));
  }

  getCourseById(courseId) {
    return this.db.courses.find((course) => course.id === courseId) || null;
  }

  isPointUnlocked(user, pointId) {
    const point = this.db.points.find((item) => item.id === pointId);
    if (!point) {
      return false;
    }
    const points = this.getCoursePoints(point.courseId);
    const currentIndex = points.findIndex((item) => item.id === pointId);
    if (currentIndex < 0) {
      return false;
    }
    if (currentIndex === 0) {
      return true;
    }
    for (let i = 0; i < currentIndex; i += 1) {
      if (!user.completedPoints[points[i].id]) {
        return false;
      }
    }
    return true;
  }

  getFirstActivePoint(user, courseId) {
    const points = this.getCoursePoints(courseId);
    return points.find((point) => !user.completedPoints[point.id]) || points[0] || null;
  }

  getLearningHome(user) {
    const courses = [...this.db.courses].sort(byOrder);
    const selectedCourseId =
      courses.find((course) => course.id === user.lastSession?.courseId)?.id || courses[0]?.id || null;
    const resumePointId = user.lastSession?.pointId || this.getFirstActivePoint(user, selectedCourseId)?.id || null;

    const resultCourses = courses.map((course) => {
      const points = this.getCoursePoints(course.id);
      let foundCurrent = false;
      const normalizedPoints = points.map((point) => {
        if (user.completedPoints[point.id]) {
          return {
            id: point.id,
            title: point.title,
            order: point.order,
            estimatedMinutes: point.estimatedMinutes,
            readingMinutes: point.readingMinutes,
            textDurationMinutes: point.readingMinutes,
            status: "completed",
            state: "completed",
          };
        }
        if (!foundCurrent) {
          foundCurrent = true;
          return {
            id: point.id,
            title: point.title,
            order: point.order,
            estimatedMinutes: point.estimatedMinutes,
            readingMinutes: point.readingMinutes,
            textDurationMinutes: point.readingMinutes,
            status: "current",
            state: "current",
          };
        }
        return {
          id: point.id,
          title: point.title,
          order: point.order,
          estimatedMinutes: point.estimatedMinutes,
          readingMinutes: point.readingMinutes,
          textDurationMinutes: point.readingMinutes,
          status: "locked",
          state: "locked",
        };
      });

      const courseResumePointId =
        user.lastSession?.courseId === course.id
          ? user.lastSession?.pointId || null
          : this.getFirstActivePoint(user, course.id)?.id || points[0]?.id || null;

      return {
        ...course,
        name: course.title,
        resumePointId: courseResumePointId,
        points: normalizedPoints,
      };
    });

    return {
      selectedCourseId,
      resumePointId,
      courses: resultCourses,
    };
  }

  async updateLastSession(userId, { courseId, pointId }) {
    const user = this.getUserById(userId);
    if (!user) {
      return;
    }
    user.lastSession = {
      courseId: courseId || user.lastSession?.courseId || null,
      pointId: pointId || user.lastSession?.pointId || null,
    };
    await this.save();
  }

  getPointById(pointId) {
    return this.db.points.find((item) => item.id === pointId) || null;
  }

  getPublicPoint(courseId, pointId) {
    const point = this.db.points.find((item) => item.id === pointId && item.courseId === courseId);
    if (!point) {
      return null;
    }
    return {
      id: point.id,
      courseId: point.courseId,
      title: point.title,
      order: point.order,
      estimatedMinutes: point.estimatedMinutes,
      readingMinutes: point.readingMinutes,
      chapterText: point.chapterText,
      questions: point.questions.map(sanitizeQuestion),
    };
  }

  getPointWithAnswers(pointId) {
    return this.db.points.find((item) => item.id === pointId) || null;
  }

  checkPointQuestion(pointId, questionId, response) {
    const point = this.getPointWithAnswers(pointId);
    if (!point) {
      return { error: "路径点不存在" };
    }
    const question = point.questions.find((item) => item.id === questionId);
    if (!question) {
      return { error: "题目不存在" };
    }
    return {
      correct: gradeQuestion(question, response),
      question,
      point,
    };
  }

  async completePoint({ userId, pointId, responses }) {
    const point = this.getPointWithAnswers(pointId);
    if (!point) {
      return { error: "路径点不存在" };
    }
    const user = this.getUserById(userId);
    if (!this.isPointUnlocked(user, point.id)) {
      return { error: "当前路径点尚未解锁" };
    }
    const grade = gradeLesson(point, responses || {});
    if (grade.correct !== grade.total) {
      return { error: "请先答对全部 8 题", grade };
    }
    const hadCompletion = Boolean(user.completedPoints[point.id]);
    const xpGain = hadCompletion ? 0 : 80;
    user.completedPoints[point.id] = {
      score: `${grade.correct}/${grade.total}`,
      timestamp: Date.now(),
      xpGain,
    };
    user.xp += xpGain;
    const nextPoint = this.getCoursePoints(point.courseId).find((item) => !user.completedPoints[item.id]) || null;
    user.lastSession = {
      courseId: point.courseId,
      pointId: nextPoint ? nextPoint.id : point.id,
    };
    await this.save();
    return {
      grade,
      xpGain,
      totalXp: user.xp,
      nextPointId: nextPoint?.id || null,
      finishedCourse: !nextPoint,
      firstCompletion: !hadCompletion,
    };
  }

  getAdminPoints() {
    return sortPoints(this.db.points);
  }

  getAdminOverview() {
    return {
      courses: [...this.db.courses].sort(byOrder),
      pathPoints: this.getAdminPoints().map((point) => ({
        id: point.id,
        courseId: point.courseId,
        order: point.order,
        title: point.title,
        estimatedMinutes: point.estimatedMinutes,
        readingMinutes: point.readingMinutes,
        learningText: point.chapterText,
        questions: point.questions,
      })),
    };
  }

  async createPoint(payload) {
    const point = {
      id: makeId(10),
      ...payload,
      chapterText: Array.isArray(payload.chapterText) ? payload.chapterText : [],
      questions: payload.questions.map(normalizeQuestion),
    };
    this.db.points.push(point);
    await this.save();
    return point;
  }

  async updatePoint(pointId, payload) {
    const index = this.db.points.findIndex((point) => point.id === pointId);
    if (index < 0) {
      return null;
    }
    this.db.points[index] = {
      ...this.db.points[index],
      ...payload,
      id: pointId,
      chapterText: Array.isArray(payload.chapterText) ? payload.chapterText : [],
      questions: payload.questions.map(normalizeQuestion),
    };
    await this.save();
    return this.db.points[index];
  }

  async deletePoint(pointId) {
    const before = this.db.points.length;
    this.db.points = this.db.points.filter((point) => point.id !== pointId);
    if (this.db.points.length === before) {
      return false;
    }
    this.db.users.forEach((user) => {
      delete user.completedPoints[pointId];
      if (user.lastSession?.pointId === pointId) {
        const fallbackPoint = this.getCoursePoints(user.lastSession.courseId)[0] || null;
        user.lastSession.pointId = fallbackPoint?.id || null;
      }
    });
    await this.save();
    return true;
  }
}

module.exports = {
  DataStore,
  LEVELS,
};
