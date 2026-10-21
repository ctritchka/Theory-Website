const stageContent = document.querySelector("#stage-content");
const progress = document.querySelector("#progress");
const status = document.querySelector("#status");
const pieceTitle = document.querySelector("#piece-title");
const pieceComposer = document.querySelector("#piece-composer");
const phaseProgress = document.querySelector("#phase-progress");
const homeButton = document.querySelector("#home-button");

const MAX_WRONG_BEFORE_REVEAL = 3;
const HINT_LEVELS = 2;

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
let autoplayFullPiece = false;
let autoplayReview = false;
let answerAdvanceTimer;
let completionVisible = false;
let audioVolume = 0.75;
let curriculumComplete = false;
let answerCelebrating = false;
const preloadedAudio = new Map();

const localFileAudioMessage = "Audio playback needs a local web server. See README.md for the start command.";

function assetUrl(path) {
  return `assets/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function currentSection() {
  return SECTIONS[sectionIndex];
}

function currentPiece() {
  return currentSection().pieces[pieceIndex];
}

function setStatus(message) {
  status.textContent = message;
}

function playAudio(path, label, onEnded) {
  setStatus("");
  if (window.location.protocol === "file:") {
    setStatus(localFileAudioMessage);
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
  audio.currentTime = 0;
  audio.volume = audioVolume;
  activeAudio = audio;
  audio.addEventListener("error", () => {
    if (activeAudio === audio) setStatus(`Could not load audio for ${label}: ${path}`);
  }, { once: true });
  audio.addEventListener("ended", () => {
    if (activeAudio === audio) {
      if (path === currentPiece().fullAudio) preloadAudio(path);
      if (onEnded) onEnded();
    }
  }, { once: true });
  audio.play().catch((error) => {
    if (activeAudio !== audio || error.name === "AbortError") return;
    setStatus(`Audio could not be played for ${label}: ${error.message}`);
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
  eventIndex = 0;
  wrongAnswers = 0;
  usedHint = false;
  activeHintLevel = 0;
  answerCelebrating = false;
  answers = [];
  firstTryCorrect = [];
  masteryStates = [];
  wrongSelections = [];
  answerRevealed = false;
  completionVisible = false;
}

function setStage(nextStage) {
  window.clearTimeout(answerAdvanceTimer);
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
  phaseProgress.replaceChildren();
  phaseProgress.hidden = !atPiece;
  if (atPiece) {
    const label = document.createElement("span");
    label.className = "phase-mode";
    label.textContent = stage === "piece-preview" ? "Listen" : stage === "measures" ? "Practice" : "Review";
    phaseProgress.append(label);
  }
}

function renderHome() {
  const heading = document.createElement("h2");
  heading.textContent = curriculumComplete ? "Curriculum complete" : "Choose a section";
  const choices = document.createElement("div");
  choices.className = "section-choices";
  SECTIONS.forEach((section, index) => {
    choices.append(makeButton(`Section ${index + 1}: ${section.title.replace(/^Section \d+:\s*/, "")}`, () => {
      curriculumComplete = false;
      sectionIndex = index;
      pieceIndex = 0;
      introIndex = 0;
      introRevealed = false;
      resetPiece();
      setStage("introduction");
    }));
  });
  if (curriculumComplete) {
    const message = document.createElement("p");
    message.textContent = "You have completed all three sections.";
    const restart = makeButton("Restart curriculum", () => {
      curriculumComplete = false;
      sectionIndex = 0;
      pieceIndex = 0;
      introIndex = 0;
      introRevealed = false;
      resetPiece();
      setStage("introduction");
    }, "primary-action");
    stageContent.replaceChildren(heading, message, restart, choices);
    return;
  }
  stageContent.replaceChildren(heading, choices);
}

function makeButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener("click", onClick);
  return button;
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
  }, "intro-shape-button");
  shapeButton.setAttribute("aria-label", `Reveal ${chord.function} chord`);
  shapeButton.append(image(`shapes/${chord.shape}`, `${chord.function} shape`, "intro-shape"));
  const clickCue = document.createElement("span");
  clickCue.className = "intro-click-cue";
  clickCue.textContent = "Click to explore";
  shapeButton.append(clickCue);

  const visual = document.createElement("div");
  visual.className = "intro-chord-visual";
  const label = document.createElement("p");
  label.className = "intro-chord-label";
  label.textContent = `${chord.function} / ${chord.label}`;
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
    autoplayFullPiece = true;
    setStage("piece-preview");
  }, "intro-next primary-action");
  next.hidden = !introRevealed;
  intro.append(words, layout, next);
  stageContent.replaceChildren(intro);
  preloadAudio(currentPiece().fullAudio);
  playAudio(`audio/notes/${chord.note}.mp3`, `${chord.note} root note`);
}

function returnToHome() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = undefined;
  }
  setStage("home");
}

function shapeImage(numeral, alt = "") {
  return image(`shapes/${CHORDS[numeral].shape}`, alt, "shape-image");
}

function renderChoiceButtons(chords) {
  const choices = document.createElement("div");
  choices.className = "choice-grid";
  const families = [
    { name: "Tonic", numerals: ["I", "vi", "iii"] },
    { name: "Dominant", numerals: ["V", "vii°"] },
    { name: "Subdominant", numerals: ["IV", "ii"] }
  ];
  families.forEach((family) => {
    const availableChords = family.numerals.filter((numeral) => chords.includes(numeral));
    if (!availableChords.length) return;
    const group = document.createElement("div");
    group.className = `choice-family choice-family-${family.name.toLowerCase()}`;
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", `${family.name} function chords`);
    availableChords.forEach((numeral) => {
      const chord = CHORDS[numeral];
      const button = makeButton("", () => {}, "choice-button");
      if (numeral === availableChords[0]) button.classList.add("family-start");
      button.dataset.answer = numeral;
      button.setAttribute("aria-label", `Choose chord ${chord.label}`);
      if (wrongSelections[eventIndex]?.includes(numeral)) {
        button.disabled = true;
        button.classList.add("is-wrong");
      }
      const art = document.createElement("span");
      art.className = "choice-art";
      art.append(shapeImage(numeral, `${chord.function} shape`));
      const label = document.createElement("span");
      label.className = "choice-function";
      label.textContent = chord.function;
      const numeralLabel = document.createElement("span");
      numeralLabel.className = "choice-numeral";
      numeralLabel.textContent = chord.label;
      button.append(art, numeralLabel, label);
      if (wrongSelections[eventIndex]?.includes(numeral)) {
        const wrongLabel = document.createElement("span");
        wrongLabel.className = "wrong-choice-label";
        wrongLabel.textContent = "× not this one";
        button.append(wrongLabel);
        button.setAttribute("aria-label", `Chord ${chord.label}, not this one`);
      }
      group.append(button);
    });
    choices.append(group);
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
  note.textContent = "Listen to the full piece. No need to interact.";
  listeningMode.append(heading, note);
  const score = image(piece.fullScore, `${piece.title} full score`, "score full-score");
  const controls = document.createElement("div");
  controls.className = "piece-controls listening-controls";
  controls.append(renderVolumeControl());
  stageContent.replaceChildren(listeningMode, controls, score);
  if (autoplayFullPiece) {
    autoplayFullPiece = false;
    playAudio(piece.fullAudio, `${piece.title} full piece`, beginMeasures);
  }
}

function renderPieceControls() {
  const controls = document.createElement("div");
  controls.className = "piece-controls";
  if (stage === "piece-preview") {
    controls.append(makeIconButton("▶", "Play excerpt", () => {
      playAudio(currentPiece().fullAudio, `${currentPiece().title} full piece`, beginMeasures);
    }));
    controls.append(makeButton("Identify", beginMeasures, "text-action"));
  } else if (stage === "measures") {
    controls.append(makeButton("Play Tonic", () => {
      playAudio(CHORDS.I.audio, "Tonic chord");
    }, "text-action"));
    controls.append(makeIconButton("▶", "Play measure", playCurrentMeasure));
    controls.append(makeIconButton("↻", "Replay excerpt", () => {
      playAudio(currentPiece().fullAudio, `${currentPiece().title} full piece`);
    }));
  } else if (stage === "piece-review") {
    controls.append(makeIconButton("↻", "Replay excerpt", () => {
      completionVisible = false;
      renderPieceReview();
      playAudio(currentPiece().fullAudio, `${currentPiece().title} with answers`, finishPiece);
    }));
    controls.append(makeButton("Next", continueAfterReview, "primary-action"));
  }
  controls.append(renderVolumeControl());
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
  resetPiece();
  setStage("measures");
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
  groupedEvents.forEach((group) => {
    const { event, indices } = group;
    const item = document.createElement("div");
    const isCurrent = indices.includes(eventIndex);
    const answered = indices.map((answerIndex) => {
      const groupedEvent = piece.events[answerIndex];
      return answers[answerIndex] || (!isInteractive(groupedEvent) ? groupedEvent.chord : "");
    }).filter(Boolean);
    const isComplete = answered.length === indices.length;
    item.className = `measure-tile${isCurrent ? " is-active" : " is-muted"}${isComplete ? " is-complete is-done" : ""}`;
    item.setAttribute("aria-label", `Measure ${event.measure}${isCurrent ? ", active" : isComplete ? ", complete" : ", up next"}`);
    const label = document.createElement("span");
    label.className = "measure-label";
    label.textContent = `M${event.measure.replace(/^m/i, "")}`;
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
    given.textContent = `${CHORDS[event.chord].function} · ${CHORDS[event.chord].label}`;
    current.append(given);
  } else {
    const prompt = document.createElement("p");
    prompt.className = "question-prompt";
    prompt.textContent = "What function do you hear?";
    const choices = renderChoiceButtons(piece.choices);
    const hintControls = document.createElement("div");
    hintControls.className = "hint-controls";
    const hintButton = makeButton("", () => {
      if (activeHintLevel < HINT_LEVELS) showHint(activeHintLevel + 1, "user");
    }, "hint-button");
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
    current.append(feedback);
    const hearChosenButton = makeButton("Hear what you chose", () => {
      const selectedChord = CHORDS[current.dataset.lastWrongChoice];
      if (selectedChord?.audio) playAudio(selectedChord.audio, `${selectedChord.label} chord`);
    }, "text-action hear-chosen-button");
    hearChosenButton.hidden = true;
    current.append(hearChosenButton);
    const revealFeedback = document.createElement("p");
    revealFeedback.className = "reveal-feedback";
    revealFeedback.setAttribute("aria-live", "polite");
    current.append(revealFeedback);
    const continueButton = makeButton("Continue", advanceMeasure, "primary-action reveal-continue");
    continueButton.hidden = true;
    current.append(continueButton);
    popupPanel = document.createElement("div");
    popupPanel.className = "chord-popup-panel";
    popupPanel.hidden = true;
    current.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => checkAnswer(button.dataset.answer, event, current));
    });
  }

  stageContent.replaceChildren(controls, current, sequence);
  if (popupPanel) stageContent.append(popupPanel);
  updateHintControl(stageContent.querySelector(".hint-button"));
  centerActiveMeasure(sequence);
}

function updateHintControl(button) {
  if (!button) return;
  const label = button.querySelector(".hint-label");
  const noMoreHints = activeHintLevel >= HINT_LEVELS || answerRevealed || Boolean(answers[eventIndex]);
  const nextLabel = noMoreHints
    ? "No more hints"
    : activeHintLevel === 0
      ? "Show root note"
      : "Show chord notes";
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
  console.info("Practice hint shown", { source, level: activeHintLevel, measure: event.measure });
  renderScoreSequenceForCurrent();
  const hintButton = stageContent.querySelector(".hint-button");
  updateHintControl(hintButton);
  const hintControls = stageContent.querySelector(".hint-controls");
  const hintMessage = stageContent.querySelector(".hint-message");
  hintMessage.textContent = activeHintLevel === 1 ? "Listen to the root note" : "Listen for the chord notes";
  if (source === "auto") {
    hintControls.classList.remove("is-pulsing");
    void hintControls.offsetWidth;
    hintControls.classList.add("is-pulsing");
    window.setTimeout(() => hintControls.classList.remove("is-pulsing"), 700);
  }

  if (activeHintLevel >= 2) {
    showChordPopup(CHORDS[event.chord], stageContent.querySelector(".chord-popup-panel"));
    playAudio(CHORDS[event.chord].audio, `${CHORDS[event.chord].label} chord`);
  } else {
    const popupPanel = stageContent.querySelector(".chord-popup-panel");
    popupPanel.replaceChildren();
    popupPanel.hidden = true;
    playAudio(`audio/notes/${CHORDS[event.chord].note}.mp3`, `${CHORDS[event.chord].note} root note`);
  }
  if (wrongAnswers > 0 && activeHintLevel >= HINT_LEVELS && !hasRemainingWrongChoices()) {
    revealAnswer(event, stageContent.querySelector(".current-measure"), false);
  }
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
  positionHintPanel(panel);
}

function positionHintPanel(panel) {
  const activeTile = stageContent.querySelector(".measure-tile.is-active");
  if (!activeTile) return;
  const stageRect = stageContent.getBoundingClientRect();
  const tileRect = activeTile.getBoundingClientRect();
  const panelWidth = panel.offsetWidth;
  const panelHeight = panel.offsetHeight;
  const styles = getComputedStyle(stageContent);
  const popupGap = Number.parseFloat(styles.getPropertyValue("--practice-popup-gap"));
  const popupAnchorOffset = Number.parseFloat(styles.getPropertyValue("--practice-popup-anchor-offset"));
  let left = tileRect.right - stageRect.left + popupGap;
  if (left + panelWidth > stageContent.clientWidth) {
    left = tileRect.left - stageRect.left - panelWidth - popupGap;
  }
  left = Math.max(0, Math.min(left, stageContent.clientWidth - panelWidth));
  let top = tileRect.top - stageRect.top + popupAnchorOffset;
  if (top + panelHeight > stageContent.clientHeight) {
    top = tileRect.bottom - stageRect.top - panelHeight - popupGap;
  }
  top = Math.max(0, Math.min(top, stageContent.clientHeight - panelHeight));
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

window.addEventListener("resize", () => {
  const panel = stageContent.querySelector(".chord-popup-panel");
  if (panel && !panel.hidden) positionHintPanel(panel);
});

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
  container.replaceChildren(image(chord.popup, `${chord.function} chord`, "intro-chord-image"));
}

function checkAnswer(selected, event, container) {
  const feedback = container.querySelector("#answer-feedback");
  if (selected === event.chord) {
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
    answerAdvanceTimer = window.setTimeout(advanceMeasure, 1250);
    return;
  }

  wrongAnswers += 1;
  if (!wrongSelections[eventIndex]) wrongSelections[eventIndex] = [];
  wrongSelections[eventIndex].push(selected);
  const selectedButton = [...container.querySelectorAll("[data-answer]")].find((button) => button.dataset.answer === selected);
  if (selectedButton) {
    selectedButton.disabled = true;
    selectedButton.classList.add("is-wrong");
    selectedButton.setAttribute("aria-label", `Chord ${CHORDS[selected].label}, not this one`);
    const wrongLabel = document.createElement("span");
    wrongLabel.className = "wrong-choice-label";
    wrongLabel.textContent = "× not this one";
    selectedButton.append(wrongLabel);
  }
  feedback.textContent = "Not quite. Hint opened - listen again.";
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
  answerRevealed = true;
  answers[eventIndex] = event.chord;
  masteryStates[eventIndex] = "supported";
  const feedback = container.querySelector("#answer-feedback");
  const revealFeedback = container.querySelector(".reveal-feedback");
  revealFeedback.textContent = `This was ${CHORDS[event.chord].label}.`;
  feedback.textContent = "Not quite. Hint opened - listen again.";
  container.querySelectorAll("[data-answer], .hint-button, .hear-chosen-button").forEach((button) => {
    button.disabled = true;
  });
  container.querySelector(".reveal-continue").hidden = false;
  renderScoreSequenceForCurrent();
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
  const existing = stageContent.querySelector(".score-sequence");
  if (!existing) return;
  const scrollLeft = existing.scrollLeft;
  const sequence = renderScoreSequence();
  existing.replaceWith(sequence);
  sequence.scrollLeft = scrollLeft;
  centerActiveMeasure(sequence);
}

function centerActiveMeasure(sequence) {
  const center = () => {
    const activeTile = sequence.querySelector(".measure-tile.is-active");
    if (!activeTile) return;
    const tileRect = activeTile.getBoundingClientRect();
    const sequenceRect = sequence.getBoundingClientRect();
    const centeredLeft = sequence.scrollLeft + tileRect.left - sequenceRect.left
      - (sequence.clientWidth - activeTile.clientWidth) / 2;
    sequence.scrollLeft = Math.max(0, centeredLeft);
  };
  center();
  const pendingImages = [...sequence.querySelectorAll("img.score")].filter((score) => !score.complete);
  if (pendingImages.length) {
    Promise.all(pendingImages.map((score) => new Promise((resolve) => {
      score.addEventListener("load", resolve, { once: true });
      score.addEventListener("error", resolve, { once: true });
    }))).then(() => requestAnimationFrame(center));
  }
}

function advanceMeasure() {
  window.clearTimeout(answerAdvanceTimer);
  eventIndex += 1;
  wrongAnswers = 0;
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
  const groupedEvents = [];
  piece.events.forEach((event, index) => {
    let group = groupedEvents.find((candidate) => candidate.measure === event.measure);
    if (!group) {
      group = { measure: event.measure, indices: [], event };
      groupedEvents.push(group);
    }
    group.indices.push(index);
  });
  groupedEvents.forEach((group) => {
    const { event, indices } = group;
    const item = document.createElement("div");
    item.className = "measure-tile review-measure is-complete";
    const label = document.createElement("span");
    label.className = "measure-label";
    label.textContent = `M${event.measure.replace(/^m/i, "")}`;
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
  if (completionVisible) stageContent.append(renderCompletionOverlay());
  if (autoplayReview) {
    autoplayReview = false;
    playAudio(piece.fullAudio, `${piece.title} with answers`, finishPiece);
  }
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

function renderCompletionOverlay() {
  const piece = currentPiece();
  const heading = document.createElement("h2");
  heading.textContent = "Congratulations!";
  const questionCount = piece.events.filter(isInteractive).length;
  const correctFirstTry = firstTryCorrect.filter(Boolean).length;
  const actions = document.createElement("div");
  actions.className = "completion-actions";
  actions.append(
    makeButton("Review score", () => {
      completionVisible = false;
      renderPieceReview();
    }),
    makeButton("Continue", continueAfterReview, "primary-action")
  );
  const overlay = document.createElement("div");
  overlay.className = "completion-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "completion-heading");
  heading.id = "completion-heading";
  const copy = document.createElement("p");
  copy.className = "completion-score";
  copy.textContent = `You got ${correctFirstTry} of ${questionCount} measures right on your first try.`;
  overlay.append(heading, copy, actions);
  return overlay;
}

function continueCurriculum() {
  if (pieceIndex + 1 < currentSection().pieces.length) {
    pieceIndex += 1;
    resetPiece();
    autoplayFullPiece = true;
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
  completionVisible = false;
  curriculumComplete = true;
  stage = "home";
  render();
}

function render() {
  renderProgress();
  if (window.location.protocol === "file:") setStatus(localFileAudioMessage);
  if (stage === "home") renderHome();
  else if (stage === "introduction") renderChordIntroduction();
  else if (stage === "piece-preview") renderPiecePreview();
  else if (stage === "measures") renderMeasures();
  else if (stage === "piece-review") renderPieceReview();
}

homeButton.addEventListener("click", returnToHome);
render();
