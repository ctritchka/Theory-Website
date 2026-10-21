const stageContent = document.querySelector("#stage-content");
const progress = document.querySelector("#progress");
const status = document.querySelector("#status");
const pieceTitle = document.querySelector("#piece-title");
const pieceComposer = document.querySelector("#piece-composer");
const sectionTitle = document.querySelector("#section-title");
const phaseProgress = document.querySelector("#phase-progress");
const homeButton = document.querySelector("#home-button");

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
let activeAudio;
let autoplayFullPiece = false;
let autoplayReview = false;
let answerAdvanceTimer;
let completionVisible = false;
let audioVolume = 0.75;
let curriculumComplete = false;
const preloadedAudio = new Map();

const phaseNames = ["Listen", "Identify", "Review"];
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
  answers = [];
  firstTryCorrect = [];
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
  sectionTitle.textContent = stage === "home" ? "" : `Section ${sectionIndex + 1}`;
  sectionTitle.hidden = stage === "home";
  pieceTitle.textContent = stage === "home" ? "Harmony Practice" : stage === "introduction" ? "" : piece.workTitle;
  pieceTitle.hidden = stage === "introduction";
  pieceComposer.textContent = stage === "home" || stage === "introduction" ? "" : piece.composer;
  progress.textContent = stage === "home"
    ? ""
    : `Section ${sectionIndex + 1} · Piece ${pieceIndex + 1} of ${currentSection().pieces.length}`;
  homeButton.hidden = stage === "home";
  const activePhase = stage === "piece-preview" ? 0 : stage === "measures" ? 1 : stage === "piece-review" ? 2 : -1;
  phaseProgress.replaceChildren();
  phaseProgress.hidden = !atPiece;
  if (atPiece) {
    phaseNames.forEach((name, index) => {
      const phase = document.createElement("span");
      phase.className = `phase-step${index === activePhase ? " is-current" : index < activePhase ? " is-done" : ""}`;
      const number = document.createElement("b");
      number.textContent = String(index + 1);
      const label = document.createElement("span");
      label.textContent = name;
      phase.append(number, label);
      phaseProgress.append(phase);
    });
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
    group.className = "choice-family";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", `${family.name} function chords`);
    availableChords.forEach((numeral) => {
      const chord = CHORDS[numeral];
      const button = makeButton("", () => {}, "choice-button");
      button.dataset.answer = numeral;
      button.setAttribute("aria-label", `Choose chord ${chord.label}`);
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
    item.className = `measure-tile${isCurrent ? " is-active" : " is-muted"}${isComplete ? " is-complete" : ""}`;
    item.setAttribute("aria-label", `Measure ${event.measure}${isCurrent ? ", active" : isComplete ? ", identified" : ", up next"}`);
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
    const score = image(scorePath, `${piece.title}, ${event.measure}${isCurrent && activeHintLevel ? `, hint ${activeHintLevel}` : ""}`);
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
    tileStatus.textContent = isCurrent ? "YOUR TURN" : isComplete ? "IDENTIFIED" : "UP NEXT";
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
    const hintButton = makeButton("Hint 1/2", () => {
      if (activeHintLevel < 2) showHint(activeHintLevel + 1);
    }, "hint-button");
    hintButton.setAttribute("aria-label", "Show hint 1 of 2");
    choices.append(hintButton);
    current.append(prompt, choices);

    const feedback = document.createElement("p");
    feedback.id = "answer-feedback";
    feedback.className = "answer-feedback";
    current.append(feedback);
    const popupPanel = document.createElement("div");
    popupPanel.className = "chord-popup-panel";
    popupPanel.hidden = true;
    current.append(popupPanel);
    current.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => checkAnswer(button.dataset.answer, event, current));
    });
  }

  stageContent.replaceChildren(controls, current, sequence);
  centerActiveMeasure(sequence);
}

function showHint(hintLevel) {
  const piece = currentPiece();
  const event = piece.events[eventIndex];
  usedHint = true;
  activeHintLevel = hintLevel;
  renderScoreSequenceForCurrent();
  const hintButton = stageContent.querySelector(".hint-button");
  if (hintButton) {
    hintButton.textContent = "Hint 2/2";
    hintButton.setAttribute("aria-label", "Show hint 2 of 2");
    hintButton.disabled = hintLevel >= 2;
  }
  const feedback = stageContent.querySelector("#answer-feedback");
  if (feedback) feedback.textContent = hintLevel === 1 ? "Listen to the root note" : "Listen for the chord notes";

  if (activeHintLevel >= 2) {
    showChordPopup(CHORDS[event.chord]);
    playAudio(CHORDS[event.chord].audio, `${CHORDS[event.chord].label} chord`);
  } else {
    const popupPanel = stageContent.querySelector(".chord-popup-panel");
    popupPanel.replaceChildren();
    popupPanel.hidden = true;
    playAudio(`audio/notes/${CHORDS[event.chord].note}.mp3`, `${CHORDS[event.chord].note} root note`);
  }
}

function showChordPopup(chord) {
  const panel = stageContent.querySelector(".chord-popup-panel");
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

function renderChordVisual(chord, container) {
  container.replaceChildren(image(chord.popup, `${chord.function} chord`, "intro-chord-image"));
}

function checkAnswer(selected, event, container) {
  const feedback = container.querySelector("#answer-feedback");
  if (selected === event.chord) {
    answers[eventIndex] = event.chord;
    firstTryCorrect[eventIndex] = wrongAnswers === 0 && !usedHint;
    feedback.textContent = `Correct: ${CHORDS[event.chord].label}.`;
    container.querySelectorAll("[data-answer]").forEach((button) => {
      button.disabled = true;
    });
    container.querySelectorAll(".hint-button").forEach((button) => {
      button.disabled = true;
    });
    setStatus("Correct answer.");
    renderScoreSequenceForCurrent();
    window.clearTimeout(answerAdvanceTimer);
    answerAdvanceTimer = window.setTimeout(advanceMeasure, 900);
    return;
  }

  wrongAnswers += 1;
  feedback.textContent = "";
  showHint(Math.min(2, Math.max(wrongAnswers, activeHintLevel + 1)));
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
    const tileStatus = document.createElement("span");
    tileStatus.className = "tile-result";
    tileStatus.textContent = "IDENTIFIED";
    item.append(tileStatus);
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
