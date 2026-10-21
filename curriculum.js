const CHORDS = {
  I: { label: "I", function: "Tonic", note: "C", audio: "audio/chords/C chord.mp3", popup: "scores/chord popup/I.svg", shape: "Tonic.svg", group: "Tonic" },
  ii: { label: "ii", function: "Supertonic", note: "D", audio: "audio/chords/d chord.mp3", popup: "scores/chord popup/ii.svg", shape: "Supertonic.svg", group: "Subdominant" },
  iii: { label: "iii", function: "Mediant", note: "E", audio: "audio/chords/e chord.mp3", popup: "scores/chord popup/iii.svg", shape: "Mediant.svg", group: "Tonic" },
  IV: { label: "IV", function: "Subdominant", note: "F", audio: "audio/chords/F chord.mp3", popup: "scores/chord popup/IV.svg", shape: "Subdominant.svg", group: "Subdominant" },
  V: { label: "V", function: "Dominant", note: "G", audio: "audio/chords/G chord.mp3", popup: "scores/chord popup/V.svg", shape: "Dominant.svg", group: "Dominant" },
  vi: { label: "vi", function: "Submediant", note: "A", audio: "audio/chords/a chord.mp3", popup: "scores/chord popup/vi.svg", shape: "Submediant.svg", group: "Tonic" },
  "vii°": { label: "vii°", function: "Subtonic", note: "B", audio: "audio/chords/b dim chord.mp3", popup: "scores/chord popup/vii.svg", shape: "Subtonic.svg", group: "Dominant" }
};

const SECTIONS = [
  {
    title: "Section 1: Tonic, Dominant, Subdominant",
    numerals: ["I", "V", "IV"],
    newChords: ["I", "V", "IV"],
    pieces: [
      {
        title: "Clementi",
        workTitle: "Sonatina Op. 36 No. 1",
        composer: "Muzio Clementi",
        choices: ["I", "V", "IV"],
        interactiveChords: ["I", "V", "IV"],
        fullScore: "scores/full score/Clementi.svg",
        fullAudio: "audio/measures/Section 1/Clementi/Full exerpt.mp3",
        events: [
          { chord: "I", measure: "m1-2", audio: "measures 1 and 2.mp3" },
          { chord: "IV", measure: "m3", audio: "measure 3.mp3" },
          { chord: "V", measure: "m4", audio: "measure 4.mp3" }
        ],
        audioFolder: "audio/measures/Section 1/Clementi/",
        scoreFolder: "scores/measures/Section 1/Clementi/"
      },
      {
        title: "Mozart",
        workTitle: "Sonata No. 16",
        composer: "Wolfgang Amadeus Mozart",
        choices: ["I", "V", "IV"],
        interactiveChords: ["I", "V", "IV"],
        fullScore: "scores/full score/Mozart sonata.svg",
        fullAudio: "audio/measures/Section 1/Mozart/full score.mp3",
        audioFolder: "audio/measures/Section 1/Mozart/",
        scoreFolder: "scores/measures/Section 1/Mozart/",
        events: [
          { chord: "I", measure: "m1", audio: "m1.mp3" },
          { chord: "V", measure: "m2.1", audio: "m2.1.mp3" },
          { chord: "I", measure: "m2.2", audio: "m2.2.mp3" },
          { chord: "IV", measure: "m3.1", audio: "m3.1.mp3" },
          { chord: "I", measure: "m3.2", audio: "m3.2.mp3" },
          { chord: "V", measure: "m4.1", audio: "m4.1.mp3" },
          { chord: "I", measure: "m4.2", audio: "m4.2.mp3" }
        ]
      }
    ]
  },
  {
    title: "Section 2: Submediant and Supertonic",
    numerals: ["vi", "ii"],
    newChords: ["vi", "ii"],
    pieces: [
      {
        title: "Mozart",
        workTitle: "\"Voi che sapete\" from The Marriage of Figaro (transposed to C)",
        composer: "Wolfgang Amadeus Mozart",
        choices: ["I", "ii", "V", "vi"],
        interactiveChords: ["I", "ii", "V", "vi"],
        fullScore: "scores/full score/Mozart voi.svg",
        fullAudio: "audio/measures/Section 2/Mozart/full score.mp3",
        audioFolder: "audio/measures/Section 2/Mozart/",
        scoreFolder: "scores/measures/Section 2/Mozart/",
        events: [
          { chord: "I", measure: "m1", audio: "m1.mp3" },
          { chord: "ii", measure: "m2", audio: "m2.mp3" },
          { chord: "I", measure: "m3.1", audio: "m3.1.mp3" },
          { chord: "V", measure: "m3.2", audio: "m3.2.mp3" },
          { chord: "vi", measure: "m4", audio: "m4.mp3" }
        ]
      },
      {
        title: "Beethoven",
        workTitle: "Bagatelle in C",
        composer: "Ludwig van Beethoven",
        choices: ["I", "vi", "V", "IV", "ii"],
        interactiveChords: ["I", "vi", "V", "IV", "ii"],
        fullScore: "scores/full score/Beethoven.svg",
        fullAudio: "audio/measures/Section 2/Beethoven/full score.mp3",
        audioFolder: "audio/measures/Section 2/Beethoven/",
        scoreFolder: "scores/measures/Section 2/Beethoven/",
        events: [
          { chord: "V", measure: "m1", audio: "m1.mp3" },
          { chord: "I", measure: "m2", audio: "m2.mp3" },
          { chord: "V", measure: "m3", audio: "m3.mp3" },
          { chord: "I", measure: "m4-5.1", audio: "m4-5.1.mp3" },
          { chord: "V", measure: "m5.2", audio: "m5.2.mp3" },
          { chord: "I", measure: "m5.3", audio: "m5.3.mp3" },
          { chord: "V", measure: "m6.1", audio: "m6.1.mp3" },
          { chord: "I", measure: "m6.2", audio: "m6.2.mp3" },
          { chord: "vi", measure: "m7.1", audio: "m7.1.mp3" },
          { chord: "ii", measure: "m7.2", audio: "m7.2.mp3" },
          { chord: "V", measure: "m7.3", audio: "m7.3.mp3" },
          { chord: "I", measure: "m8", audio: "m8.mp3" }
        ]
      }
    ]
  },
  {
    title: "Section 3: Mediant and Subtonic",
    numerals: ["iii", "vii°"],
    newChords: ["iii", "vii°"],
    pieces: [
      {
        title: "Sibelius",
        workTitle: "Karelia Suite Op. 11, Movement II \"Ballade\"",
        composer: "Jean Sibelius, arranged by Otto Taubman",
        choices: ["I", "ii", "iii", "IV", "V", "vi"],
        interactiveChords: ["I", "ii", "iii", "IV", "V", "vi"],
        fullScore: "scores/full score/Sibelius.svg",
        fullAudio: "audio/measures/Section 3/Sibelius/full score.mp3",
        audioFolder: "audio/measures/Section 3/Sibelius/",
        scoreFolder: "scores/measures/Section 3/Sibelius/",
        events: [
          { chord: "I", measure: "m1.1", audio: "m1.1.mp3" },
          { chord: "ii", measure: "m1.2", audio: "m1.2.mp3" },
          { chord: "I", measure: "m1.3", audio: "m1.3.mp3" },
          { chord: "IV", measure: "m2.1", audio: "m2.1.mp3" },
          { chord: "I", measure: "m2.2-3.1", audio: "m2.2and3.1.mp3" },
          { chord: "ii", measure: "m3.2", audio: "m3.2.mp3" },
          { chord: "iii", measure: "m4.1", audio: "m4.1.mp3" },
          { chord: "vi", measure: "m4.2", audio: "m4.2.mp3" },
          { chord: "V", measure: "m4.3", audio: "m4.3.mp3" }
        ]
      },
      {
        title: "Rachmaninoff",
        workTitle: "Symphonie No. 2",
        composer: "Sergei Rachmaninoff, arranged by Wladimir Wilscha",
        choices: ["I", "vi", "iii", "V", "vii°", "IV", "ii"],
        interactiveChords: ["I", "vi", "iii", "V", "vii°", "IV", "ii"],
        fullScore: "scores/full score/Rachmaninoff.svg",
        fullAudio: "audio/measures/Section 3/Rachmaninoff/full score.mp3",
        audioFolder: "audio/measures/Section 3/Rachmaninoff/",
        scoreFolder: "scores/measures/Section 3/Rachmaninoff/",
        events: [
          { chord: "I", measure: "m1", audio: "m1.mp3" },
          { chord: "iii", measure: "m2", audio: "m2.mp3" },
          { chord: "I", measure: "m3", audio: "m3.mp3" },
          { chord: "vi", measure: "m4", audio: "m4.mp3" },
          { chord: "iii", measure: "m5", audio: "m5.mp3" }
        ]
      }
    ]
  }
];
