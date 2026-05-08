export type Lang = 'zh' | 'en';

const LANG_KEY = 'relationship-lang';

let currentLang: Lang = (localStorage.getItem(LANG_KEY) as Lang) || 'zh';

const dict: Record<string, Record<Lang, string>> = {
  title:            { zh: '关系工具书',   en: 'Relationship Map' },
  emptyHint:        { zh: '想一个人，开始', en: 'Think of someone, begin' },
  btnClear:         { zh: '清空',         en: 'Clear' },
  fabAddLabel:      { zh: '添加一个人',    en: 'Add a person' },
  btnFlow:          { zh: '关系流转',      en: 'Flow Map' },
  sheetRetest:      { zh: '重新感受',      en: 'Re-assess' },
  sheetHistory:     { zh: '查看记录',      en: 'History' },
  sheetDelete:      { zh: '删除',         en: 'Delete' },
  close:            { zh: '关闭',         en: 'Close' },

  confirmDelete:    { zh: '确定删除「{0}」？此操作不可恢复。', en: 'Delete "{0}"? This cannot be undone.' },
  confirmClearAll:  { zh: '确定清空本地所有人物与测评记录？此操作不可恢复。', en: 'Clear all people and assessment records? This cannot be undone.' },
  historyTitle:     { zh: '{0} · 记录',    en: '{0} · History' },

  aliasPrompt:      { zh: '想一个人<br />给 ta 起个代号', en: 'Think of someone<br />Give them a name' },
  aliasPlaceholder: { zh: '代号',          en: 'Name' },
  nextStep:         { zh: '下一步',        en: 'Next' },
  ringPrompt:       { zh: 'ta 在哪个圈？',  en: 'Which circle are they in?' },
  ringHint:         { zh: '选一个最贴近你此刻感受的圈', en: 'Pick the one closest to how you feel right now' },
  ringInner:        { zh: '内圈',          en: 'Inner' },
  ringInnerDesc:    { zh: '可以打电话倾诉的人', en: 'Someone you can call and confide in' },
  ringMiddle:       { zh: '中圈',          en: 'Middle' },
  ringMiddleDesc:   { zh: '有好感但不常联系的人', en: 'Someone you like but rarely contact' },
  ringOuter:        { zh: '外圈',          en: 'Outer' },
  ringOuterDesc:    { zh: '生活里存在但不亲近的人', en: 'Someone present but not close' },

  s1Question1:      { zh: '想到 ',          en: 'When you think of ' },
  s1Question2:      { zh: '<br />你的身体是紧的，还是松的？', en: '<br />does your body feel tense, or relaxed?' },
  sliderTight:      { zh: '紧',            en: 'Tense' },
  sliderLoose:      { zh: '松',            en: 'Relaxed' },
  s2Question1:      { zh: '',              en: '' },
  s2Question2:      { zh: ' 在你脑子里<br />占多大一块地方？', en: ' in your mind —<br />how much space do they take?' },
  sliderAlways:     { zh: '时刻都在',       en: 'Always there' },
  sliderSometimes:  { zh: '偶尔浮现',       en: 'Comes & goes' },
  seeResult:        { zh: '看结果',         en: 'See result' },

  axisTop:          { zh: '高投入',         en: 'High investment' },
  axisBottom:       { zh: '低投入',         en: 'Low investment' },
  axisLeft:         { zh: '消耗',           en: 'Draining' },
  axisRight:        { zh: '滋养',           en: 'Nourishing' },
  pickPrompt:       { zh: '哪个词最准？点它。', en: 'Which word fits best? Tap it.' },

  confirmAlias:     { zh: '你和「{0}」的此刻', en: 'You and "{0}", right now' },
  confirmNoAlias:   { zh: '你的此刻',        en: 'You, right now' },
  confirmSub:       { zh: '正在落入你的星图…', en: 'Falling into your star map…' },
  defaultAlias:     { zh: 'ta',             en: 'them' },

  flowTitle:        { zh: '关系位置与流转',   en: 'Relationship Flow' },
  flowHint:         { zh: '所有人在词表平面上的测评位置；同一人按时间连线，越早越淡、越新越实。', en: 'Everyone\'s position on the word plane; same person connected by time — earlier is fainter, newer is bolder.' },
  flowEmpty:        { zh: '还没有测评记录。先添加一个人并完成感受流程吧。', en: 'No assessments yet. Add someone and complete the flow first.' },

  langToggle:       { zh: 'EN', en: '中' },
};

const wordMap: Record<string, string> = {
  '窒息': 'Suffocate', '情绪绑架': 'Manipu-lated', '控制': 'Controlling',
  '纠缠': 'Entangled', '疯狂拉扯': 'Tug of war',
  '讨好': 'Fawning', '过度依赖': 'Clingy', '患得患失': 'On edge',
  '争夺': 'Competing', '反复试探': 'Probing',
  '委屈': 'Wronged', '压抑': 'Stifled', '紧绷': 'Tense',
  '焦虑': 'Anxious', '内耗': 'Drained',
  '隐忍': 'Enduring', '小心翼翼': 'Eggshells', '不对等': 'Unequal',
  '勉强': 'Reluctant', '不踏实': 'Insecure',

  '全情投入': 'All in', '并肩作战': 'Together', '灵魂共振': 'Soul bond',
  '热恋': 'In love', '知己': 'Soulmate',
  '默契': 'In sync', '坦诚相待': 'Candid', '深度信任': 'Deep trust',
  '彼此激发': 'Sparking', '惺惺相惜': 'Kindred',
  '看见': 'Seen', '亲近': 'Close', '被支持': 'Backed',
  '安全感': 'Safe', '归属感': 'Belong',
  '好感': 'Fond of', '欣赏': 'Admire', '信任': 'Trust',
  '温暖': 'Warmth', '踏实': 'Grounded',

  '无所谓': 'Whatever', '敷衍': 'Halfhearted', '将就': 'Settling',
  '例行公事': 'Routine', '不想经营': 'Giving up',
  '无力': 'Powerless', '心累': 'Weary', '回避': 'Avoidant',
  '冷淡': 'Cold', '疏离': 'Distant',
  '形同陌路': 'Strangers', '冷暴力': 'Cold war', '名存实亡': 'Hollow',
  '失望透顶': 'Crushed', '心寒': 'Chilled',
  '废墟': 'Ruins', '彻底放弃': 'Given up', '耗竭': 'Depleted',
  '死心': 'Lost hope', '麻木': 'Numb',

  '有底气': 'Assured', '放心': 'At ease', '淡然': 'Serene',
  '自在': 'Comfy', '安心': 'At peace',
  '松弛': 'Relaxed', '淡而不疏': 'Light yet close', '君子之交': 'Gentle tie',
  '细水长流': 'Enduring', '各自安好': 'Each at peace',
  '静好': 'Still good', '相忘江湖': 'Fondly apart', '偶尔想起': 'Passing thought',
  '老友如故': 'Old friends', '不联系也安心': 'OK apart',
  '无需维系': 'No upkeep', '祝福': 'Blessings', '释然': 'Let go',
  '各自精彩': 'Both shine', '遥远的温暖': 'Far warmth',
};

const reverseWordMap: Record<string, string> = {};
for (const [zh, en] of Object.entries(wordMap)) {
  reverseWordMap[en] = zh;
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
}

export function t(key: string, ...args: string[]): string {
  const entry = dict[key];
  if (!entry) return key;
  let s = entry[currentLang] ?? entry.zh;
  args.forEach((arg, i) => {
    s = s.replace(`{${i}}`, arg);
  });
  return s;
}

/** Translate a word for display. Canonical (Chinese) text in, display text out. */
export function tWord(zhText: string): string {
  if (currentLang === 'zh') return zhText;
  return wordMap[zhText] ?? zhText;
}

/** Given a displayed word, return canonical Chinese text for storage. */
export function canonicalWord(displayText: string): string {
  if (currentLang === 'zh') return displayText;
  return reverseWordMap[displayText] ?? displayText;
}
