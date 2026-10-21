const lessonRoot = document.querySelector("#lesson");
const audioElement = document.querySelector("#audio-player");
const announcement = document.querySelector("#announcement");

class ExerciseState {
	constructor(config) {
		this.config = config;
		this.phase = 1;
		this.measureIndex = 0;
		this.previewMeasureIndex = -1;
		this.mistakes = config.measures.map(() => 0);
		this.hintLevel = 0;
		this.feedback = "";
		this.summaryOpen = false;
		this.answerLocked = false;
	}

	get measure() {
		return this.config.measures[this.measureIndex];
	}

	get firstTryCount() {
		return this.mistakes.filter((mistakes) => mistakes === 0).length;
	}

	begin() {
		this.phase = 1;
		this.measureIndex = 0;
		this.previewMeasureIndex = -1;
		this.mistakes = this.config.measures.map(() => 0);
		this.hintLevel = 0;
		this.feedback = "";
		this.summaryOpen = false;
		this.answerLocked = false;
	}
}

class AudioController {
	constructor(element) {
		this.element = element;
	}

	async play(path, { onTimeUpdate, onEnded, onBlocked } = {}) {
		this.stop();
		this.element.src = path;
		this.element.currentTime = 0;
		this.element.ontimeupdate = onTimeUpdate || null;
		this.element.onended = onEnded || null;

		try {
			await this.element.play();
			return true;
		} catch {
			onBlocked?.();
			return false;
		}
	}

	stop() {
		this.element.pause();
		this.element.ontimeupdate = null;
		this.element.onended = null;
	}

	stopPlayback() {
		this.element.pause();
		this.element.ontimeupdate = null;
		this.element.onended = null;
	}
}

class ExerciseRenderer {
	constructor(root) {
		this.root = root;
		this.framedScoreSources = new Map();
	}

	render(state) {
		document.querySelector("#lesson-title").textContent = state.config.title;
		this.root.innerHTML = state.phase === 1
			? this.overview(state)
			: state.phase === 2
				? this.measure(state)
				: this.summary(state);
		this.frameScoreImages();
	}

	frameScoreImages() {
		this.root.querySelectorAll("img[data-view-box]").forEach((image) => {
			const path = image.getAttribute("src");
			const viewBox = image.dataset.viewBox;
			const key = `${path}|${viewBox}`;
			let source = this.framedScoreSources.get(key);
			if (!source) {
				source = fetch(path)
					.then((response) => {
						if (!response.ok) throw new Error(`Could not load score image ${path} (${response.status})`);
						return response.text();
					})
					.then((svgText) => {
						const svgDocument = new DOMParser().parseFromString(svgText, "image/svg+xml");
						const svg = svgDocument.documentElement;
						if (svg.localName !== "svg" || svgDocument.querySelector("parsererror")) {
							throw new Error(`Invalid SVG score image: ${path}`);
						}
						const [, , width, height] = viewBox.split(/\s+/).map(Number);
						svg.setAttribute("viewBox", viewBox);
						svg.setAttribute("width", width);
						svg.setAttribute("height", height);
						return URL.createObjectURL(new Blob(
							[new XMLSerializer().serializeToString(svgDocument)],
							{ type: "image/svg+xml" }
						));
					})
					.catch((error) => {
						this.framedScoreSources.delete(key);
						throw error;
					});
				this.framedScoreSources.set(key, source);
			}
			source.then((url) => {
				if (image.isConnected && image.dataset.viewBox === viewBox) image.src = url;
			}).catch((error) => console.error(error));
		});
	}

	phaseHeader(phase, title, detail) {
		const names = ["LISTEN", "IDENTIFY", "REVIEW"];
		return `
			<div class="phase-heading">
				<div>
					<p class="eyebrow">STUDY ${String(phase).padStart(2, "0")} <span>/</span> ${names[phase - 1]}</p>
					<h1>${title}</h1>
					<p class="phase-detail">${detail}</p>
				</div>
				<div class="phase-progress" aria-label="Study phase ${phase} of 3">
					${names.map((name, index) => `<span class="progress-step ${index + 1 === phase ? "is-current" : index + 1 < phase ? "is-done" : ""}"><b>0${index + 1}</b>${name}</span>`).join("")}
				</div>
			</div>`;
	}

	overview(state) {
		const config = state.config;
		const markers = config.measures.map((measure, index) => `
			<div class="key-marker ${measure.hasKeyChange ? "has-change" : ""}" data-key-marker="${index}" style="left:${(index + 0.5) * 25}%">
				<span>M${measure.measureNumber}</span>${measure.hasKeyChange ? "<b>KEY SHIFT</b>" : ""}
			</div>`).join("");
		return `
			${this.phaseHeader(1, "Hear the harmony.", "Listen once through the excerpt and notice where the tonal color shifts.")}
			<section class="overview-layout">
				<div class="score-panel">
					<div class="panel-heading">
						<div><span class="panel-index">A</span><span>COMPLETE EXCERPT</span></div>
						<span class="score-state"><i></i><span id="playback-state">READY TO LISTEN</span></span>
					</div>
					<div class="overview-score" aria-label="Full score with measure preview">
						<img class="score-base" src="${config.fullExcerptImage}" alt="Complete score excerpt">
						<img class="score-focus" id="score-focus" src="${config.fullExcerptImage}" alt="">
						<div class="measure-guides" aria-hidden="true">${config.measures.map((measure, index) => `<span style="left:${index * 25}%"></span>`).join("")}<span class="guide-end"></span></div>
						${markers}
					</div>
					<div class="score-caption"><span>${config.composer}</span><span>4 MEASURES <i></i> C MAJOR</span></div>
				</div>
				<aside class="overview-aside">
					<div class="aside-topline"><span>THE EXCERPT</span><span>01 — 04</span></div>
					<h2>${config.title}</h2>
					<p class="composer">${config.composer}</p>
					<div class="key-list">
						${config.measures.map((measure) => `<div class="key-row"><span class="key-row-number">${String(measure.measureNumber).padStart(2, "0")}</span><span>Measure ${measure.measureNumber}</span><span class="key-indicator ${measure.hasKeyChange ? "is-change" : ""}">${measure.hasKeyChange ? "SHIFT" : ""}</span></div>`).join("")}
					</div>
					<div class="overview-actions">
						<button class="button button-primary" id="listen-button"><span class="button-symbol">▶</span><span>Listen from the top</span></button>
						<button class="text-button" id="skip-button">Go straight to measure 1 <span>↗</span></button>
					</div>
				</aside>
			</section>
			<p class="under-note"><span class="note-dot"></span> BRIGHT MEASURES MARK A KEY CHANGE</p>`;
	}

	measure(state) {
		const active = state.measure;
		const activeImage = state.hintLevel === 1
			? active.hint1Data.rootNoteHighlight
			: state.hintLevel >= 2
				? active.hint2Data.chordNotesHighlight
				: active.imageSnippet;
		const measures = state.config.measures.map((measure, index) => {
			const isActive = index === state.measureIndex;
			const isComplete = index < state.measureIndex;
			const mistakes = state.mistakes[index];
			const image = isActive ? activeImage : measure.imageSnippet;
			return `
				<div class="measure-tile ${isActive ? "is-active" : "is-muted"} ${isComplete ? "is-complete" : ""}" aria-label="Measure ${measure.measureNumber}${isActive ? ", active" : isComplete ? ", completed" : ", upcoming"}">
					<span class="tile-number">M${String(measure.measureNumber).padStart(2, "0")}</span>
					<div class="tile-score">
						<img src="${image}" data-view-box="${isActive && state.hintLevel ? "66 144 160 120" : "900 1850 2450 1650"}" alt="Measure ${measure.measureNumber} score${isActive && state.hintLevel ? ", hint highlighted" : ""}">
						${isComplete ? `<div class="completion-mark"><img src="${measure.correctImage}" alt=""><b>${measure.correctChord}</b></div>` : ""}
						${isActive && state.hintLevel >= 2 ? `<div class="chord-inset"><span>ROOT POSITION</span><div class="chord-crop"><img src="${measure.hint2Data.trebleClefRootImage}" data-view-box="900 1850 1800 850" alt="${measure.correctChord} chord in root position"></div></div>` : ""}
						${isActive && state.hintLevel === 1 ? `<span class="hint-tag">ROOT NOTE</span>` : ""}
					</div>
					${isComplete ? `<span class="tile-result">IDENTIFIED <b>${measure.correctChord}</b></span>` : isActive ? `<span class="tile-result is-live">YOUR TURN</span>` : `<span class="tile-result">IN CONTEXT</span>`}
					${isActive && mistakes ? `<span class="mistake-count">${mistakes} ${mistakes === 1 ? "TRY" : "TRIES"}</span>` : ""}
				</div>`;
		}).join("");
		const options = active.optionsArray.map((option, index) => `
			<button class="choice-button" data-answer="${option}" aria-label="Choose chord ${option}" ${state.answerLocked ? "disabled" : ""}>
				<span class="choice-art"><img src="${active.optionsImages[index]}" alt=""></span>
				<span class="choice-label">${option}</span>
			</button>`).join("");
		return `
			${this.phaseHeader(2, `Measure ${active.measureNumber}.`, "Listen for the chord that gives this moment its shape.")}
			<div class="measure-toolbar">
				<span class="measure-counter">MEASURE <b>${String(active.measureNumber).padStart(2, "0")}</b><i></i> 0${state.config.totalMeasures}</span>
				<div class="toolbar-actions">
					<button class="button button-quiet" id="replay-button"><span class="button-symbol">↻</span>Replay measure</button>
					<button class="button button-exit" id="exit-button"><span class="button-symbol">×</span>Exit</button>
				</div>
			</div>
			<section class="measure-stage" aria-label="Score context">
				<div class="measure-strip">${measures}</div>
				<div class="stage-legend"><span><i class="legend-active"></i>ACTIVE MEASURE</span><span><i class="legend-complete"></i>IDENTIFIED</span></div>
			</section>
			<section class="answer-panel">
				<div class="answer-heading"><div><p class="eyebrow">NAME THE CHORD</p><h2>Which function do you hear?</h2></div><span class="attempt-note">${state.mistakes[state.measureIndex] ? "TAKE ANOTHER LISTEN" : "FIRST ANSWER COUNTS"}</span></div>
				<div class="answer-controls">
					<div class="choice-grid">${options}</div>
					<button class="button button-hint" id="hint-button"><span class="hint-bulb">✳</span><span>Hint</span><kbd>${state.hintLevel < 2 ? "H" : "2 / 2"}</kbd></button>
				</div>
				<p class="feedback ${state.feedback ? "is-visible" : ""}" role="status">${state.feedback || ""}</p>
			</section>`;
	}

	summary(state) {
		const config = state.config;
		const labels = config.measures.map((measure, index) => `
			<div class="summary-label" style="left:${(index + 0.5) * 25}%">
				<img src="${measure.correctImage}" alt=""><b>${measure.correctChord}</b>
			</div>`).join("");
		return `
			${this.phaseHeader(3, "The whole picture.", "Listen again with the harmonic functions in view.")}
			<div class="measure-toolbar summary-toolbar">
				<span class="measure-counter">${config.composer.toUpperCase()}<i></i> FULL EXCERPT</span>
				<div class="toolbar-actions">
					<button class="button button-quiet" id="replay-full-button"><span class="button-symbol">↻</span>Replay excerpt</button>
					<button class="button button-exit" id="restart-button"><span class="button-symbol">⟲</span>Start over</button>
				</div>
			</div>
			<section class="score-panel final-score-panel">
				<div class="panel-heading"><div><span class="panel-index">A</span><span>YOUR HARMONIC MAP</span></div><span class="score-state"><i class="is-playing"></i><span id="playback-state">FULL EXCERPT</span></span></div>
				<div class="overview-score final-score">
					<img class="score-base" src="${config.fullExcerptImage}" alt="Complete score with identified chords">
					<div class="summary-labels">${labels}</div>
				</div>
				<div class="score-caption"><span>${config.title}</span><span>${config.composer}</span></div>
			</section>
			<div class="final-note"><span class="note-dot"></span> ALL FOUR FUNCTIONS IDENTIFIED <span class="final-score-number">${state.firstTryCount} / ${config.totalMeasures} FIRST-TRY</span></div>
			${state.summaryOpen ? `
				<div class="modal-backdrop">
					<section class="score-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
						<p class="eyebrow">EXCERPT COMPLETE</p>
						<h2 id="modal-title">Congratulations!</h2>
						<p class="modal-score-line">${state.firstTryCount} <span>/</span> ${config.totalMeasures}</p>
						<p class="modal-copy">You identified <b>${state.firstTryCount} out of ${config.totalMeasures} correctly on your first try.</b></p>
						<button class="button button-primary modal-button" id="close-summary">Review the score <span>↗</span></button>
					</section>
				</div>` : ""}`;
	}
}

async function initializeExercise() {
const config = await fetch("data.json").then((response) => {
	if (!response.ok) throw new Error(`Could not load score data (${response.status})`);
	return response.json();
});
const state = new ExerciseState(config);
const renderer = new ExerciseRenderer(lessonRoot);
const audio = new AudioController(audioElement);

function playOverview() {
	state.phase = 1;
	state.previewMeasureIndex = -1;
	renderer.render(state);
	setPlaybackState("PLAYING FULL EXCERPT");
	audio.play(config.fullExcerptAudio, {
		onTimeUpdate: updateOverviewFocus,
		onEnded: () => {
			state.phase = 2;
			state.measureIndex = 0;
			state.hintLevel = 0;
			state.feedback = "";
			renderer.render(state);
			audio.play(state.measure.audioSnippet);
		},
		onBlocked: () => {
			setPlaybackState("PRESS PLAY TO BEGIN");
			announcement.textContent = "Autoplay was blocked. Press Listen from the top to begin.";
		}
	}).then((started) => {
		if (!started) {
			const actions = document.querySelector(".overview-actions");
			if (actions && !document.querySelector("#listen-button")) {
				actions.insertAdjacentHTML("afterbegin", '<button class="button button-primary" id="listen-button"><span class="button-symbol">▶</span><span>Listen from the top</span></button>');
			}
		}
	});
}

function setPlaybackState(text) {
	const status = document.querySelector("#playback-state");
	if (status) status.textContent = text;
}

function updateOverviewFocus() {
	const duration = audioElement.duration;
	if (!Number.isFinite(duration) || duration <= 0) return;
	const index = Math.min(config.measures.length - 1, Math.floor((audioElement.currentTime / duration) * config.measures.length));
	if (index === state.previewMeasureIndex) return;
	state.previewMeasureIndex = index;
	const measure = config.measures[index];
	const focus = document.querySelector("#score-focus");
	if (focus) {
		focus.style.clipPath = `inset(0 ${(config.measures.length - index - 1) * 25}% 0 ${index * 25}%)`;
		focus.classList.toggle("is-highlighted", measure.hasKeyChange);
	}
	document.querySelectorAll("[data-key-marker]").forEach((marker, markerIndex) => {
		marker.classList.toggle("is-current", markerIndex === index && measure.hasKeyChange);
	});
	setPlaybackState(measure.hasKeyChange ? `MEASURE ${measure.measureNumber} · KEY SHIFT` : `MEASURE ${measure.measureNumber}`);
}

function playCurrentMeasure() {
	audio.play(state.measure.audioSnippet);
}

function showHint(level, playSound = true) {
	state.hintLevel = Math.max(state.hintLevel, Math.min(level, 2));
	renderer.render(state);
	const hintData = state.hintLevel === 1 ? state.measure.hint1Data : state.measure.hint2Data;
	if (playSound) {
		audio.stopPlayback();
		audio.play(state.hintLevel === 1 ? hintData.base_note_audio : hintData.chord_audio);
	}
}

function chooseAnswer(answer) {
	if (state.answerLocked) return;
	const index = state.measureIndex;
	if (answer !== state.measure.correctChord) {
		state.mistakes[index] += 1;
		state.feedback = "Try again!";
		audio.stopPlayback();
		showHint(state.mistakes[index] === 1 ? 1 : 2);
		announcement.textContent = state.mistakes[index] === 1
			? "Try again. The root note is highlighted."
			: "Try again. The chord notes and root position are shown.";
		return;
	}

	state.answerLocked = true;
	state.feedback = "Correct. Well heard.";
	renderer.render(state);
	announcement.textContent = `Correct. Measure ${state.measure.measureNumber} is ${state.measure.correctChord}.`;
	audio.stopPlayback();
	playSuccessCue();
	window.setTimeout(() => {
		if (state.phase !== 2 || state.measureIndex !== index) return;
		if (index === config.measures.length - 1) {
			playFinalExcerpt();
		} else {
			state.measureIndex += 1;
			state.hintLevel = 0;
			state.feedback = "";
			state.answerLocked = false;
			renderer.render(state);
			audio.play(state.measure.audioSnippet);
		}
	}, 900);
}

function playFinalExcerpt() {
	state.phase = 3;
	state.summaryOpen = false;
	renderer.render(state);
	setPlaybackState("PLAYING FULL EXCERPT");
	audio.play(config.fullExcerptAudio, {
		onEnded: () => {
			state.summaryOpen = true;
			renderer.render(state);
			setPlaybackState("PLAYBACK COMPLETE");
			announcement.textContent = `Congratulations! You identified ${state.firstTryCount} out of ${config.totalMeasures} correctly on your first try.`;
		},
		onBlocked: () => {
			setPlaybackState("PRESS REPLAY TO HEAR THE EXCERPT");
			announcement.textContent = "Playback was blocked. Press Replay excerpt to hear the full score before viewing your results.";
		}
	});
}

function playSuccessCue() {
	try {
		const context = new AudioContext();
		const oscillator = context.createOscillator();
		const gain = context.createGain();
		oscillator.type = "sine";
		oscillator.frequency.value = 660;
		gain.gain.setValueAtTime(0.08, context.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
		oscillator.connect(gain);
		gain.connect(context.destination);
		oscillator.start();
		oscillator.stop(context.currentTime + 0.22);
		oscillator.onended = () => context.close();
	} catch {
		announcement.textContent = "Correct.";
	}
}

function exitToOverview() {
	audio.stop();
	state.phase = 1;
	state.summaryOpen = false;
	renderer.render(state);
	setPlaybackState("READY TO LISTEN");
}

function startOver() {
	audio.stop();
	state.begin();
	playOverview();
}

lessonRoot.addEventListener("click", (event) => {
	const answer = event.target.closest("[data-answer]");
	if (answer) return chooseAnswer(answer.dataset.answer);
	if (event.target.closest("#listen-button")) {
		state.begin();
		return playOverview();
	}
	if (event.target.closest("#skip-button")) {
		audio.stop();
		state.phase = 2;
		state.measureIndex = 0;
		state.hintLevel = 0;
		state.feedback = "";
		renderer.render(state);
		return playCurrentMeasure();
	}
	if (event.target.closest("#replay-button")) return playCurrentMeasure();
	if (event.target.closest("#hint-button")) return showHint(state.hintLevel + 1);
	if (event.target.closest("#exit-button")) return exitToOverview();
	if (event.target.closest("#replay-full-button")) return playFinalExcerpt();
	if (event.target.closest("#restart-button")) return startOver();
	if (event.target.closest("#close-summary")) {
		state.summaryOpen = false;
		renderer.render(state);
	}
});

renderer.render(state);
playOverview();
}

initializeExercise().catch((error) => {
	lessonRoot.innerHTML = `<div class="loading-state">The score could not be loaded.<span> Check that the app is running from a local web server.</span></div>`;
	console.error(error);
});
