"use client";

// normalize key ids: letters → lowercase, keep symbols/space as-is
export const normalizeKeyChar = (ch) => {
  if (!ch) return ch;
  if (ch === " ") return " ";
  return /[a-z]/i.test(ch) ? ch.toLowerCase() : ch;
};

// full finger map (normalized chars)
export const fingerMap = {
  // left hand
  q: "LP",
  a: "LP",
  z: "LP",
  1: "LP",

  w: "LR",
  s: "LR",
  x: "LR",
  2: "LR",
  "@": "LR",

  e: "LM",
  d: "LM",
  c: "LM",
  3: "LM",
  "#": "LM",

  r: "LI",
  f: "LI",
  v: "LI",
  4: "LI",
  $: "LI",
  t: "LI",
  g: "LI",
  b: "LI",
  5: "LI",
  "%": "LI",

  // right hand
  y: "RI",
  h: "RI",
  n: "RI",
  6: "RI",
  "^": "RI",
  u: "RI",
  j: "RI",
  m: "RI",
  7: "RI",
  "&": "RI",

  i: "RM",
  k: "RM",
  ",": "RM",
  8: "RM",
  "*": "RM",

  o: "RR",
  l: "RR",
  ".": "RR",
  9: "RR",
  "(": "RR",

  p: "RP",
  ";": "RP",
  ":": "RP",
  "/": "RP",
  0: "RP",
  ")": "RP",
  "'": "RP",
  "\u2019": "RP",
  '"': "RP",
  "?": "RP",
  "!": "RP",
};

// visual keyboard layout rows
export const KEY_LAYOUT = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "?", ":", "'", '"'],
];

export default function KeyboardLayout({ activeKeys, keyFlash, lessonChars }) {
  return (
    <div className="kb-wrap" aria-hidden="true">
      {KEY_LAYOUT.map((row, rowIdx) => {
        const visibleRow = lessonChars
          ? row.filter((key) => lessonChars.has(normalizeKeyChar(key)))
          : row;
        if (visibleRow.length === 0) return null;
        return (
          <div key={rowIdx} className="kb-row">
            {visibleRow.map((key) => {
              const normKey = normalizeKeyChar(key);
              const isActive = activeKeys?.has(normKey);
              const isCorrect =
                keyFlash?.key === normKey && keyFlash?.type === "correct";
              const isWrong =
                keyFlash?.key === normKey && keyFlash?.type === "wrong";
              return (
                <div
                  key={key}
                  className={[
                    "kb-key",
                    isActive ? "kb-key--active" : "",
                    isCorrect ? "kb-key--correct" : "",
                    isWrong ? "kb-key--wrong" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-key={key}
                >
                  {key.toUpperCase()}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* space bar */}
      <div className="kb-row">
        <div
          className={[
            "kb-key",
            "kb-key--space",
            activeKeys?.has(" ") ? "kb-key--active" : "",
            keyFlash?.key === " " && keyFlash?.type === "correct"
              ? "kb-key--correct"
              : "",
            keyFlash?.key === " " && keyFlash?.type === "wrong"
              ? "kb-key--wrong"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-key="SPACE"
        >
          SPACE
        </div>
      </div>
    </div>
  );
}
