// needs native-speaker/music-teacher check
const STRINGS = {
  en: {
    "app.title": "Harmony Practice",
    "nav.home": "Home",
    "nav.currentPhase": "Current lesson phase",
    "step.listen": "Listen",
    "step.practice": "Practice",
    "step.review": "Review",
    "language.label": "Language",
    "language.english": "Switch language to English",
    "language.french": "Switch language to French",
    "language.chinese": "Switch language to Simplified Chinese",
    "home.heading.choose": "Choose a section",
    "home.heading.complete": "Curriculum complete",
    "home.section": "Section {n}: {title}",
    "section.1.title": "{tonic}, {dominant}, {subdominant}",
    "section.2.title": "{submediant} and {supertonic}",
    "section.3.title": "{mediant} and {leadingTone}",
    "home.startHere": "Start here",
    "home.guidance": "About 5 minutes. Headphones on. Start with Section 1; Sections 2 and 3 are optional.",
    "home.resume": "Resume where you left off",
    "home.completed": "You have completed all three sections.",
    "home.restart": "Restart curriculum",
    "progress.introduction": "Section {n}: Chord introduction",
    "progress.piece": "Section {section}: Piece {piece} of {total}",
    "music.tonic": "Tonic",
    "music.dominant": "Dominant",
    "music.subdominant": "Subdominant",
    "music.supertonic": "Supertonic",
    "music.mediant": "Mediant",
    "music.submediant": "Submediant",
    "music.leadingTone": "Leading-tone",
    "music.rootNote": "Root note",
    "music.hint": "Hint",
    "intro.reveal": "Reveal {chord} chord",
    "intro.shapeAlt": "{chord} shape",
    "intro.chordLabel": "{chord} / {numeral}",
    "intro.clickExplore": "Click to explore",
    "intro.next": "Next",
    "concept.home": "home",
    "concept.base": "base",
    "concept.stable": "stable",
    "concept.resolution": "resolution",
    "concept.tension": "tension",
    "concept.pull": "pull",
    "concept.expectation": "expectation",
    "concept.return": "return",
    "concept.movement": "movement",
    "concept.support": "support",
    "concept.preparation": "preparation",
    "concept.away": "away",
    "concept.direction": "direction",
    "concept.color": "color",
    "concept.connection": "connection",
    "concept.warmth": "warmth",
    "concept.reflection": "reflection",
    "concept.contrast": "contrast",
    "concept.instability": "instability",
    "listen.heading": "Listen",
    "score.fullAlt": "{piece} full score",
    "listen.note": "Listen to the full piece. No need to interact.",
    "listen.noteUnavailable": "Listen to the full piece, or read through the score, then continue.",
    "listen.continue": "Continue to practice",
    "audio.unavailable": "Audio unavailable",
    "audio.notice": "Audio isn't available. You can still continue without it.",
    "audio.enable": "Tap anywhere to enable sound.",
    "audio.playExcerpt": "Play excerpt",
    "audio.pauseExcerpt": "Pause excerpt",
    "audio.replayExcerpt": "Replay excerpt",
    "audio.progress": "Excerpt playback progress",
    "audio.volume": "Volume",
    "audio.volumeLabel": "Playback volume",
    "audio.playMeasure": "Play measure",
    "audio.playTonic": "Play Tonic",
    "audio.replay": "Replay excerpt",
    "practice.prompt.hear": "What function do you hear?",
    "practice.prompt.fit": "Which function fits these notes?",
    "practice.continue": "Continue",
    "practice.hearChosen": "Hear what you chose",
    "practice.hearChosenAria": "Hear what you chose: {chord}",
    "practice.chooseChord": "Choose chord {chord}",
    "practice.chordAria": "Chord {chord}, not this one",
    "practice.notThisOne": "× not this one",
    "practice.givenContinue": "Continue",
    "hint.showRoot": "Show root note",
    "hint.showChordNotes": "Show chord notes",
    "hint.noMore": "No more hints",
    "hint.rootListen": "Listen to the root note",
    "hint.rootShown": "Root note: {note}",
    "hint.chordListen": "Listen for the chord notes",
    "hint.chordShown": "Chord notes are shown in the score.",
    "hint.popupHeading": "Chord notes",
    "hint.popupAlt": "{chord} chord tones",
    "feedback.wrong": "Not quite. Hint opened.",
    "feedback.wrongListen": "Not quite. Hint opened - listen again.",
    "feedback.correct": "Correct: {chord}",
    "feedback.revealed": "This was {chord}.",
    "feedback.chordImageUnavailable": "Hint image unavailable",
    "feedback.hintUnavailable": "Hint artwork unavailable for {measure}; showing the unhighlighted measure.",
    "feedback.hintUnavailableAlt": "{piece}, {measure}; hint artwork unavailable",
    "measure.label": "Chord {n} of {total}",
    "measure.aria": "Chord {n} of {total}, {state}",
    "measure.yourTurn": "your turn",
    "measure.complete": "complete",
    "measure.upNext": "up next",
    "measure.yourTurnLabel": "Your turn",
    "measure.upNextLabel": "Up next",
    "measure.given": "Given",
    "measure.scoreAlt": "Score for {piece}, {measure}",
    "measure.scoreHintAlt": "Score for {piece}, {measure}, hint {n}",
    "measure.scoreHintWarningAlt": "{piece}, {measure}; hint artwork unavailable",
    "measure.hintWarning": "Hint image unavailable",
    "mastery.solid": "Solid",
    "mastery.guided": "Guided",
    "mastery.supported": "Supported",
    "mastery.aria": "{level} mastery",
    "results.congratulations": "Congratulations!",
    "results.reviewScore": "Review score",
    "results.score": "{correct} of {total} recognised on first listen",
    "results.confusion.one": "You chose {selected} once when it was {correct}.",
    "results.confusion.two": "You chose {selected} twice when it was {correct}.",
    "results.confusion.other": "You chose {selected} {count} times when it was {correct}.",
    "results.chord": "Chord {n}",
    "error.save": "Could not save progress in this tab: {message}",
    "error.read": "Could not read saved progress in this tab: {message}",
    "error.unsupportedProgress": "Saved progress has an unsupported format.",
    "error.restore": "Could not restore saved progress: {message}",
    "error.clear": "Could not clear saved progress in this tab: {message}",
    "error.image": "Could not load image: {path}",
    "error.animate": "Could not animate chord notes: {message}",
    "error.svgHttp": "HTTP {status} while loading {path}.",
    "error.invalidSvg": "The SVG is invalid: {path}",
    "error.viewBox": "The SVG has no valid viewBox: {path}",
    "error.highlightCoordinates": "No highlighted note coordinates were found in {path}."
  },
  fr: {
    "app.title": "Pratique de l’harmonie",
    "nav.home": "Accueil",
    "nav.currentPhase": "Étape actuelle du cours",
    "step.listen": "Écoute",
    "step.practice": "Exercice",
    "step.review": "Bilan",
    "language.label": "Langue",
    "language.english": "Passer en anglais",
    "language.french": "Passer en français",
    "language.chinese": "Passer en chinois simplifié",
    "home.heading.choose": "Choisissez une section",
    "home.heading.complete": "Parcours terminé",
    "home.section": "Section {n} : {title}",
    "section.1.title": "{tonic}, {dominant}, {subdominant}",
    "section.2.title": "{submediant} et {supertonic}",
    "section.3.title": "{mediant} et {leadingTone}",
    "home.startHere": "Commencez ici",
    "home.guidance": "Environ 5 minutes. Mettez votre casque. Commencez par la section 1 ; les sections 2 et 3 sont facultatives.",
    "home.resume": "Reprendre où vous en étiez",
    "home.completed": "Vous avez terminé les trois sections.",
    "home.restart": "Recommencer le parcours",
    "progress.introduction": "Section {n} : découverte des accords",
    "progress.piece": "Section {section} : morceau {piece} sur {total}",
    "music.tonic": "Tonique",
    "music.dominant": "Dominante",
    "music.subdominant": "Sous-dominante",
    "music.supertonic": "Sus-tonique",
    "music.mediant": "Médiante",
    "music.submediant": "Sus-dominante",
    "music.leadingTone": "Sensible",
    "music.rootNote": "Fondamentale",
    "music.hint": "Indice",
    "intro.reveal": "Découvrir l’accord de {chord}",
    "intro.shapeAlt": "Forme de l’accord {chord}",
    "intro.chordLabel": "{chord} / {numeral}",
    "intro.clickExplore": "Cliquez pour explorer",
    "intro.next": "Suivant",
    "concept.home": "foyer",
    "concept.base": "base",
    "concept.stable": "stable",
    "concept.resolution": "résolution",
    "concept.tension": "tension",
    "concept.pull": "attraction",
    "concept.expectation": "attente",
    "concept.return": "retour",
    "concept.movement": "mouvement",
    "concept.support": "soutien",
    "concept.preparation": "préparation",
    "concept.away": "éloignement",
    "concept.direction": "direction",
    "concept.color": "couleur",
    "concept.connection": "liaison",
    "concept.warmth": "chaleur",
    "concept.reflection": "reflet",
    "concept.contrast": "contraste",
    "concept.instability": "instabilité",
    "listen.heading": "Écoute",
    "score.fullAlt": "Partition complète de {piece}",
    "listen.note": "Écoutez le morceau en entier. Vous n’avez rien à faire.",
    "listen.noteUnavailable": "Écoutez le morceau ou parcourez la partition, puis continuez.",
    "listen.continue": "Passer à l’exercice",
    "audio.unavailable": "Audio indisponible",
    "audio.notice": "L’audio est indisponible. Vous pouvez tout de même continuer.",
    "audio.enable": "Touchez l’écran pour activer le son.",
    "audio.playExcerpt": "Lire l’extrait",
    "audio.pauseExcerpt": "Mettre l’extrait en pause",
    "audio.replayExcerpt": "Relire l’extrait",
    "audio.progress": "Progression de la lecture de l’extrait",
    "audio.volume": "Volume",
    "audio.volumeLabel": "Volume de lecture",
    "audio.playMeasure": "Lire la mesure",
    "audio.playTonic": "Jouer la tonique",
    "audio.replay": "Relire l’extrait",
    "practice.prompt.hear": "Quelle fonction entendez-vous ?",
    "practice.prompt.fit": "Quelle fonction correspond à ces notes ?",
    "practice.continue": "Continuer",
    "practice.hearChosen": "Écouter votre réponse",
    "practice.hearChosenAria": "Écouter votre choix : {chord}",
    "practice.chooseChord": "Choisir l’accord {chord}",
    "practice.chordAria": "Accord {chord}, ce n’est pas celui-ci",
    "practice.notThisOne": "× Pas celui-ci",
    "practice.givenContinue": "Continuer",
    "hint.showRoot": "Afficher la fondamentale",
    "hint.showChordNotes": "Afficher les notes de l’accord",
    "hint.noMore": "Plus d’indices",
    "hint.rootListen": "Écoutez la fondamentale",
    "hint.rootShown": "Fondamentale : {note}",
    "hint.chordListen": "Écoutez les notes de l’accord",
    "hint.chordShown": "Les notes de l’accord sont indiquées sur la partition.",
    "hint.popupHeading": "Notes de l’accord",
    "hint.popupAlt": "Notes de l’accord {chord}",
    "feedback.wrong": "Pas tout à fait. Un indice est affiché.",
    "feedback.wrongListen": "Pas tout à fait. Un indice est affiché ; réécoutez.",
    "feedback.correct": "Correct : {chord}",
    "feedback.revealed": "La réponse était {chord}.",
    "feedback.chordImageUnavailable": "Image de l’indice indisponible",
    "feedback.hintUnavailable": "Image de l’indice indisponible pour {measure} ; la partition sans surbrillance est affichée.",
    "feedback.hintUnavailableAlt": "{piece}, {measure} ; image de l’indice indisponible",
    "measure.label": "Accord {n} sur {total}",
    "measure.aria": "Accord {n} sur {total}, {state}",
    "measure.yourTurn": "à vous",
    "measure.complete": "terminé",
    "measure.upNext": "à suivre",
    "measure.yourTurnLabel": "À vous",
    "measure.upNextLabel": "À suivre",
    "measure.given": "Donné",
    "measure.scoreAlt": "Partition de {piece}, {measure}",
    "measure.scoreHintAlt": "Partition de {piece}, {measure}, indice {n}",
    "measure.scoreHintWarningAlt": "{piece}, {measure} ; image de l’indice indisponible",
    "measure.hintWarning": "Image de l’indice indisponible",
    "mastery.solid": "Acquis",
    "mastery.guided": "Guidé",
    "mastery.supported": "Avec aide",
    "mastery.aria": "Maîtrise : {level}",
    "results.congratulations": "Félicitations !",
    "results.reviewScore": "Revoir la partition",
    "results.score": "{correct} sur {total} reconnus dès la première écoute",
    "results.confusion.one": "Vous avez choisi {selected} une fois au lieu de {correct}.",
    "results.confusion.two": "Vous avez choisi {selected} deux fois au lieu de {correct}.",
    "results.confusion.other": "Vous avez choisi {selected} {count} fois au lieu de {correct}.",
    "results.chord": "Accord {n}",
    "error.save": "Impossible d’enregistrer votre progression dans cet onglet : {message}",
    "error.read": "Impossible de lire la progression enregistrée dans cet onglet : {message}",
    "error.unsupportedProgress": "Le format de la progression enregistrée n’est pas pris en charge.",
    "error.restore": "Impossible de restaurer la progression : {message}",
    "error.clear": "Impossible d’effacer la progression dans cet onglet : {message}",
    "error.image": "Impossible de charger l’image : {path}",
    "error.animate": "Impossible d’animer les notes de l’accord : {message}",
    "error.svgHttp": "Erreur HTTP {status} lors du chargement de {path}.",
    "error.invalidSvg": "Le fichier SVG est invalide : {path}",
    "error.viewBox": "Le fichier SVG ne possède pas de viewBox valide : {path}",
    "error.highlightCoordinates": "Aucune coordonnée de note surlignée dans {path}."
  },
  "zh-Hans": {
    "app.title": "和声练习",
    "nav.home": "首页",
    "nav.currentPhase": "当前课程阶段",
    "step.listen": "聆听",
    "step.practice": "练习",
    "step.review": "回顾",
    "language.label": "语言",
    "language.english": "切换为英语",
    "language.french": "切换为法语",
    "language.chinese": "切换为简体中文",
    "home.heading.choose": "选择一个部分",
    "home.heading.complete": "课程已完成",
    "home.section": "第 {n} 部分：{title}",
    "section.1.title": "{tonic}、{dominant}、{subdominant}",
    "section.2.title": "{submediant}与{supertonic}",
    "section.3.title": "{mediant}与{leadingTone}",
    "home.startHere": "从这里开始",
    "home.guidance": "约 5 分钟。请戴上耳机，从第 1 部分开始；第 2、3 部分为选学内容。",
    "home.resume": "继续上次的进度",
    "home.completed": "你已完成全部三个部分。",
    "home.restart": "重新开始课程",
    "progress.introduction": "第 {n} 部分：和弦介绍",
    "progress.piece": "第 {section} 部分：第 {total} 首中的第 {piece} 首",
    "music.tonic": "主和弦",
    "music.dominant": "属和弦",
    "music.subdominant": "下属和弦",
    "music.supertonic": "上主和弦",
    "music.mediant": "中音和弦",
    "music.submediant": "下中音和弦",
    "music.leadingTone": "导音和弦",
    "music.rootNote": "根音",
    "music.hint": "提示",
    "intro.reveal": "查看{chord}和弦",
    "intro.shapeAlt": "{chord}和弦图形",
    "intro.chordLabel": "{chord} / {numeral}",
    "intro.clickExplore": "点击探索",
    "intro.next": "下一步",
    "concept.home": "归属",
    "concept.base": "基础",
    "concept.stable": "稳定",
    "concept.resolution": "解决",
    "concept.tension": "紧张",
    "concept.pull": "牵引",
    "concept.expectation": "期待",
    "concept.return": "回归",
    "concept.movement": "进行",
    "concept.support": "支撑",
    "concept.preparation": "准备",
    "concept.away": "离开",
    "concept.direction": "方向",
    "concept.color": "色彩",
    "concept.connection": "连接",
    "concept.warmth": "温暖",
    "concept.reflection": "沉思",
    "concept.contrast": "对比",
    "concept.instability": "不稳定",
    "listen.heading": "聆听",
    "score.fullAlt": "{piece}完整乐谱",
    "listen.note": "聆听完整乐曲，无需操作。",
    "listen.noteUnavailable": "聆听完整乐曲或浏览乐谱，然后继续。",
    "listen.continue": "继续练习",
    "audio.unavailable": "音频不可用",
    "audio.notice": "音频不可用，你仍可继续。",
    "audio.enable": "点击任意位置以启用声音。",
    "audio.playExcerpt": "播放片段",
    "audio.pauseExcerpt": "暂停片段",
    "audio.replayExcerpt": "重播片段",
    "audio.progress": "片段播放进度",
    "audio.volume": "音量",
    "audio.volumeLabel": "播放音量",
    "audio.playMeasure": "播放当前小节",
    "audio.playTonic": "播放主和弦",
    "audio.replay": "重播片段",
    "practice.prompt.hear": "你听到的是哪种和弦功能？",
    "practice.prompt.fit": "这些音符符合哪种和弦功能？",
    "practice.continue": "继续",
    "practice.hearChosen": "试听你的选择",
    "practice.hearChosenAria": "试听你的选择：{chord}",
    "practice.chooseChord": "选择和弦 {chord}",
    "practice.chordAria": "和弦 {chord}，不是这个",
    "practice.notThisOne": "× 不是这个",
    "practice.givenContinue": "继续",
    "hint.showRoot": "显示根音",
    "hint.showChordNotes": "显示和弦音",
    "hint.noMore": "没有更多提示",
    "hint.rootListen": "聆听根音",
    "hint.rootShown": "根音：{note}",
    "hint.chordListen": "聆听和弦音",
    "hint.chordShown": "乐谱中已标出和弦音。",
    "hint.popupHeading": "和弦音",
    "hint.popupAlt": "{chord}和弦音",
    "feedback.wrong": "不太对。已显示提示。",
    "feedback.wrongListen": "不太对。已显示提示，请再听一次。",
    "feedback.correct": "正确：{chord}",
    "feedback.revealed": "正确答案是 {chord}。",
    "feedback.chordImageUnavailable": "提示图片不可用",
    "feedback.hintUnavailable": "{measure} 的提示图片不可用；现显示未标记的乐谱。",
    "feedback.hintUnavailableAlt": "{piece}，{measure}；提示图片不可用",
    "measure.label": "和弦 {n}/{total}",
    "measure.aria": "和弦 {n}/{total}，{state}",
    "measure.yourTurn": "轮到你",
    "measure.complete": "已完成",
    "measure.upNext": "接下来",
    "measure.yourTurnLabel": "轮到你",
    "measure.upNextLabel": "接下来",
    "measure.given": "已给出",
    "measure.scoreAlt": "{piece}乐谱，{measure}",
    "measure.scoreHintAlt": "{piece}乐谱，{measure}，提示 {n}",
    "measure.scoreHintWarningAlt": "{piece}，{measure}；提示图片不可用",
    "measure.hintWarning": "提示图片不可用",
    "mastery.solid": "熟练",
    "mastery.guided": "引导完成",
    "mastery.supported": "辅助完成",
    "mastery.aria": "掌握程度：{level}",
    "results.congratulations": "恭喜！",
    "results.reviewScore": "查看乐谱",
    "results.score": "首次聆听识别正确 {correct}/{total} 题",
    "results.confusion.one": "你有 1 次把 {selected} 选成了 {correct}。",
    "results.confusion.two": "你有 2 次把 {selected} 选成了 {correct}。",
    "results.confusion.other": "你有 {count} 次把 {selected} 选成了 {correct}。",
    "results.chord": "和弦 {n}",
    "error.save": "无法在此标签页保存进度：{message}",
    "error.read": "无法在此标签页读取已保存的进度：{message}",
    "error.unsupportedProgress": "已保存的进度格式不受支持。",
    "error.restore": "无法恢复已保存的进度：{message}",
    "error.clear": "无法在此标签页清除进度：{message}",
    "error.image": "无法加载图片：{path}",
    "error.animate": "无法播放和弦音动画：{message}",
    "error.svgHttp": "加载 {path} 时出现 HTTP 错误 {status}。",
    "error.invalidSvg": "SVG 文件无效：{path}",
    "error.viewBox": "SVG 文件没有有效的 viewBox：{path}",
    "error.highlightCoordinates": "在 {path} 中未找到高亮音符的坐标。"
  }
};

const LANGUAGE_STORAGE_KEY = "harmony-practice-language";
const warnedMissingTranslations = new Set();

function normalizeLanguage(language) {
  const normalized = String(language || "").toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("zh")) return "zh-Hans";
  return undefined;
}

function initialLanguage() {
  const requested = normalizeLanguage(new URLSearchParams(window.location.search).get("lang"));
  if (requested) return requested;
  try {
    const saved = normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    if (saved) return saved;
  } catch (error) {
    console.warn("Could not read the saved language preference.", error);
  }
  return normalizeLanguage(navigator.language) || "en";
}

let currentLanguage = initialLanguage();

function getLanguage() {
  return currentLanguage;
}

function t(key, vars = {}) {
  let template = STRINGS[currentLanguage][key];
  if (template === undefined) {
    const warningKey = `${currentLanguage}:${key}`;
    if (!warnedMissingTranslations.has(warningKey)) {
      warnedMissingTranslations.add(warningKey);
      console.warn(`Missing ${currentLanguage} translation for "${key}"; using English.`);
    }
    template = STRINGS.en[key] ?? key;
  }
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => {
    const value = vars[name];
    if (value && typeof value === "object" && value.key) return t(value.key, value.vars);
    return value === undefined ? placeholder : String(value);
  });
}

function translationVariables(element, target) {
  const serialized = element.dataset[`i18n${target}Vars`];
  if (!serialized) return {};
  try {
    return JSON.parse(serialized);
  } catch (error) {
    console.warn("Invalid data-i18n-vars value.", error);
    return {};
  }
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n], [data-i18n-aria], [data-i18n-title], [data-i18n-placeholder], [data-i18n-alt]").forEach((element) => {
    if (element.dataset.i18n) element.textContent = t(element.dataset.i18n, translationVariables(element, "Text"));
    if (element.dataset.i18nAria) element.setAttribute("aria-label", t(element.dataset.i18nAria, translationVariables(element, "Aria")));
    if (element.dataset.i18nTitle) element.setAttribute("title", t(element.dataset.i18nTitle, translationVariables(element, "Title")));
    if (element.dataset.i18nPlaceholder) element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder, translationVariables(element, "Placeholder")));
    if (element.dataset.i18nAlt) element.setAttribute("alt", t(element.dataset.i18nAlt, translationVariables(element, "Alt")));
  });
  document.querySelectorAll("#language-switcher [data-lang]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.lang === currentLanguage));
  });
}

function localize(element, key, vars = {}, target = "text") {
  const datasetKey = {
    text: "i18n",
    aria: "i18nAria",
    title: "i18nTitle",
    placeholder: "i18nPlaceholder",
    alt: "i18nAlt"
  }[target];
  if (!datasetKey) throw new Error(`Unsupported translation target: ${target}`);
  element.dataset[datasetKey] = key;
  const varsKey = target === "text" ? "i18nTextVars" : `${datasetKey}Vars`;
  if (Object.keys(vars).length) element.dataset[varsKey] = JSON.stringify(vars);
  else delete element.dataset[varsKey];
  const value = t(key, vars);
  if (target === "text") element.textContent = value;
  else if (target === "aria") element.setAttribute("aria-label", value);
  else if (target === "title") element.setAttribute("title", value);
  else if (target === "placeholder") element.setAttribute("placeholder", value);
  else element.setAttribute("alt", value);
}

function setLanguage(language) {
  const normalized = normalizeLanguage(language);
  if (!normalized) throw new Error(`Unsupported language: ${language}`);
  currentLanguage = normalized;
  applyLanguage();
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  } catch (error) {
    console.warn("Could not save the language preference.", error);
  }
}

applyLanguage();
