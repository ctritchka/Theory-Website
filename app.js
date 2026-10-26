const stageContent = document.querySelector("#stage-content");
const progress = document.querySelector("#progress");
const status = document.querySelector("#status");
const pieceTitle = document.querySelector("#piece-title");
const pieceComposer = document.querySelector("#piece-composer");
const phaseProgress = document.querySelector("#phase-progress");
const homeButton = document.querySelector("#home-button");

const MAX_WRONG_BEFORE_REVEAL = 3;
const HINT_LEVELS = 2;
const ADVANCE_PAUSE_MS = 250;
const ADVANCE_FALLBACK_MS = 1500;
const SESSION_STATE_KEY = "harmony-practice-progress";
const participantId = new URLSearchParams(window.location.search).get("p") || "anon";
const AUDIO_UNAVAILABLE_MESSAGE = "Audio isn't available. You can still continue without it.";

let sectionIndex = 0;
let pieceIndex = 0;
let stage = "introduction";
let introIndex = 0;
let introRevealed = false;
let eventIndex = 0;
let wrongAnswers = 0;
let usedHint = false;
let activeHintLevel = 0;
let answers = [];
let firstTryCorrect = [];
let masteryStates = [];
let wrongSelections = [];
let answerRevealed = false;
let activeAudio;
let listenAudio;
let listenPosition = 0;
let listenDuration = 0;
let savedProgress;
let autoplayReview = false;
let answerAdvanceTimer;
let completionVisible = false;
let audioVolume = 0.75;
let curriculumComplete = false;
let answerCelebrating = false;
let replays = 0;
let audioUnavailable = false;
let audioUnavailableLogged = false;
let pendingChordAdvance;
const preloadedAudio = new Map();
const boundListenAudio = new WeakSet();
const interactionLog = [];
const audioAvailabilityTimers = new WeakMap();

function assetUrl(path) {
  return `assets/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function currentSection() {
  return SECTIONS[sectionIndex];
}

function currentPiece() {
  return currentSection().pieces[pieceIndex];
}

function logInteraction(eventName, details = {}) {
  const piece = currentPiece();
  const event = piece.events[Math.min(eventIndex, piece.events.length - 1)];
  interactionLog.push({
    timestamp: new Date().toISOString(),
    participant: participantId,
    piece: piece.title,
    measure: event?.measure ?? null,
    event: eventName,
    chosen: details.chosen ?? null,
    correct: details.correct ?? null,
    wrongCount: wrongAnswers,
    hintLevel: activeHintLevel,
    hintSource: details.hintSource ?? null,
    replays
  });
}

function downloadInteractionLog() {
  const date = new Date().toISOString().slice(0, 10);
  const safeParticipant = participantId.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "anon";
  const blob = new Blob([JSON.stringify(interactionLog, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeParticipant}-${date}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function setStatus(message) {
  status.textContent = audioUnavailable ? AUDIO_UNAVAILABLE_MESSAGE : message;
  status.classList.toggle("audio-unavailable-notice", audioUnavailable);
}

function setAudioUnavailable() {
  if (audioUnavailable) return;
  audioUnavailable = true;
  if (!audioUnavailableLogged) {
    audioUnavailableLogged = true;
    logInteraction("audio_unavailable");
  }
  setStatus(AUDIO_UNAVAILABLE_MESSAGE);
  syncAudioUnavailableUI();
  if (pendingChordAdvance) finishChordAnswerAdvance(1200);
}

function cancelPendingChordAdvance() {
  if (!pendingChordAdvance) return;
  window.clearTimeout(pendingChordAdvance.fallbackTimer);
  pendingChordAdvance = undefined;
}

function finishChordAnswerAdvance(delay) {
  if (!pendingChordAdvance) return;
  cancelPendingChordAdvance();
  window.clearTimeout(answerAdvanceTimer);
  answerAdvanceTimer = window.setTimeout(() => {
    if (stage === "measures") advanceMeasure();
  }, delay);
}

function scheduleChordAnswerAdvance(audio) {
  if (!audio || audioUnavailable) {
    answerAdvanceTimer = window.setTimeout(() => {
      if (stage === "measures") advanceMeasure();
    }, 1200);
    return;
  }
  pendingChordAdvance = { audio, fallbackTimer: undefined };
  audio.addEventListener("ended", () => finishChordAnswerAdvance(ADVANCE_PAUSE_MS), { once: true });
  const checkForClipEnd = () => {
    if (pendingChordAdvance?.audio !== audio) return;
    const reachedEnd = audio.ended
      || (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration - 0.05);
    if (reachedEnd) {
      finishChordAnswerAdvance(ADVANCE_PAUSE_MS);
      return;
    }
    if (audioUnavailable) {
      finishChordAnswerAdvance(1200);
      return;
    }
    if (audio.paused) {
      setAudioUnavailable();
      return;
    }
    pendingChordAdvance.fallbackTimer = window.setTimeout(checkForClipEnd, 200);
  };
  pendingChordAdvance.fallbackTimer = window.setTimeout(checkForClipEnd, ADVANCE_FALLBACK_MS);
}

function playAudio(path, label, onEnded, startAt = 0) {
  if (audioUnavailable) return null;
  setStatus("");
  if (window.location.protocol === "file:") {
    setAudioUnavailable();
    return;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }

  let audio = preloadedAudio.get(path);
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.src = assetUrl(path);
    audio.load();
  }
  preloadedAudio.delete(path);
  audio.currentTime = startAt;
  audio.volume = audioVolume;
  activeAudio = audio;
  const clearAvailabilityTimer = () => {
    window.clearTimeout(audioAvailabilityTimers.get(audio));
    audioAvailabilityTimers.delete(audio);
  };
  const markPlayable = () => clearAvailabilityTimer();
  audio.addEventListener("canplay", markPlayable);
  audio.addEventListener("playing", markPlayable);
  audio.addEventListener("error", () => {
    clearAvailabilityTimer();
    if (activeAudio === audio) setAudioUnavailable();
  }, { once: true });
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    markPlayable();
  } else {
    audioAvailabilityTimers.set(audio, window.setTimeout(() => {
      if (audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) setAudioUnavailable();
    }, 4000));
  }
  audio.addEventListener("ended", () => {
    if (activeAudio === audio) {
      if (path === currentPiece().fullAudio) preloadAudio(path);
      if (onEnded) onEnded();
    }
  }, { once: true });
  audio.play().catch((error) => {
    if (activeAudio !== audio || error.name === "AbortError") return;
    setAudioUnavailable();
  });
  return audio;
}

function syncAudioUnavailableUI() {
  if (!audioUnavailable) return;
  if (stage === "piece-preview") {
    const note = stageContent.querySelector(".listening-mode p");
    if (note) note.textContent = "Listen to the full piece, or read through the score, then continue.";
  }
  if (stage === "measures") {
    const prompt = stageContent.querySelector(".question-prompt");
    if (prompt) prompt.textContent = "Which function fits these notes?";
    stageContent.querySelectorAll(".piece-controls .icon-button, .hear-chosen-button").forEach((button) => {
      button.disabled = true;
      button.setAttribute("aria-label", "Audio unavailable");
      button.replaceChildren(document.createTextNode("Audio unavailable"));
    });
    const hintMessage = stageContent.querySelector(".hint-message");
    if (hintMessage && activeHintLevel > 0) {
      const chord = currentPiece().events[eventIndex];
      hintMessage.textContent = activeHintLevel === 1
        ? `Root note: ${CHORDS[chord.chord].note}`
        : "Chord notes are shown in the score.";
    }
    const feedback = stageContent.querySelector("#answer-feedback");
    if (feedback && (wrongAnswers > 0 || answerRevealed)) {
      feedback.textContent = wrongAnswerFeedbackText();
    }
  }
  const listenButton = stageContent.querySelector(".listen-player .icon-button");
  if (listenButton) {
    listenButton.disabled = true;
    listenButton.setAttribute("aria-label", "Audio unavailable");
    listenButton.querySelector(".playback-icon").textContent = "";
    listenButton.querySelector(".listen-play-label").textContent = "Audio unavailable";
  }
}

function createProgressSnapshot() {
  return {
    sectionIndex,
    pieceIndex,
    stage,
    introIndex,
    introRevealed,
    eventIndex,
    wrongAnswers,
    usedHint,
    activeHintLevel,
    answers,
    firstTryCorrect,
    masteryStates,
    wrongSelections,
    answerRevealed,
    audioVolume,
    curriculumComplete,
    completionVisible,
    listenPosition: listenAudio?.currentTime ?? listenPosition,
    listenDuration: listenAudio && Number.isFinite(listenAudio.duration) ? listenAudio.duration : listenDuration
  };
}

function saveProgress() {
  if (stage === "home") return;
  savedProgress = createProgressSnapshot();
  try {
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(savedProgress));
  } catch (error) {
    setStatus(`Could not save progress in this tab: ${error.message}`);
  }
}

function restoreProgress(snapshot) {
  sectionIndex = snapshot.sectionIndex;
  pieceIndex = snapshot.pieceIndex;
  stage = snapshot.stage;
  introIndex = snapshot.introIndex;
  introRevealed = snapshot.introRevealed;
  eventIndex = snapshot.eventIndex;
  wrongAnswers = snapshot.wrongAnswers;
  usedHint = snapshot.usedHint;
  activeHintLevel = snapshot.activeHintLevel;
  answers = snapshot.answers;
  firstTryCorrect = snapshot.firstTryCorrect;
  masteryStates = snapshot.masteryStates;
  wrongSelections = snapshot.wrongSelections;
  answerRevealed = snapshot.answerRevealed;
  audioVolume = snapshot.audioVolume;
  curriculumComplete = snapshot.curriculumComplete;
  completionVisible = snapshot.completionVisible;
  listenPosition = listenAudio ? snapshot.listenPosition : 0;
  listenDuration = snapshot.listenDuration;
  activeAudio = undefined;
}

function loadSavedProgress() {
  let serialized;
  try {
    serialized = sessionStorage.getItem(SESSION_STATE_KEY);
  } catch (error) {
    setStatus(`Could not read saved progress in this tab: ${error.message}`);
    return;
  }
  if (!serialized) return;
  try {
    const snapshot = JSON.parse(serialized);
    const valid = snapshot
      && Number.isInteger(snapshot.sectionIndex)
      && snapshot.sectionIndex >= 0
      && snapshot.sectionIndex < SECTIONS.length
      && Number.isInteger(snapshot.pieceIndex)
      && snapshot.pieceIndex >= 0
      && snapshot.pieceIndex < SECTIONS[snapshot.sectionIndex].pieces.length
      && ["introduction", "piece-preview", "measures", "piece-review"].includes(snapshot.stage)
      && Array.isArray(snapshot.answers)
      && Array.isArray(snapshot.firstTryCorrect)
      && Array.isArray(snapshot.masteryStates)
      && Array.isArray(snapshot.wrongSelections)
      && Number.isFinite(snapshot.listenPosition)
      && Number.isFinite(snapshot.listenDuration)
      && Number.isFinite(snapshot.audioVolume);
    if (!valid) throw new Error("Saved progress has an unsupported format.");
    savedProgress = snapshot;
    restoreProgress(snapshot);
  } catch (error) {
    setStatus(`Could not restore saved progress: ${error.message}`);
  }
}

function clearSavedProgress() {
  savedProgress = undefined;
  try {
    sessionStorage.removeItem(SESSION_STATE_KEY);
  } catch (error) {
    setStatus(`Could not clear saved progress in this tab: ${error.message}`);
  }
}

function bindListenAudio(audio) {
  if (boundListenAudio.has(audio)) return;
  boundListenAudio.add(audio);
  ["loadedmetadata", "durationchange", "timeupdate", "play", "pause", "ended"].forEach((eventName) => {
    audio.addEventListener(eventName, refreshListenPlayer);
  });
  audio.addEventListener("timeupdate", () => {
    const second = Math.floor(audio.currentTime);
    if (second === Number(audio.dataset.savedSecond)) return;
    audio.dataset.savedSecond = String(second);
    listenPosition = audio.currentTime;
    saveProgress();
  });
}

function preloadAudio(path) {
  if (window.location.protocol === "file:" || preloadedAudio.has(path)) return;
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = assetUrl(path);
  audio.load();
  preloadedAudio.set(path, audio);
}

function image(path, alt, className = "score") {
  const element = document.createElement("img");
  element.className = className;
  element.src = assetUrl(path);
  element.alt = alt;
  element.addEventListener("error", () => {
    setStatus(`Could not load image: ${path}`);
  }, { once: true });
  return element;
}

function resetPiece() {
  window.clearTimeout(answerAdvanceTimer);
  cancelPendingChordAdvance();
  if (listenAudio) {
    listenAudio.pause();
    if (activeAudio === listenAudio) activeAudio = undefined;
    listenAudio = undefined;
  }
  listenPosition = 0;
  listenDuration = 0;
  eventIndex = 0;
  wrongAnswers = 0;
  usedHint = false;
  activeHintLevel = 0;
  answerCelebrating = false;
  replays = 0;
  answers = [];
  firstTryCorrect = [];
  masteryStates = [];
  wrongSelections = [];
  answerRevealed = false;
  completionVisible = false;
}

function setStage(nextStage) {
  window.clearTimeout(answerAdvanceTimer);
  if (stage !== nextStage) cancelPendingChordAdvance();
  stage = nextStage;
  setStatus("");
  render();
}

function renderProgress() {
  const piece = currentPiece();
  const atPiece = !["home", "introduction"].includes(stage);
  stageContent.classList.toggle("is-practice", stage === "measures");
  pieceTitle.textContent = stage === "home" ? "Harmony Practice" : stage === "introduction" ? "" : piece.workTitle;
  pieceTitle.hidden = stage === "introduction";
  pieceComposer.textContent = stage === "home" || stage === "introduction" ? "" : piece.composer;
  progress.textContent = stage === "home"
    ? ""
    : stage === "introduction"
      ? `Section ${sectionIndex + 1}: Chord introduction`
      : `Section ${sectionIndex + 1}: Piece ${pieceIndex + 1} of ${currentSection().pieces.length}`;
  homeButton.hidden = stage === "home";
  homeButton.classList.add("quiet-button");
  phaseProgress.replaceChildren();
  phaseProgress.hidden = !atPiece;
  if (atPiece) {
    const currentStep = stage === "piece-preview" ? 0 : stage === "measures" ? 1 : 2;
    const steps = document.createElement("ol");
    steps.className = "lesson-steps";
    ["Listen", "Practice", "Review"].forEach((label, index) => {
      const step = document.createElement("li");
      step.className = `lesson-step${index === currentStep ? " is-current" : ""}${index < currentStep ? " is-complete" : ""}${index > currentStep ? " is-upcoming" : ""}`;
      if (index === currentStep) step.setAttribute("aria-current", "step");
      const number = document.createElement("span");
      number.className = "lesson-step-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = index < currentStep ? "✓" : String(index + 1);
      const name = document.createElement("span");
      name.className = "lesson-step-label";
      name.textContent = label;
      step.append(number, name);
      steps.append(step);
    });
    phaseProgress.append(steps);
  }
}

function renderHome() {
  const heading = document.createElement("h2");
  heading.textContent = curriculumComplete ? "Curriculum complete" : "Choose a section";
  const choices = document.createElement("div");
  choices.className = "section-choices";
  SECTIONS.forEach((section, index) => {
    const choice = document.createElement("div");
    choice.className = "section-choice";
    const title = index === 2
      ? "Mediant and Leading-tone"
      : section.title.replace(/^Section \d+:\s*/, "");
    choice.append(makeButton(`Section ${index + 1}: ${title}`, () => {
      curriculumComplete = false;
      clearSavedProgress();
      sectionIndex = index;
      pieceIndex = 0;
      introIndex = 0;
      introRevealed = false;
      resetPiece();
      setStage("introduction");
    }));
    if (index === 0) {
      const marker = document.createElement("span");
      marker.className = "start-here-marker";
      marker.textContent = "Start here";
      choice.append(marker);
    }
    choices.append(choice);
  });
  const guidance = document.createElement("p");
  guidance.className = "home-guidance";
  guidance.textContent = "About 5 minutes. Headphones on. Start with Section 1; Sections 2 and 3 are optional.";
  if (savedProgress) {
    const resume = makeButton("Resume where you left off", () => {
      const snapshot = savedProgress;
      if (!snapshot) return;
      restoreProgress(snapshot);
      render();
    }, "resume-progress");
    stageContent.replaceChildren(heading, guidance, resume, choices);
    return;
  }
  if (curriculumComplete) {
    const message = document.createElement("p");
    message.textContent = "You have completed all three sections.";
    const restart = makeButton("Restart curriculum", () => {
      curriculumComplete = false;
      clearSavedProgress();
      sectionIndex = 0;
      pieceIndex = 0;
      introIndex = 0;
      introRevealed = false;
      resetPiece();
      setStage("introduction");
    }, "primary-action");
    stageContent.replaceChildren(heading, guidance, message, restart, choices);
    return;
  }
  stageContent.replaceChildren(heading, guidance, choices);
}

function makeButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener("click", onClick);
  return button;
}

function createKeyHint(key) {
  const hint = document.createElement("kbd");
  hint.className = "key-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.textContent = key;
  return hint;
}

function handleKeyboardShortcuts(event) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (event.shiftKey && event.key.toLowerCase() === "l") {
    event.preventDefault();
    downloadInteractionLog();
    return;
  }
  if (event.target instanceof HTMLElement
    && event.target.closest("input, textarea, select, [contenteditable='true']")) return;

  if (stage !== "measures") return;
  if (/^[1-9]$/.test(event.key)) {
    const answerButton = stageContent.querySelector(`[data-key-number="${event.key}"]:not(:disabled)`);
    if (answerButton) {
      event.preventDefault();
      answerButton.click();
    }
    return;
  }
  if (event.key.toLowerCase() === "h") {
    const hintButton = stageContent.querySelector(".hint-button:not(:disabled)");
    if (hintButton) {
      event.preventDefault();
      hintButton.click();
    }
    return;
  }
  if (event.key.toLowerCase() === "r") {
    const replayButton = stageContent.querySelector('[data-key-shortcut="r"]:not(:disabled)');
    if (replayButton) {
      event.preventDefault();
      replayButton.click();
    }
  }
}

function renderChordIntroduction() {
  const section = currentSection();
  const numeral = section.newChords[introIndex];
  const chord = CHORDS[numeral];
  const intro = document.createElement("section");
  intro.className = `chord-intro${introRevealed ? " is-revealed" : ""}`;
  const words = document.createElement("div");
  words.className = "intro-atmosphere";
  words.setAttribute("aria-hidden", "true");
  const concepts = {
    I: ["home", "base", "stable", "resolution"],
    V: ["tension", "pull", "expectation", "return"],
    IV: ["movement", "support", "preparation", "away"],
    ii: ["preparation", "movement", "direction", "support"],
    iii: ["color", "connection", "warmth", "movement"],
    vi: ["reflection", "warmth", "contrast", "color"],
    "vii°": ["tension", "instability", "pull", "resolution"]
  };
  concepts[numeral].forEach((word, index) => {
    const concept = document.createElement("span");
    concept.className = `atmosphere-word word-${index + 1}`;
    concept.textContent = word;
    words.append(concept);
  });

  const shapeButton = makeButton("", () => {
    if (introRevealed) return;
    introRevealed = true;
    intro.classList.add("is-revealed");
    renderChordVisual(chord, intro.querySelector(".intro-chord-visual"));
    intro.querySelector(".intro-next").hidden = false;
    playAudio(chord.audio, `${chord.label} chord`);
    saveProgress();
  }, "intro-shape-button");
  shapeButton.setAttribute("aria-label", `Reveal ${chordFunctionLabel(chord)} chord`);
  shapeButton.append(image(`shapes/${chord.shape}`, `${chordFunctionLabel(chord)} shape`, "intro-shape"));
  const clickCue = document.createElement("span");
  clickCue.className = "intro-click-cue";
  clickCue.textContent = "Click to explore";
  shapeButton.append(clickCue);

  const visual = document.createElement("div");
  visual.className = "intro-chord-visual";
  const label = document.createElement("p");
  label.className = "intro-chord-label";
  label.textContent = `${chordFunctionLabel(chord)} / ${chord.label}`;
  const reveal = document.createElement("div");
  reveal.className = "intro-reveal";
  reveal.append(visual, label);
  const layout = document.createElement("div");
  layout.className = "intro-layout";
  layout.append(shapeButton, reveal);

  const next = makeButton("Next", () => {
    if (!introRevealed) return;
    if (introIndex + 1 < section.newChords.length) {
      introIndex += 1;
      introRevealed = false;
      renderChordIntroduction();
      return;
    }
    resetPiece();
    setStage("piece-preview");
  }, "intro-next primary-action");
  next.hidden = !introRevealed;
  intro.append(words, layout, next);
  stageContent.replaceChildren(intro);
  preloadAudio(currentPiece().fullAudio);
  playAudio(`audio/notes/${chord.note}.mp3`, `${chord.note} root note`);
  saveProgress();
}

function returnToHome() {
  logInteraction("exit");
  if (activeAudio) {
    activeAudio.pause();
    if (activeAudio === listenAudio) listenPosition = activeAudio.currentTime;
    activeAudio = undefined;
  }
  saveProgress();
  setStage("home");
}

function shapeImage(numeral, alt = "") {
  return image(`shapes/${CHORDS[numeral].shape}`, alt, "shape-image");
}

function chordFunctionLabel(chord) {
  return chord.function === "Subtonic" ? "Leading-tone" : chord.function;
}

function renderChoiceButtons(chords) {
  const choices = document.createElement("div");
  choices.className = "choice-grid";
  const numeralOrder = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
  numeralOrder.filter((numeral) => chords.includes(numeral)).forEach((numeral, index) => {
    const chord = CHORDS[numeral];
    const button = makeButton("", () => {}, "choice-button");
    button.dataset.answer = numeral;
    button.dataset.keyNumber = String(index + 1);
    button.setAttribute("aria-keyshortcuts", String(index + 1));
    button.setAttribute("aria-label", `Choose chord ${chord.label}`);
    if (wrongSelections[eventIndex]?.includes(numeral)) {
      button.disabled = true;
      button.classList.add("is-wrong");
      button.title = "not this one";
    }
    const art = document.createElement("span");
    art.className = "choice-art";
    art.append(shapeImage(numeral, `${chordFunctionLabel(chord)} shape`));
    const label = document.createElement("span");
    label.className = "choice-function";
    label.textContent = chordFunctionLabel(chord);
    const numeralLabel = document.createElement("span");
    numeralLabel.className = "choice-numeral";
    numeralLabel.textContent = chord.label;
    button.append(art, numeralLabel, label);
    button.append(createKeyHint(String(index + 1)));
    if (wrongSelections[eventIndex]?.includes(numeral)) {
      const wrongLabel = document.createElement("span");
      wrongLabel.className = "wrong-choice-label";
      wrongLabel.textContent = "× not this one";
      button.append(wrongLabel);
      button.setAttribute("aria-label", `Chord ${chord.label}, not this one`);
    }
    choices.append(button);
  });
  return choices;
}

function renderPiecePreview() {
  const piece = currentPiece();
  const listeningMode = document.createElement("section");
  listeningMode.className = "listening-mode";
  const heading = document.createElement("h2");
  heading.textContent = "Listen";
  const note = document.createElement("p");
  note.textContent = audioUnavailable
    ? "Listen to the full piece, or read through the score, then continue."
    : "Listen to the full piece. No need to interact.";
  listeningMode.append(heading, note);
  const score = image(piece.fullScore, `${piece.title} full score`, "score full-score");
  const controls = document.createElement("div");
  controls.className = "piece-controls listening-controls";
  controls.append(renderListenPlayer(piece), renderVolumeControl());
  const continueButton = makeButton("Continue to practice", beginMeasures, "primary-action continue-practice");
  stageContent.replaceChildren(listeningMode, controls, score);
  stageContent.append(continueButton);
}

function renderListenPlayer(piece) {
  const player = document.createElement("div");
  player.className = "listen-player";
  const playButton = makeIconButton("▶", "Play excerpt", toggleListenPlayback);
  const playLabel = document.createElement("span");
  playLabel.className = "listen-play-label";
  playLabel.textContent = "Play excerpt";
  playButton.lastChild.replaceWith(playLabel);
  const progress = document.createElement("progress");
  progress.className = "listen-progress";
  progress.max = String(listenDuration || 1);
  progress.value = String(listenPosition);
  progress.setAttribute("aria-label", "Excerpt playback progress");
  const time = document.createElement("span");
  time.className = "listen-time";
  const update = () => updateListenPlayer(playButton, progress, time);
  player.append(playButton, progress, time);
  player.dataset.audioPath = piece.fullAudio;
  if (listenAudio) {
    bindListenAudio(listenAudio);
  }
  if (audioUnavailable) playButton.disabled = true;
  update();
  return player;
}

function toggleListenPlayback() {
  if (audioUnavailable) return;
  const player = stageContent.querySelector(".listen-player");
  if (!player) return;
  let audio = listenAudio;
  if (!audio) {
    audio = playAudio(player.dataset.audioPath, `${currentPiece().title} full piece`, undefined, listenPosition);
    if (!audio) return;
    listenAudio = audio;
    bindListenAudio(audio);
  } else if (!audio.paused && !audio.ended) {
    audio.pause();
    listenPosition = audio.currentTime;
    saveProgress();
    refreshListenPlayer();
    return;
  } else {
    if (audio.ended) audio.currentTime = 0;
    if (activeAudio && activeAudio !== audio) activeAudio.pause();
    activeAudio = audio;
    audio.play().catch((error) => {
      if (activeAudio !== audio || error.name === "AbortError") return;
      setAudioUnavailable();
    });
  }
  refreshListenPlayer();
}

function updateListenPlayer(button, progress, time) {
  const audio = listenAudio;
  if (audio && Number.isFinite(audio.duration)) listenDuration = audio.duration;
  const duration = listenDuration;
  const position = audio ? audio.currentTime : listenPosition;
  progress.max = String(duration || 1);
  progress.value = String(Math.min(position, duration || position));
  const playing = Boolean(audio && !audio.paused && !audio.ended);
  const label = audioUnavailable
    ? "Audio unavailable"
    : playing ? "Pause excerpt" : audio?.ended ? "Replay excerpt" : "Play excerpt";
  button.disabled = audioUnavailable;
  button.setAttribute("aria-label", label);
  button.querySelector(".playback-icon").textContent = audioUnavailable ? "" : playing ? "Ⅱ" : "▶";
  button.querySelector(".listen-play-label").textContent = label;
  time.textContent = `${formatPlaybackTime(position)} / ${duration ? formatPlaybackTime(duration) : "--:--"}`;
}

function refreshListenPlayer() {
  const player = stageContent.querySelector(".listen-player");
  if (!player) return;
  updateListenPlayer(
    player.querySelector(".icon-button"),
    player.querySelector(".listen-progress"),
    player.querySelector(".listen-time")
  );
}

function formatPlaybackTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function renderPieceControls() {
  const controls = document.createElement("div");
  controls.className = "piece-controls";
  if (stage === "measures") {
    const replayButton = makeIconButton("▶", "Play measure", replayCurrentMeasure);
    replayButton.dataset.keyShortcut = "r";
    replayButton.setAttribute("aria-keyshortcuts", "R");
    replayButton.append(createKeyHint("R"));
    controls.append(replayButton);
    controls.append(makeIconButton("♪", "Play Tonic", () => {
      playAudio(CHORDS.I.audio, "Tonic chord");
    }));
    controls.lastElementChild.classList.add("secondary-control");
  } else if (stage === "piece-review") {
    controls.append(makeIconButton("↻", "Replay excerpt", () => {
      replays += 1;
      logInteraction("replay");
      completionVisible = false;
      renderPieceReview();
      playAudio(currentPiece().fullAudio, `${currentPiece().title} with answers`, finishPiece);
    }));
  }
  controls.append(renderVolumeControl());
  if (audioUnavailable && stage !== "piece-preview") {
    controls.querySelectorAll(".icon-button").forEach((button) => {
      button.disabled = true;
      button.setAttribute("aria-label", "Audio unavailable");
      button.replaceChildren(document.createTextNode("Audio unavailable"));
    });
  }
  return controls;
}

function makeIconButton(icon, label, onClick) {
  const button = makeButton(label, onClick, "icon-button");
  const iconElement = document.createElement("span");
  iconElement.className = "playback-icon";
  iconElement.setAttribute("aria-hidden", "true");
  iconElement.textContent = icon;
  button.prepend(iconElement);
  button.setAttribute("aria-label", label);
  return button;
}

function renderVolumeControl() {
  const container = document.createElement("label");
  container.className = "volume-control";
  const label = document.createElement("span");
  label.textContent = "Volume";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "1";
  slider.step = "0.05";
  slider.value = String(audioVolume);
  slider.setAttribute("aria-label", "Playback volume");
  slider.addEventListener("input", () => {
    audioVolume = Number(slider.value);
    if (activeAudio) activeAudio.volume = audioVolume;
  });
  container.append(label, slider);
  return container;
}

function beginMeasures() {
  if (stage !== "piece-preview") return;
  if (listenAudio) {
    listenAudio.pause();
    listenAudio = undefined;
  }
  listenPosition = 0;
  resetPiece();
  setStage("measures");
  playCurrentMeasure();
}

function replayCurrentMeasure() {
  replays += 1;
  logInteraction("replay");
  playCurrentMeasure();
}

function playCurrentMeasure() {
  const event = currentPiece().events[eventIndex];
  const onEnded = isInteractive(event) ? undefined : advanceMeasure;
  playAudio(`${currentPiece().audioFolder}${event.audio}`, `${currentPiece().title}, ${event.measure}`, onEnded);
}

function isInteractive(event) {
  return currentPiece().interactiveChords.includes(event.chord);
}

function measureScorePath(event) {
  const piece = currentPiece();
  return `${piece.scoreFolder}${event.measure}.svg`;
}

function renderScoreSequence() {
  const piece = currentPiece();
  const sequence = document.createElement("div");
  sequence.className = "score-sequence";
  const groupedEvents = [];
  piece.events.forEach((event, index) => {
    let group = groupedEvents.find((candidate) => candidate.measure === event.measure);
    if (!group) {
      group = { measure: event.measure, indices: [], event };
      groupedEvents.push(group);
    }
    group.indices.push(index);
  });
  groupedEvents.forEach((group, groupIndex) => {
    const { event, indices } = group;
    const item = document.createElement("div");
    const isCurrent = indices.includes(eventIndex);
    const answered = indices.map((answerIndex) => {
      const groupedEvent = piece.events[answerIndex];
      return answers[answerIndex] || (!isInteractive(groupedEvent) ? groupedEvent.chord : "");
    }).filter(Boolean);
    const isComplete = answered.length === indices.length;
    item.className = `measure-tile${isCurrent ? " is-active" : " is-muted"}${isComplete ? " is-complete is-done" : ""}`;
    item.dataset.measureId = event.measure;
    item.dataset.measureIndex = String(groupIndex + 1);
    item.setAttribute("role", "group");
    const measureState = isCurrent ? "your turn" : isComplete ? "complete" : "up next";
    item.setAttribute("aria-label", `Chord ${groupIndex + 1} of ${groupedEvents.length}, ${measureState}`);
    const label = document.createElement("span");
    label.className = "measure-label";
    label.textContent = `Chord ${groupIndex + 1} of ${groupedEvents.length}`;
    const tileScore = document.createElement("div");
    tileScore.className = "tile-score";
    let scorePath = measureScorePath(event);
    if (isCurrent && activeHintLevel > 0) {
      const hintType = activeHintLevel === 1 ? "root note" : "chord note";
      scorePath = `scores/${hintType} highlight/Section ${sectionIndex + 1}/${piece.title}/${event.measure}.svg`;
    }
    if (isCurrent && answerCelebrating) {
      scorePath = `scores/chord note highlight/Section ${sectionIndex + 1}/${piece.title}/${event.measure}.svg`;
    }
    const score = image(scorePath, `${piece.title}, ${event.measure}${isCurrent && activeHintLevel ? `, hint ${activeHintLevel}` : ""}`);
    if (isCurrent && activeHintLevel === HINT_LEVELS) score.classList.add("has-chord-note-halos");
    if (isCurrent && activeHintLevel > 0) {
      score.addEventListener("error", () => {
        score.src = assetUrl(measureScorePath(event));
        score.alt = `${piece.title}, ${event.measure}; hint artwork unavailable`;
        const tile = score.closest(".measure-tile");
        if (!tile.querySelector(".hint-warning")) {
          const warning = document.createElement("span");
          warning.className = "hint-warning";
          warning.textContent = "Hint image unavailable";
          tile.append(warning);
        }
        setStatus(`Hint artwork unavailable for ${event.measure}; showing the unhighlighted measure.`);
      }, { once: true });
    }
    tileScore.append(score);
    if (answered.length) {
      const completion = document.createElement("span");
      completion.className = "completion-mark";
      answered.forEach((answer, answerIndex) => {
        if (answerIndex) completion.append(document.createTextNode(" · "));
        completion.append(shapeImage(answer));
        const answerLabel = document.createElement("span");
        answerLabel.className = "measure-answer";
        answerLabel.textContent = CHORDS[answer].label;
        completion.append(answerLabel);
      });
      tileScore.append(completion);
    }
    item.append(label, tileScore);
    const tileStatus = document.createElement("span");
    tileStatus.className = `tile-result${isCurrent ? " is-live" : ""}`;
    if (isComplete) {
      const measureMastery = [...new Set(indices.map((answerIndex) => masteryStates[answerIndex]).filter(Boolean))];
      if (measureMastery.length) {
        measureMastery.forEach((mastery) => tileStatus.append(createMasteryBadge(mastery)));
      } else {
        tileStatus.textContent = "GIVEN";
      }
    } else {
      tileStatus.textContent = isCurrent ? "YOUR TURN" : "UP NEXT";
    }
    item.append(tileStatus);
    sequence.append(item);
  });
  return sequence;
}

function renderMeasures() {
  const piece = currentPiece();
  const event = piece.events[eventIndex];
  const sequence = renderScoreSequence();
  const controls = renderPieceControls();
  const current = document.createElement("section");
  current.className = "current-measure";
  let popupPanel;

  if (!isInteractive(event)) {
    const given = document.createElement("p");
    given.className = "given-answer";
    given.textContent = `${chordFunctionLabel(CHORDS[event.chord])} · ${CHORDS[event.chord].label}`;
    current.append(given);
  } else {
    const prompt = document.createElement("p");
    prompt.className = "question-prompt";
      prompt.textContent = audioUnavailable ? "Which function fits these notes?" : "What function do you hear?";
    const introducedChords = new Set(SECTIONS.slice(0, sectionIndex + 1).flatMap((section) => section.numerals));
    const choices = renderChoiceButtons(piece.choices.filter((numeral) => introducedChords.has(numeral)));
    const hintControls = document.createElement("div");
    hintControls.className = "hint-controls";
    const hintButton = makeButton("", () => {
      if (activeHintLevel < HINT_LEVELS) showHint(activeHintLevel + 1, "user");
    }, "hint-button");
    hintButton.dataset.keyShortcut = "h";
    hintButton.setAttribute("aria-keyshortcuts", "H");
    hintButton.append(createKeyHint("H"));
    const hintIcon = document.createElement("span");
    hintIcon.className = "hint-icon";
    hintIcon.setAttribute("aria-hidden", "true");
    hintIcon.textContent = "?";
    const hintLabel = document.createElement("span");
    hintLabel.className = "hint-label";
    const hintDots = document.createElement("span");
    hintDots.className = "hint-dots";
    hintDots.setAttribute("aria-hidden", "true");
    for (let level = 1; level <= HINT_LEVELS; level += 1) {
      const dot = document.createElement("span");
      dot.className = "hint-dot";
      dot.dataset.level = String(level);
      hintDots.append(dot);
    }
    hintButton.append(hintIcon, hintLabel, hintDots);
    hintControls.append(hintButton);
    const hintMessage = document.createElement("p");
    hintMessage.className = "hint-message";
    hintMessage.setAttribute("aria-live", "polite");
    hintControls.append(hintMessage);
    updateHintControl(hintButton);
    current.append(prompt, choices, hintControls);
    const feedback = document.createElement("p");
    feedback.id = "answer-feedback";
    feedback.className = "answer-feedback";
    feedback.setAttribute("aria-live", "polite");
    const hearChosenButton = makeButton("Hear what you chose", () => {
      const selectedChord = CHORDS[stageContent.dataset.lastWrongChoice];
      if (selectedChord?.audio) playAudio(selectedChord.audio, `${selectedChord.label} chord`);
    }, "text-action hear-chosen-button");
    hearChosenButton.hidden = true;
    const revealFeedback = document.createElement("p");
    revealFeedback.className = "reveal-feedback";
    revealFeedback.setAttribute("aria-live", "polite");
    const continueButton = makeButton("Continue", advanceMeasure, "primary-action reveal-continue");
    continueButton.hidden = true;
    const feedbackRow = document.createElement("div");
    feedbackRow.className = "feedback-row";
    const feedbackActions = document.createElement("div");
    feedbackActions.className = "feedback-actions";
    feedbackActions.append(hearChosenButton, continueButton);
    feedbackRow.append(feedback, revealFeedback, feedbackActions);
    current.append(feedbackRow);
    popupPanel = document.createElement("div");
    popupPanel.className = "chord-popup-panel";
    popupPanel.hidden = true;
    current.append(popupPanel);
    current.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => checkAnswer(button.dataset.answer, event, stageContent));
    });
  }

  stageContent.replaceChildren(controls, current, sequence);
  if (isInteractive(event)) {
    const activeTile = sequence.querySelector(".measure-tile.is-active");
    const prompt = current.querySelector(".question-prompt");
    const choices = current.querySelector(".choice-grid");
    const hintControls = current.querySelector(".hint-controls");
    if (activeTile) activeTile.append(prompt, choices, hintControls, popupPanel);
    restoreMeasureFeedback(current, event);
  }
  updateHintControl(stageContent.querySelector(".hint-button"));
  centerActiveMeasure(sequence);
}

function restoreMeasureFeedback(current, event) {
  const hintMessage = stageContent.querySelector(".hint-message");
  const popupPanel = stageContent.querySelector(".chord-popup-panel");
  if (activeHintLevel > 0) {
    hintMessage.textContent = hintInstruction(event);
    if (activeHintLevel >= 2) showChordPopup(CHORDS[event.chord], popupPanel);
  }

  const wrongChoices = wrongSelections[eventIndex] || [];
  const lastWrongChoice = wrongChoices[wrongChoices.length - 1];
  const feedback = current.querySelector("#answer-feedback");
  const hearButton = current.querySelector(".hear-chosen-button");
  const continueButton = current.querySelector(".reveal-continue");
  const revealFeedback = current.querySelector(".reveal-feedback");

  if (lastWrongChoice) {
    stageContent.dataset.lastWrongChoice = lastWrongChoice;
    feedback.textContent = wrongAnswerFeedbackText();
    if (CHORDS[lastWrongChoice]?.audio) {
      hearButton.hidden = false;
      hearButton.setAttribute("aria-label", `Hear what you chose: ${CHORDS[lastWrongChoice].label}`);
    }
  }

  if (answerRevealed) {
    feedback.textContent = wrongAnswerFeedbackText();
    revealFeedback.textContent = `This was ${CHORDS[event.chord].label}.`;
    continueButton.hidden = false;
    stageContent.querySelectorAll("[data-answer], .hint-button, .hear-chosen-button").forEach((button) => {
      button.disabled = true;
    });
  } else if (answers[eventIndex]) {
    feedback.textContent = `Correct: ${CHORDS[event.chord].label}`;
    continueButton.hidden = false;
    stageContent.querySelectorAll("[data-answer], .hint-button").forEach((button) => {
      button.disabled = true;
    });
  }
}

function updateHintControl(button) {
  if (!button) return;
  const label = button.querySelector(".hint-label");
  const noMoreHints = activeHintLevel >= HINT_LEVELS || answerRevealed || Boolean(answers[eventIndex]);
  const nextLabel = noMoreHints
    ? "No more hints"
    : activeHintLevel === 0 ? "Show root note" : "Show chord notes";
  label.textContent = nextLabel;
  button.disabled = noMoreHints;
  button.setAttribute("aria-label", nextLabel);
  button.querySelectorAll(".hint-dot").forEach((dot) => {
    dot.classList.toggle("is-used", Number(dot.dataset.level) <= activeHintLevel);
  });
}

function showHint(hintLevel, source) {
  const piece = currentPiece();
  const event = piece.events[eventIndex];
  usedHint = true;
  activeHintLevel = Math.max(activeHintLevel, Math.min(hintLevel, HINT_LEVELS));
  logInteraction("hint", { hintSource: source });
  console.info("Practice hint shown", { source, level: activeHintLevel, measure: event.measure });
  renderScoreSequenceForCurrent();
  const hintButton = stageContent.querySelector(".hint-button");
  updateHintControl(hintButton);
  const hintControls = stageContent.querySelector(".hint-controls");
  const hintMessage = stageContent.querySelector(".hint-message");
  hintMessage.textContent = hintInstruction(event);
  if (source === "auto") {
    hintControls.classList.remove("is-pulsing");
    void hintControls.offsetWidth;
    hintControls.classList.add("is-pulsing");
    window.setTimeout(() => hintControls.classList.remove("is-pulsing"), 700);
  }

  if (activeHintLevel >= 2) {
    showChordPopup(CHORDS[event.chord], stageContent.querySelector(".chord-popup-panel"));
    if (!audioUnavailable) playAudio(CHORDS[event.chord].audio, `${CHORDS[event.chord].label} chord`);
  } else {
    const popupPanel = stageContent.querySelector(".chord-popup-panel");
    popupPanel.replaceChildren();
    popupPanel.hidden = true;
    if (!audioUnavailable) playAudio(`audio/notes/${CHORDS[event.chord].note}.mp3`, `${CHORDS[event.chord].note} root note`);
  }
  if (wrongAnswers > 0 && activeHintLevel >= HINT_LEVELS && !hasRemainingWrongChoices()) {
    revealAnswer(event, stageContent.querySelector(".current-measure"), false);
  }
}

function hintInstruction(event) {
  if (activeHintLevel === 1) {
    return audioUnavailable
      ? `Root note: ${CHORDS[event.chord].note}`
      : "Listen to the root note";
  }
  return audioUnavailable ? "Chord notes are shown in the score." : "Listen for the chord notes";
}

function wrongAnswerFeedbackText() {
  return audioUnavailable ? "Not quite. Hint opened." : "Not quite. Hint opened - listen again.";
}

function showChordPopup(chord, panel) {
  panel.replaceChildren();
  panel.hidden = false;
  const heading = document.createElement("p");
  heading.textContent = "Chord notes";
  const frame = document.createElement("div");
  frame.className = "hint-popup-frame";
  const popup = image(chord.popup, `${chord.label} chord tones`, "hint-popup");
  frame.append(popup);
  panel.append(heading, frame);
}

function createMasteryBadge(mastery) {
  const badge = document.createElement("span");
  badge.className = `mastery-badge is-${mastery}`;
  badge.textContent = mastery[0].toUpperCase() + mastery.slice(1);
  badge.setAttribute("aria-label", `${mastery} mastery`);
  const icon = document.createElement("span");
  icon.className = "mastery-icon";
  icon.setAttribute("aria-hidden", "true");
  badge.prepend(icon);
  return badge;
}

function masteryBadgesFor(indices, className = "tile-result") {
  const status = document.createElement("span");
  status.className = className;
  const levels = [...new Set(indices.map((index) => masteryStates[index]).filter(Boolean))];
  if (!levels.length) {
    status.textContent = "GIVEN";
    return status;
  }
  levels.forEach((level) => status.append(createMasteryBadge(level)));
  return status;
}

function hasRemainingWrongChoices() {
  const event = currentPiece().events[eventIndex];
  return [...stageContent.querySelectorAll("[data-answer]")].some((button) =>
    button.dataset.answer !== event.chord && !button.disabled
  );
}

function renderChordVisual(chord, container) {
  container.replaceChildren(image(chord.popup, `${chordFunctionLabel(chord)} chord`, "intro-chord-image"));
}

function checkAnswer(selected, event, container) {
  const feedback = container.querySelector("#answer-feedback");
  if (selected === event.chord) {
    logInteraction("answer", { chosen: selected, correct: true });
    answers[eventIndex] = event.chord;
    firstTryCorrect[eventIndex] = wrongAnswers === 0 && !usedHint;
    masteryStates[eventIndex] = activeHintLevel >= HINT_LEVELS
      ? "supported"
      : usedHint
        ? "guided"
        : "solid";
    answerCelebrating = true;
    feedback.textContent = `Correct: ${CHORDS[event.chord].label}`;
    const answerButtons = container.querySelectorAll("[data-answer]");
    const selectedButton = [...answerButtons].find((button) => button.dataset.answer === selected);
    answerButtons.forEach((button) => {
      button.disabled = true;
    });
    container.querySelectorAll(".piece-controls .icon-button").forEach((button) => {
      button.disabled = true;
    });
    container.querySelectorAll(".hint-button").forEach((button) => {
      button.disabled = true;
      updateHintControl(button);
    });
    container.querySelector(".hear-chosen-button").hidden = true;
    container.querySelector(".hint-message").textContent = "";
    const hintPanel = stageContent.querySelector(".chord-popup-panel");
    if (hintPanel) hintPanel.hidden = true;
    setStatus("");
    renderScoreSequenceForCurrent();
    animateMasteryShape();
    if (selectedButton) animateShapeToChordNotes(selectedButton, selected, event);
    playAudio(CHORDS[event.chord].audio, `${CHORDS[event.chord].label} chord`);
    window.clearTimeout(answerAdvanceTimer);
    scheduleChordAnswerAdvance(playAudio(CHORDS[event.chord].audio, `${CHORDS[event.chord].label} chord`));
    return;
  }

  wrongAnswers += 1;
  logInteraction("answer", { chosen: selected, correct: false });
  if (!wrongSelections[eventIndex]) wrongSelections[eventIndex] = [];
  wrongSelections[eventIndex].push(selected);
  const selectedButton = [...container.querySelectorAll("[data-answer]")].find((button) => button.dataset.answer === selected);
  if (selectedButton) {
    selectedButton.disabled = true;
    selectedButton.classList.add("is-wrong");
    selectedButton.setAttribute("aria-label", `Chord ${CHORDS[selected].label}, not this one`);
    selectedButton.title = "not this one";
    const wrongLabel = document.createElement("span");
    wrongLabel.className = "wrong-choice-label";
    wrongLabel.textContent = "× not this one";
    selectedButton.append(wrongLabel);
  }
  feedback.textContent = wrongAnswerFeedbackText();
  container.dataset.lastWrongChoice = selected;
  const hearButton = container.querySelector(".hear-chosen-button");
  if (CHORDS[selected]?.audio) {
    hearButton.hidden = false;
    hearButton.setAttribute("aria-label", `Hear what you chose: ${CHORDS[selected].label}`);
  }
  showHint(Math.min(HINT_LEVELS, Math.max(wrongAnswers, activeHintLevel + 1)), "auto");
  if (wrongAnswers >= MAX_WRONG_BEFORE_REVEAL
    || (activeHintLevel >= HINT_LEVELS && !hasRemainingWrongChoices())) {
    revealAnswer(event, container, activeHintLevel < HINT_LEVELS);
  }
}

function revealAnswer(event, container, playCorrectChord = true) {
  if (answerRevealed) return;
  logInteraction("reveal");
  answerRevealed = true;
  answers[eventIndex] = event.chord;
  masteryStates[eventIndex] = "supported";
  const feedback = container.querySelector("#answer-feedback");
  const revealFeedback = container.querySelector(".reveal-feedback");
  revealFeedback.textContent = `This was ${CHORDS[event.chord].label}.`;
  feedback.textContent = wrongAnswerFeedbackText();
  container.querySelectorAll("[data-answer], .hint-button, .hear-chosen-button").forEach((button) => {
    button.disabled = true;
  });
  container.querySelector(".reveal-continue").hidden = false;
  updateCurrentMeasureVisual();
  if (playCorrectChord) playAudio(CHORDS[event.chord].audio, `${CHORDS[event.chord].label} chord`);
}

function animateMasteryShape() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const shape = stageContent.querySelector(".measure-tile.is-active .completion-mark img.shape-image");
  if (!shape) return;
  shape.animate([
    { transform: "scale(0.65)", opacity: 0.6 },
    { transform: "scale(1.08)", opacity: 1, offset: 0.78 },
    { transform: "scale(1)", opacity: 1 }
  ], { duration: 400, easing: "ease-out" });
}

async function animateShapeToChordNotes(answerButton, numeral, event) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const shape = answerButton.querySelector(".choice-art img");
  const score = stageContent.querySelector(".measure-tile.is-active .tile-score > img.score");
  if (!shape || !score) return;

  answerButton.classList.add("is-answer-glowing");
  window.setTimeout(() => answerButton.classList.remove("is-answer-glowing"), 500);

  try {
    await score.decode();
    const highlightPath = `scores/chord note highlight/Section ${sectionIndex + 1}/${currentPiece().title}/${event.measure}.svg`;
    const response = await fetch(assetUrl(highlightPath));
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${highlightPath}`);
    const svgText = await response.text();
    const svg = new DOMParser().parseFromString(svgText, "image/svg+xml").documentElement;
    if (svg.localName !== "svg" || svg.querySelector("parsererror")) {
      throw new Error(`Invalid SVG: ${highlightPath}`);
    }
    const viewBox = (svg.getAttribute("viewBox") || "").trim().split(/[ ,]+/).map(Number);
    if (viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value)) || !viewBox[2] || !viewBox[3]) {
      throw new Error(`Missing SVG viewBox: ${highlightPath}`);
    }
    const seen = new Set();
    const targets = [...svg.querySelectorAll('circle[fill="#D9D9D9"]')]
      .map((circle) => ({ x: Number(circle.getAttribute("cx")), y: Number(circle.getAttribute("cy")) }))
      .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))
      .filter(({ x, y }) => {
        const key = `${x},${y}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (!targets.length) throw new Error(`No highlighted note coordinates in ${highlightPath}`);
    while (targets.length < 3) {
      const first = targets[0];
      const last = targets[targets.length - 1];
      targets.push({ x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 });
    }

    const scoreRect = score.getBoundingClientRect();
    const shapeRect = shape.getBoundingClientRect();
    const originX = shapeRect.left + shapeRect.width / 2;
    const originY = shapeRect.top + shapeRect.height / 2;
    const overlay = document.createElement("div");
    overlay.className = "shape-flight-overlay";
    overlay.setAttribute("aria-hidden", "true");
    document.body.append(overlay);
    targets.slice(0, 3).forEach(({ x, y }, index) => {
      const piece = document.createElement("img");
      piece.className = `shape-flight-piece shape-flight-piece-${index + 1}`;
      piece.src = shape.src;
      const targetX = scoreRect.left + ((x - viewBox[0]) / viewBox[2]) * scoreRect.width;
      const targetY = scoreRect.top + ((y - viewBox[1]) / viewBox[3]) * scoreRect.height;
      piece.style.left = `${originX - 18}px`;
      piece.style.top = `${originY - 18}px`;
      overlay.append(piece);
      const splitX = (index - 1) * 12;
      const flight = piece.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${splitX}px, -30px) scale(0.8)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${targetX - originX}px, ${targetY - originY}px) scale(0.22)`, opacity: 0.9, offset: 0.82 },
        { transform: `translate(${targetX - originX}px, ${targetY - originY}px) scale(0.08)`, opacity: 0 }
      ], { duration: 1050, delay: index * 70, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
      flight.onfinish = () => piece.remove();
    });
    window.setTimeout(() => overlay.remove(), 1450);
  } catch (error) {
    setStatus(`Could not animate chord notes: ${error.message}`);
  }
}

function renderScoreSequenceForCurrent() {
  updateCurrentMeasureVisual();
  saveProgress();
}

function updateCurrentMeasureVisual() {
  const tile = stageContent.querySelector(".measure-tile.is-active");
  const event = currentPiece().events[eventIndex];
  if (!tile || !event) return;

  const indices = currentPiece().events.flatMap((candidate, index) =>
    candidate.measure === event.measure ? [index] : []);
  const answersForMeasure = indices.map((index) =>
    answers[index] || (!isInteractive(currentPiece().events[index]) ? currentPiece().events[index].chord : "")
  ).filter(Boolean);
  const isComplete = answersForMeasure.length === indices.length;
  tile.classList.toggle("is-complete", isComplete);
  tile.classList.toggle("is-done", isComplete);
  const score = tile.querySelector(".tile-score > img.score");
  if (score) {
    let path = measureScorePath(event);
    if (activeHintLevel > 0) {
      const hintType = activeHintLevel === 1 ? "root note" : "chord note";
      path = `scores/${hintType} highlight/Section ${sectionIndex + 1}/${currentPiece().title}/${event.measure}.svg`;
    }
    if (answerCelebrating) {
      path = `scores/chord note highlight/Section ${sectionIndex + 1}/${currentPiece().title}/${event.measure}.svg`;
    }
    score.src = assetUrl(path);
    score.alt = `${currentPiece().title}, ${event.measure}${activeHintLevel ? `, hint ${activeHintLevel}` : ""}`;
    score.classList.toggle("has-chord-note-halos", activeHintLevel === HINT_LEVELS);
  }

  let completion = tile.querySelector(".completion-mark");
  if (answersForMeasure.length) {
    if (!completion) {
      completion = document.createElement("span");
      completion.className = "completion-mark";
      tile.querySelector(".tile-score").append(completion);
    }
    completion.replaceChildren();
    answersForMeasure.forEach((answer, index) => {
      if (index) completion.append(document.createTextNode(" · "));
      completion.append(shapeImage(answer));
      const answerLabel = document.createElement("span");
      answerLabel.className = "measure-answer";
      answerLabel.textContent = CHORDS[answer].label;
      completion.append(answerLabel);
    });
  } else {
    completion?.remove();
  }

  const tileStatus = tile.querySelector(".tile-result");
  if (tileStatus) {
    tileStatus.replaceChildren();
    if (isComplete) {
      const levels = [...new Set(indices.map((index) => masteryStates[index]).filter(Boolean))];
      if (levels.length) levels.forEach((level) => tileStatus.append(createMasteryBadge(level)));
      else tileStatus.textContent = "GIVEN";
    } else {
      tileStatus.textContent = "YOUR TURN";
    }
  }
}

function centerActiveMeasure(sequence) {
  const center = () => {
    const activeTile = sequence.querySelector(".measure-tile.is-active");
    if (!activeTile) return;
    const measureId = activeTile.dataset.measureId;
    if (sequence.dataset.centeredMeasure === measureId) return;
    const score = activeTile.querySelector("img.score");
    if (score && !score.complete) {
      const originalSource = score.src;
      const centerAfterLoad = () => {
        if (score.src === originalSource
          && sequence.isConnected
          && activeTile.classList.contains("is-active")
          && sequence.dataset.centeredMeasure !== measureId) {
          center();
        }
      };
      score.addEventListener("load", centerAfterLoad, { once: true });
      score.addEventListener("error", centerAfterLoad, { once: true });
      return;
    }
    activeTile.style.width = `${activeTile.getBoundingClientRect().width}px`;
    sequence.dataset.centeredMeasure = measureId;
    const centeredLeft = activeTile.offsetLeft - (sequence.clientWidth - activeTile.clientWidth) / 2;
    sequence.scrollTo({
      left: Math.max(0, Math.min(centeredLeft, sequence.scrollWidth - sequence.clientWidth)),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
    });
  };
  center();
}

function advanceMeasure() {
  window.clearTimeout(answerAdvanceTimer);
  eventIndex += 1;
  wrongAnswers = 0;
  replays = 0;
  usedHint = false;
  activeHintLevel = 0;
  answerRevealed = false;
  answerCelebrating = false;
  if (eventIndex >= currentPiece().events.length) {
    enterPieceReview();
    return;
  }
  render();
  playCurrentMeasure();
}

function enterPieceReview() {
  autoplayReview = true;
  setStage("piece-review");
}

function renderPieceReview() {
  const piece = currentPiece();
  const sequence = document.createElement("div");
  sequence.className = "score-sequence review-sequence";
  sequence.tabIndex = -1;
  const groupedEvents = [];
  piece.events.forEach((event, index) => {
    let group = groupedEvents.find((candidate) => candidate.measure === event.measure);
    if (!group) {
      group = { measure: event.measure, indices: [], event };
      groupedEvents.push(group);
    }
    group.indices.push(index);
  });
  groupedEvents.forEach((group, groupIndex) => {
    const { event, indices } = group;
    const item = document.createElement("div");
    item.className = "measure-tile review-measure is-complete";
    item.dataset.measureId = event.measure;
    item.dataset.measureIndex = String(groupIndex + 1);
    item.setAttribute("role", "group");
    item.setAttribute("aria-label", `Chord ${groupIndex + 1} of ${groupedEvents.length}, complete`);
    const label = document.createElement("span");
    label.className = "measure-label";
    label.textContent = `Chord ${groupIndex + 1} of ${groupedEvents.length}`;
    const tileScore = document.createElement("div");
    tileScore.className = "tile-score";
    tileScore.append(image(measureScorePath(event), `${piece.title}, ${event.measure}`));
    const completion = document.createElement("span");
    completion.className = "completion-mark";
    indices.forEach((answerIndex, chordIndex) => {
      const answer = answers[answerIndex] || piece.events[answerIndex].chord;
      if (chordIndex) completion.append(document.createTextNode(" · "));
      completion.append(shapeImage(answer));
      const answerLabel = document.createElement("span");
      answerLabel.className = "measure-answer";
      answerLabel.textContent = CHORDS[answer].label;
      completion.append(answerLabel);
    });
    tileScore.append(completion);
    item.append(label, tileScore);
    item.append(masteryBadgesFor(indices));
    sequence.append(item);
  });
  const controls = renderPieceControls();
  stageContent.replaceChildren(controls, sequence);
  if (completionVisible) stageContent.append(renderCompletionResults());
  if (autoplayReview) {
    autoplayReview = false;
    playAudio(piece.fullAudio, `${piece.title} with answers`, finishPiece);
  }
  saveProgress();
}

function continueAfterReview() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = undefined;
  }
  continueCurriculum();
}

function finishPiece() {
  if (stage !== "piece-review") return;
  completionVisible = true;
  renderPieceReview();
}

function renderCompletionResults() {
  const piece = currentPiece();
  const heading = document.createElement("h2");
  heading.textContent = "Congratulations!";
  const questionCount = piece.events.filter(isInteractive).length;
  const correctFirstTry = firstTryCorrect.filter(Boolean).length;
  const actions = document.createElement("div");
  actions.className = "completion-actions";
  const reviewButton = makeButton("Review score", () => {
    const score = stageContent.querySelector(".review-sequence");
    score?.focus({ preventScroll: true });
    score?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }, "text-action");
  const continueButton = makeButton("Continue", continueAfterReview, "primary-action");
  actions.append(
    reviewButton,
    continueButton
  );
  const results = document.createElement("section");
  results.className = "completion-results";
  results.setAttribute("aria-labelledby", "completion-heading");
  results.setAttribute("aria-live", "polite");
  heading.id = "completion-heading";
  const score = document.createElement("p");
  score.className = "completion-score";
  score.textContent = `${correctFirstTry} of ${questionCount} recognised on first listen`;
  const confusedPair = mostConfusedChordPair(piece);
  results.append(heading, score);
  if (confusedPair) {
    const confusion = document.createElement("p");
    confusion.className = "completion-confusion";
    confusion.textContent = `You chose ${confusedPair.selected} ${countWord(confusedPair.count)} when it was ${confusedPair.correct}.`;
    results.append(confusion);
  }
  const masterySummary = createResultsMasterySummary(piece);
  results.append(masterySummary, actions);
  return results;
}

function mostConfusedChordPair(piece) {
  const pairs = new Map();
  piece.events.forEach((event, index) => {
    (wrongSelections[index] || []).forEach((selected) => {
      const key = `${selected}|${event.chord}`;
      const pair = pairs.get(key) || { selected, correct: event.chord, count: 0 };
      pair.count += 1;
      pairs.set(key, pair);
    });
  });
  return [...pairs.values()].sort((left, right) => right.count - left.count)[0];
}

function countWord(count) {
  if (count === 1) return "once";
  if (count === 2) return "twice";
  return `${count} times`;
}

function createResultsMasterySummary(piece) {
  const summary = document.createElement("ul");
  summary.className = "results-mastery-list";
  const groups = [];
  piece.events.forEach((event, index) => {
    let group = groups.find((candidate) => candidate.measure === event.measure);
    if (!group) {
      group = { measure: event.measure, indices: [] };
      groups.push(group);
    }
    group.indices.push(index);
  });
  groups.forEach((group, index) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `Chord ${index + 1}`;
    const badges = masteryBadgesFor(group.indices, "results-mastery-badges");
    item.append(label, badges);
    summary.append(item);
  });
  return summary;
}

function continueCurriculum() {
  if (pieceIndex + 1 < currentSection().pieces.length) {
    pieceIndex += 1;
    resetPiece();
    setStage("piece-preview");
    return;
  }
  if (sectionIndex + 1 < SECTIONS.length) {
    sectionIndex += 1;
    pieceIndex = 0;
    introIndex = 0;
    introRevealed = false;
    resetPiece();
    setStage("introduction");
    return;
  }
  clearSavedProgress();
  completionVisible = false;
  curriculumComplete = true;
  stage = "home";
  render();
}

function render() {
  renderProgress();
  if (window.location.protocol === "file:") setAudioUnavailable();
  if (stage === "home") renderHome();
  else if (stage === "introduction") renderChordIntroduction();
  else if (stage === "piece-preview") renderPiecePreview();
  else if (stage === "measures") renderMeasures();
  else if (stage === "piece-review") renderPieceReview();
  syncAudioUnavailableUI();
  saveProgress();
}

homeButton.addEventListener("click", returnToHome);
window.addEventListener("keydown", handleKeyboardShortcuts);
window.addEventListener("pagehide", () => {
  if (listenAudio && !listenAudio.paused) listenAudio.pause();
  if (activeAudio && !activeAudio.paused) activeAudio.pause();
  saveProgress();
});
loadSavedProgress();
render();
