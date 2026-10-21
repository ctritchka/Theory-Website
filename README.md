# Harmony Practice

A static browser prototype for the three-section chord-recognition curriculum. Each section begins with an interactive chord introduction: the learner hears each root note, reveals its chord, and advances through the new chords. The section then guides the learner through its two pieces in Listen, Identify, and Review phases. During identification, the current measure is emphasized, learners choose a chord function, and either hint can be requested. The first hint plays automatically after a wrong answer. A full-piece answer review and first-try score follow each piece.

The path is Clementi and Mozart in Section 1, Mozart and Beethoven in Section 2, then Sibelius and Rachmaninoff in Section 3. The first Mozart piece in Section 2 and Sibelius piece in Section 3 ask learners to identify every chord measure.

During measure practice, the active score tile is emphasized, completed tiles show their chord, and upcoming tiles are dimmed. Chord choices use the supplied SVGs in `assets/shapes/`. Correct answers advance automatically, and playback controls include a volume slider and a tonic replay option. Use **Home** in the header to return to the section menu.

Run the app through a local HTTP server. Opening `index.html` directly (`file://`) is not supported for audio playback: browser security restrictions block reliable access to the note, chord, and measure recordings. Do not use the file URL when practicing.

Node.js is required; no packages need to be installed. From the project folder, start the included server:

```powershell
node server.js
```

Then open `http://localhost:8000`. Keep the server running while using the app. If the page is opened using `file://`, it displays a reminder to start the server.

If port 8000 is already in use, choose another port in PowerShell:

```powershell
$env:PORT = "8001"
node server.js
```

Then open `http://localhost:8001`.
