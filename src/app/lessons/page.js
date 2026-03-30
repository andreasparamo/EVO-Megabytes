"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import styles from "./lessons.module.css";

const LESSONS = [
  {
    id: "beg-0-hand-placement",
    title: "Keyboard Hand Placement — Beginner",
    level: "Beginner",
    description:
      "Learn the basic home-row position and which finger hits which key.",
    infoOnly: true
  },
  {
    id: "beg-1-home-row-center",
    title: "Home Row Center Basics",
    level: "Beginner",
    description: "Pure home-row drills on the central keys.",
    text: "aaaa ssss dddd ffff jjjj kkkk llll ;;;; asdf jkl; asdf jkl; a s d f  j k l ; asdfjkl; asdf jkl;"
  },
  {
    id: "beg-1b-home-row-center-follow",
    title: "Home Row Center Follow-Up",
    level: "Beginner",
    description: "More pure home-row repetitions for muscle memory.",
    text: "asdf asdf jkl; jkl; aaaa ssss dddd ffff jjjj kkkk llll ;;;; asdfjkl; asdf jkl; asdf asdf jkl; jkl;"
  },
  {
    id: "beg-1c-home-row-center-flow",
    title: "Home Row Center Flow",
    level: "Beginner",
    description: "Smooth flowing patterns only on home-row keys.",
    text: "asdj asdl fjkl asdf jkl; asdf jkl; asdfasdf jkl;jkl; asdf jjkk lll; aass ddff jjkk ll;; asdf jkl;"
  },
  {
    id: "beg-1d-home-row-center-mix",
    title: "Home Row Center Mix",
    level: "Beginner",
    description: "Mixed home-row clusters to keep you focused.",
    text: "a s d f j k l ;  asdf jkl;  asdf lkj;  jads fl;k asdf jkl;  asdf;lkj asdf jkl; aass ddff jjkk ll;;"
  },
  {
    id: "beg-1e-home-row-center-review",
    title: "Home Row Center Review",
    level: "Beginner",
    description: "Longer home-row review line for endurance.",
    text: "asdf jkl; asdf jkl; asdf jkl; a s d f j k l ; asdfjkl; asdf jkl; asdf jkl; asdf jkl; a s d f j k l ;"
  },
  {
    id: "beg-2-home-row-words-center",
    title: "Home Row Words — Center",
    level: "Beginner",
    description: "Simple words using only home-row letters.",
    text: "sad dad all as as; fall as; ask; jalf; lass; ask as; asdf jkl; asdf jkl; lad; salad; all as; as; as;"
  },
  {
    id: "beg-3-add-gh-center",
    title: "Add G and H — Center Reach",
    level: "Beginner",
    description: "Introduce G and H right next to the home-row cluster.",
    text: "g g g h h h g g g h h h gag hah had gad hag jag lag lagg gghh asdf ghgh jhjh jkhg asdf jkl; gh hg gh;"
  },
  {
    id: "beg-4-top-center-ty",
    title: "Top Row Center — T and Y",
    level: "Beginner",
    description: "Add gentle reaches to T and Y above the home row.",
    text: "t t t y y y tat yay ttyy tyt ytt tatty tatty asdf tyty jkl; ty ty ty asdf jkl; try try try ty ty;"
  },
  {
    id: "beg-5-bottom-center-vb",
    title: "Bottom Row Center — V and B",
    level: "Beginner",
    description: "Introduce V and B below the home row.",
    text: "v v v b b b vvv bbb vvb bvv vab vab lab lav slab slab asdf vbvb jkl; v b v b  asdf jkl; vb vb vb;"
  },
  {
    id: "beg-6-center-cluster-mn",
    title: "Center Cluster — N and M",
    level: "Beginner",
    description: "Add N and M to the core typing area.",
    text: "n n n m m m nan man mam nam  an an am am ban bam jam jam asdf nmnm jkl; n m n m  asdf jkl; man man;"
  },
  {
    id: "beg-7-center-lines",
    title: "Center Lines Flow",
    level: "Beginner",
    description: "Smooth lines across the central cluster.",
    text: "asdf jkl; ghgh nmnm tyty vbvb asdfgh jkl; asdf jkl; g h j k n m v b  a s d f j k l ;  asdf jkl; nmvb;"
  },
  {
    id: "beg-8-center-phrases",
    title: "Center Phrases I",
    level: "Beginner",
    description: "Short phrases using mostly central letters.",
    text: "a small jam  a calm hand  a tall man  many bags  tiny tag  a small fan  calm hand jam  asdf jkl; nmvb;"
  },
  {
    id: "beg-9-center-review-slow",
    title: "Center Cluster Review — Slow",
    level: "Beginner",
    description: "Slow, controlled review of the center of the keyboard.",
    text: "a s d f g h j k l ; v b n m  asdf jkl;  gh gh  nm nm  vb vb  asdfgh jkl;  asdf jkl;  a calm hand jam;"
  },
  {
    id: "beg-10-center-review-tempo",
    title: "Center Cluster Review — Tempo",
    level: "Beginner",
    description: "Slightly faster central-cluster drills.",
    text: "asdfgh jkl; vb nm asdf jkl; asdf jkl; g h j k n m v b  asdf jkl; asdfgh jkl; nmvb nmvb asdf jkl; nmvb;"
  },
  {
    id: "int-0-hand-placement",
    title: "Keyboard Hand Placement — Intermediate",
    level: "Intermediate",
    description:
      "Review home-row posture and learn how to reach to top and bottom rows.",
    infoOnly: true
  },
  {
    id: "int-1-left-branch-qwe",
    title: "Left Branch — QWE Row",
    level: "Intermediate",
    description: "Start reaching left to Q, W, and E above the center.",
    text: "q w e w e q we we qwe weq  asdf qwe asdf qwe  qas was eas  we as we as  qweas qweas  asdf jkl; qwe;"
  },
  {
    id: "int-1b-left-branch-qwe-words",
    title: "Left Branch — QWE Words",
    level: "Intermediate",
    description: "More left-top words and patterns on Q, W, and E.",
    text: "qwe qwe wee wee qqq www eee  weq qwe ewe  we we qwe weq  qwe as we as  qweas qwe qwe  asdf jkl; qwe qwe;"
  },
  {
    id: "int-1c-left-branch-qwe-flow",
    title: "Left Branch — QWE Flow",
    level: "Intermediate",
    description: "Longer flowing lines across Q, W, E and home row.",
    text: "qwe asdf qwe asdf qwe asdf jkl;  qwe weq qwe weq  qas was eas  qwe qwe qwe  asdf jkl; qwe asdf qwe;"
  },
  {
    id: "int-1d-left-branch-qwe-review",
    title: "Left Branch — QWE Review Run",
    level: "Intermediate",
    description: "Review QWE with mixed spacing and home-row anchors.",
    text: "q w e q w e  qwe weq qwe weq  asdf qwe asdf qwe  qas was eas  we as we as  asdf jkl; q w e qwe;"
  },
  {
    id: "int-2-left-branch-zxc",
    title: "Left Branch — ZXC Row",
    level: "Intermediate",
    description: "Reach down to Z, X, and C below the left hand.",
    text: "z x c x c z zx zx zxc xcz  asdf zxc asdf zxc  caz caz sax sax  zax cax  asdf jkl; zxc zxc;"
  },
  {
    id: "int-3-right-branch-uio",
    title: "Right Branch — UIO Row",
    level: "Intermediate",
    description: "Reach right to U, I, and O above the center.",
    text: "u i o iu oi ui  uio oiu  asdf uio jkl;  ui ui oi oi  auto auto  unit ion  asdf jkl; uio uio;"
  },
  {
    id: "int-4-right-branch-nm-comma",
    title: "Right Branch — N M and Comma",
    level: "Intermediate",
    description: "Use N, M, and comma with home-row anchors.",
    text: "n m ,  nm, nm,  man, man,  jam, jam,  an, an,  asdf jkl; nm, nm,  calm, clan,  main, mean,  nm, nm,"
  },
  {
    id: "int-5-full-letter-top-row",
    title: "Full Top Row Letters",
    level: "Intermediate",
    description: "Glide across QWERTYUIOP from left to right.",
    text: "q w e r t y u i o p  qwer tyui op  qwert yuiop  qwerty uiop  qwertyuiop  qwe rty uio p  asdf jkl; qwertyuiop;"
  },
  {
    id: "int-6-full-letter-bottom-row",
    title: "Full Bottom Row Letters",
    level: "Intermediate",
    description: "Cover the entire bottom row with flowing patterns.",
    text: "z x c v b n m  zx cv bn m  zxcv bnm  zxcvbnm  z x c v  b n m  zxcv bnm  asdf jkl; zxcvbnm;"
  },
  {
    id: "int-7-multi-row-ladders",
    title: "Multi-Row Ladders I",
    level: "Intermediate",
    description: "Climb between rows from center to edges.",
    text: "q a z  w s x  e d c  r f v  t g b  y h n  u j m  i k ,  o l .  p ; /  q a z  y h n  asdf jkl; zxcvbnm;"
  },
  {
    id: "int-8-words-across-rows",
    title: "Words Across Rows I",
    level: "Intermediate",
    description: "Type real words that cross rows and sides.",
    text: "quick brown fax  jump over  tiny web mix  cozy jam fax  brave human text  warm quiet hands  asdf jkl; zxcvbnm;"
  },
  {
    id: "int-9-punctuation-basic",
    title: "Basic Punctuation Reach",
    level: "Intermediate",
    description: "Introduce comma, period, and question mark.",
    text: "yes, no, maybe.  wait, stop.  why now?  go, go, go.  small step, big jump.  calm hands, quick mind.  asdf jkl; , . ?"
  },
  {
    id: "int-10-branch-review",
    title: "Branching Review Run",
    level: "Intermediate",
    description: "Review all branches from the center cluster.",
    text: "asdf jkl; qwe rty uio p  zxc vbn m  q a z  w s x  e d c  r f v  t g b  y h n  u j m  asdf jkl; zxcvbnm qwertyuiop;"
  },
  {
    id: "int-11-branch-review-slow",
    title: "Branching Review — Slow",
    level: "Intermediate",
    description: "Slower ladders and branch patterns for precision.",
    text: "q a z  w s x  e d c  asdf jkl;  qwe zxc  u j m  i k ,  o l .  p ; /  asdf jkl;  qwe zxc uio nm,"
  },
  {
    id: "int-12-branch-review-tempo",
    title: "Branching Review — Tempo",
    level: "Intermediate",
    description: "Faster ladders across left and right branches.",
    text: "qwe asdf zxc  uio jkl nm,  q a z  w s x  e d c  r f v  t g b  y h n  u j m  asdf jkl; zxcvbnm qwertyuiop;"
  },
  {
    id: "int-13-words-across-rows-ii",
    title: "Words Across Rows II",
    level: "Intermediate",
    description: "More cross-row words and combos.",
    text: "quiet warm web  fuzzy box mix  cozy new jam  brave text row  quick human vibe  warm quiet night  asdf jkl; zxcvbnm;"
  },
  {
    id: "int-14-punctuation-flow",
    title: "Punctuation Flow",
    level: "Intermediate",
    description: "Longer sentences mixing commas, periods, and questions.",
    text: "wait, type slow. then speed up. why rush?  focus, breathe, type.  hands calm, mind sharp.  asdf jkl; , . ?"
  },
  {
    id: "int-15-caps-home-row",
    title: "Home Row with Capitals",
    level: "Intermediate",
    description: "Practice capitalizing home-row words using Shift.",
    text: "Asdf Jkl; Asdf Jkl;  Add Dad Sad Lad  FALL ALL CALL  Keep fingers on ASDF and JKL;  Home Row Home Row HOME row;"
  },
  {
    id: "int-16-caps-top-row",
    title: "Top Row Caps Mix",
    level: "Intermediate",
    description: "Mix capital top-row letters with lowercase words.",
    text: "Qwe qwe Qwe  WeB Web WEB  TypE Type TYPE  Quick QUIck QUICK  Watch Shift key with left and right pinky;"
  },
  {
    id: "int-17-caps-words-across-rows",
    title: "Caps Across Rows",
    level: "Intermediate",
    description: "Type words that start with capitals across rows.",
    text: "Quick fox jumps  Brown Bear walks  Tiny Web Mix  Cozy Jam Box  Brave Human Text  Warm Quiet Hands;"
  },
  {
    id: "int-18-caps-short-sentences",
    title: "Short Sentences with Capitals",
    level: "Intermediate",
    description: "Short sentences that always start with capital letters.",
    text: "This is fine.  Keep Hands Steady.  Watch Your Shift Key.  Type With Calm Focus.  Practice Every Day."
  },
  {
    id: "exp-0-hand-placement",
    title: "Keyboard Hand Placement — Expert",
    level: "Expert",
    description:
      "Fine-tune finger responsibilities for numbers and symbols at speed.",
    infoOnly: true
  },
  {
    id: "exp-1-numbers-row-intro",
    title: "Numbers Row Warmup",
    level: "Expert",
    description: "Introduce the numbers row with steady patterns.",
    text: "1 2 3 4 5  6 7 8 9 0  1 2 3 4 5  6 7 8 9 0  12345 67890  12 34 56 78 90  asdf jkl; qwertyuiop 1234567890;"
  },
  {
    id: "exp-1b-numbers-row-drill",
    title: "Numbers Row Drill",
    level: "Expert",
    description: "More mixed groups of numbers with anchors.",
    text: "123 456 789 0  12 34 56 78 90  13579 24680  1q 2w 3e 4r 5t  6y 7u 8i 9o 0p  asdf jkl; 1234567890;"
  },
  {
    id: "exp-1c-numbers-row-flow",
    title: "Numbers Row Flow",
    level: "Expert",
    description: "Longer flowing sequences across the number row.",
    text: "1 2 3 4 5 6 7 8 9 0  0 9 8 7 6 5 4 3 2 1  12 34 56 78 90  19 28 37 46 55  1234567890 asdf jkl;"
  },
  {
    id: "exp-2-symbols-and-shift",
    title: "Shift and Symbols I",
    level: "Expert",
    description: "Practice common symbol reaches with shift keys.",
    text: "! ? @ # $  % ^ & * ( )  !@#  ?&*  email: name@example.com  cost: $25.99  code: A1B2-C3D4  asdf jkl; 1234567890 !@#$%^&*()"
  },
  {
    id: "exp-2b-symbols-and-shift-ii",
    title: "Shift and Symbols II",
    level: "Expert",
    description: "More dense symbol patterns with letters and numbers.",
    text: "!@#$ %^&* ()  1! 2@ 3# 4$ 5%  6^ 7& 8* 9( 0)  pass? code: A9B8-C7D6  cost: $10.50  asdf jkl; 1234567890 !@#$%^&*()"
  },
  {
    id: "exp-3-full-keyboard-sentences",
    title: "Full Keyboard Sentences I",
    level: "Expert",
    description: "Use nearly every key in smooth, natural sentences.",
    text: "A quick brown fox jumps over 12 lazy dogs near the river.  Mix jazz, rock, and folk at 7 pm.  Type with calm shoulders and steady breath.  Watch your accuracy, then add speed."
  },
  {
    id: "exp-3b-full-keyboard-sentences-ii",
    title: "Full Keyboard Sentences II",
    level: "Expert",
    description: "More varied sentences with numbers and symbols.",
    text: "Pack 3 boxes with 5 quick gifts by 7 pm.  Type clean code, save often, and watch logs.  At 9:30, review your stats and push for +5 WPM."
  },
  {
    id: "exp-4-pangram-drills",
    title: "Pangram Drills",
    level: "Expert",
    description: "Practice classic pangrams that hit every letter.",
    text: "The quick brown fox jumps over the lazy dog.  Pack my box with five dozen liquor jugs.  Sphinx of black quartz, judge my vow.  Waltz, bad nymph, for quick jigs vex.  asdf jkl; zxcvbnm qwertyuiop 1234567890."
  },
  {
    id: "exp-5-speed-bursts-full-board",
    title: "Speed Bursts — Full Board",
    level: "Expert",
    description: "Short, intense bursts using the whole keyboard.",
    text: "asdf jkl; qwer uiop zxcv bnm  1234 5678 90  1q 2w 3e 4r 5t  6y 7u 8i 9o 0p  fast text, quick hands, sharp focus."
  },
  {
    id: "exp-6-expert-review-run",
    title: "Expert Full Keyboard Review",
    level: "Expert",
    description: "Combine close control and far reaches in one long run.",
    text: "asdf jkl; zxcvbnm qwertyuiop 1234567890 !@#$%^&*()  The quick brown fox jumps over 13 lazy dogs, twice.  Calm hands, clear mind, precise keys, measured speed."
  },
  {
    id: "exp-7-full-board-sprint",
    title: "Full Board Sprint",
    level: "Expert",
    description: "Fast mixed bursts over letters, numbers, and symbols.",
    text: "asdf jkl; qwerty uiop zxcv bnm  1234 5678 90  !@#$ %^&* ()  fast text, quick hands, sharp focus, clear mind."
  },
  {
    id: "exp-8-numbers-and-words",
    title: "Numbers and Words Mix",
    level: "Expert",
    description: "Blend numbers into natural language sentences.",
    text: "In 5 minutes, type 200 words with 0 mistakes.  At 7 pm, review 3 runs and track 2 goals.  Score 1 new best WPM each week."
  },
  {
    id: "exp-9-symbol-combos-iii",
    title: "Symbol Combos III",
    level: "Expert",
    description: "Tight symbol combos with anchors and numbers.",
    text: "login? user@site.com  pass: a1B2#c3  price: $19.99  code: X9-Y8_Z7  asdf jkl; 1234567890 !@#$%^&*()"
  },
  {
    id: "exp-10-marathon-review",
    title: "Full Keyboard Marathon Review",
    level: "Expert",
    description: "A long mixed run using the entire board.",
    text: "asdf jkl; zxcvbnm qwertyuiop 1234567890 !@#$%^&*()  The quick brown fox jumps over 24 lazy dogs at 7 pm.  Calm hands, sharp eyes, steady rhythm, constant focus."
  },
  {
    id: "exp-11-caps-speed-bursts",
    title: "Caps Speed Bursts",
    level: "Expert",
    description:
      "High-speed bursts mixing capitals, numbers, and lowercase letters.",
    text: "FAST Fast fast  QUICK Quick quick  Type 3 FAST LINES in 10 Seconds  Mix Caps With 123 and asdf JKL;  PUSH Your WPM Higher."
  },
  {
    id: "exp-12-caps-with-symbols",
    title: "Caps with Numbers and Symbols",
    level: "Expert",
    description:
      "Combine capital words with numbers and shifted symbols in one run.",
    text: "CODE @ 3 PM  SAVE File#1 NOW!  PUSH Build@9:30  CHECK LOGS @ 10PM  NEXT STEP: Fix BUG#42 ASAP!"
  },
  {
    id: "exp-13-title-case-sentences",
    title: "Title Case Sentences",
    level: "Expert",
    description:
      "Practice title-style capitalization with clean punctuation and spacing.",
    text: "The Quick Brown Fox Jumps Over The Lazy Dog.  Clean Code Wins Every Time.  Calm Hands Make Fast Typists.  Practice Daily For Better Speed."
  },
  {
    id: "exp-14-acronyms-and-proper-nouns",
    title: "Acronyms and Proper Nouns",
    level: "Expert",
    description:
      "Type acronyms, names, and proper nouns with correct capitalization.",
    text: "NASA Launches New Rocket.  Meet Alex At 7PM.  Use Git, VSCode, And AWS Today.  Study Java, Spring Boot, And SQL Tonight."
  }
];

const PAGE_CHARS = 180;

const normalizeKeyChar = (ch) => {
  if (!ch) return ch;
  if (ch === " ") return " ";
  return /[a-z]/i.test(ch) ? ch.toLowerCase() : ch;
};

const fingerMap = {
  q: "LP",
  a: "LP",
  z: "LP",
  "1": "LP",
  w: "LR",
  s: "LR",
  x: "LR",
  "2": "LR",
  "@": "LR",
  e: "LM",
  d: "LM",
  c: "LM",
  "3": "LM",
  "#": "LM",
  r: "LI",
  f: "LI",
  v: "LI",
  "4": "LI",
  "$": "LI",
  t: "LI",
  g: "LI",
  b: "LI",
  "5": "LI",
  "%": "LI",
  y: "RI",
  h: "RI",
  n: "RI",
  "6": "RI",
  "^": "RI",
  u: "RI",
  j: "RI",
  m: "RI",
  "7": "RI",
  "&": "RI",
  i: "RM",
  k: "RM",
  ",": "RM",
  "8": "RM",
  "*": "RM",
  o: "RR",
  l: "RR",
  ".": "RR",
  "9": "RR",
  "(": "RR",
  p: "RP",
  ";": "RP",
  ":": "RP",
  "/": "RP",
  "0": "RP",
  ")": "RP",
  "'": "RP",
  "\u2019": "RP",
  '"': "RP",
  "?": "RP",
  "!": "RP"
};

const KEY_LAYOUT = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "?", ":", "'", '"']
];

function HandPlacementContent({ lesson }) {
  if (lesson.level === "Beginner") {
    return (
      <>
        <h3>Beginner Hand Placement</h3>
        <p>
          Sit up straight, relax your shoulders, and place your hands lightly on
          the keyboard.
        </p>
        <ul>
          <li>
            Rest your left hand on <strong>A S D F</strong> and your right hand
            on <strong>J K L ;</strong>. These are the home-row keys.
          </li>
          <li>
            Your thumbs float above the <strong>SPACE</strong> bar. Use one
            thumb (usually the right) to press space.
          </li>
          <li>
            Left pinky: <strong>A</strong>, plus nearby keys like{" "}
            <strong>Q</strong> and <strong>Z</strong>.
          </li>
          <li>
            Left ring: <strong>S</strong>; Left middle: <strong>D</strong>;
            Left index: <strong>F</strong> and <strong>G</strong>.
          </li>
          <li>
            Right index: <strong>J</strong> and <strong>H</strong>; Right
            middle: <strong>K</strong>; Right ring: <strong>L</strong>; Right
            pinky: <strong>;</strong> and <strong>ENTER / SHIFT</strong>.
          </li>
          <li>
            Always return your fingers to the home row after each reach. That is
            your "base camp."
          </li>
        </ul>
      </>
    );
  }

  if (lesson.level === "Intermediate") {
    return (
      <>
        <h3>Intermediate Hand Placement</h3>
        <p>
          You still start from home row, but now you reach confidently to the
          top and bottom rows.
        </p>
        <ul>
          <li>
            Keep your fingers resting on <strong>ASDF</strong> and{" "}
            <strong>JKL;</strong> when you are not pressing other keys.
          </li>
          <li>
            Top row reaches (QWERTYUIOP) are done by lifting the same finger
            straight up:
            <ul>
              <li>
                Left index: <strong>R</strong> and <strong>T</strong>
              </li>
              <li>
                Left middle: <strong>E</strong>; Left ring: <strong>W</strong>;
                Left pinky: <strong>Q</strong>
              </li>
              <li>
                Right index: <strong>Y</strong> and <strong>U</strong>
              </li>
              <li>
                Right middle: <strong>I</strong>; Right ring: <strong>O</strong>
                ; Right pinky: <strong>P</strong>
              </li>
            </ul>
          </li>
          <li>
            Bottom row reaches (ZXCVBNM) use the same finger straight down:
            <ul>
              <li>
                Left pinky: <strong>Z</strong>; Left ring: <strong>X</strong>;
                Left middle: <strong>C</strong>; Left index:{" "}
                <strong>V</strong>
              </li>
              <li>
                Right index: <strong>B</strong> and <strong>N</strong>; Right
                middle: <strong>M</strong>; Right ring/pinky: comma and period.
              </li>
            </ul>
          </li>
          <li>
            Move only from the knuckles, keeping wrists level and relaxed. Avoid
            lifting the whole hand off the keyboard.
          </li>
        </ul>
      </>
    );
  }

  return (
    <>
      <h3>Expert Hand Placement</h3>
      <p>
        At the expert level, you keep the same home-row base but add reliable
        reaches to numbers and symbols.
      </p>
      <ul>
        <li>
          Numbers row (<strong>1–0</strong>) sits above the top row. Reach with
          the same fingers that own the columns:
          <ul>
            <li>
              Left pinky: <strong>1</strong>; Left ring: <strong>2</strong>;
              Left middle: <strong>3</strong>; Left index: <strong>4</strong>{" "}
              and <strong>5</strong>
            </li>
            <li>
              Right index: <strong>6</strong> and <strong>7</strong>; Right
              middle: <strong>8</strong>; Right ring: <strong>9</strong>; Right
              pinky: <strong>0</strong>
            </li>
          </ul>
        </li>
        <li>
          Symbols with <strong>SHIFT</strong> use the same finger as the number
          underneath (for example, left ring handles both <strong>2</strong> and{" "}
          <strong>@</strong>).
        </li>
        <li>
          Keep your pinkies responsible for <strong>SHIFT</strong>,{" "}
          <strong>ENTER</strong>, and many punctuation keys, while your thumbs
          stay on <strong>SPACE</strong>.
        </li>
        <li>
          Even at high speed, always let fingers "snap back" to{" "}
          <strong>ASDF</strong> and <strong>JKL;</strong> as your default
          position.
        </li>
      </ul>
    </>
  );
}

const GRADE_BANDS = [
  { grade: "A+", min: 98 },
  { grade: "A", min: 95 },
  { grade: "A-", min: 92 },
  { grade: "B+", min: 88 },
  { grade: "B", min: 85 },
  { grade: "B-", min: 82 },
  { grade: "C+", min: 78 },
  { grade: "C", min: 75 },
  { grade: "C-", min: 72 },
  { grade: "D+", min: 68 },
  { grade: "D", min: 65 },
  { grade: "F", min: 0 }
];

const gradeFromAcc = (acc) => {
  for (const b of GRADE_BANDS) {
    if (acc >= b.min) return b.grade;
  }
  return "F";
};

export default function LessonsPage() {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [activeFingers, setActiveFingers] = useState(new Set());
  const [keyFlash, setKeyFlash] = useState({ key: null, type: null });
  const [levelFilter, setLevelFilter] = useState("All");
  const hiddenInputRef = useRef(null);

  const PROFILE_KEY = "learntotype:userProfile";

  const loadProfile = () => {
    try {
      return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const saveProfile = (profile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  };

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  const completedLessons = useMemo(() => {
    return new Set(profile?.completedLessons || []);
  }, [profile]);

  const resultsByLesson = useMemo(() => {
    return profile?.lessonResults || {};
  }, [profile]);

  const recordLessonResult = useCallback((lessonId, stats) => {
    setProfile((prev) => {
      const p = prev ?? {};
      const lessonResults = { ...(p.lessonResults || {}) };

      const acc = stats.acc;
      const wpm = stats.wpm;
      const grade = gradeFromAcc(acc);
      const now = new Date().toISOString();

      const existing = lessonResults[lessonId] || null;
      const last = { acc, wpm, grade, at: now };

      let best = existing?.best || null;
      if (!best) {
        best = { acc, wpm, grade, at: now };
      } else {
        const isBetter =
          acc > best.acc || (acc === best.acc && wpm > best.wpm);
        if (isBetter) best = { acc, wpm, grade, at: now };
      }

      lessonResults[lessonId] = { last, best };

      const prevList = Array.isArray(p.completedLessons)
        ? p.completedLessons
        : [];
      const completedLessonsNext = prevList.includes(lessonId)
        ? prevList
        : [...prevList, lessonId];

      const next = {
        ...p,
        completedLessons: completedLessonsNext,
        lessonResults
      };

      saveProfile(next);
      return next;
    });
  }, []);

  const makePages = (text) => {
    const words = text.split(/\s+/);
    const pages = [];
    let buf = "";
    for (const w of words) {
      if ((buf + " " + w).length > PAGE_CHARS) {
        if (buf.length > 0) pages.push(buf.trim());
        buf = w;
      } else {
        buf = buf ? buf + " " + w : w;
      }
    }
    if (buf) pages.push(buf.trim());
    return pages;
  };

  const startLesson = useCallback((lesson) => {
    if (lesson.infoOnly) {
      setCurrentLesson({
        lesson,
        pages: [],
        pageIndex: 0,
        chars: [],
        idx: 0,
        errors: 0,
        correct: 0,
        startedAt: null,
        finished: true,
        log: []
      });
      setOverlayVisible(true);
      return;
    }

    const pages = makePages(lesson.text);
    setCurrentLesson({
      lesson,
      pages,
      pageIndex: 0,
      chars: [...pages[0]],
      idx: 0,
      errors: 0,
      correct: 0,
      startedAt: null,
      finished: false,
      log: []
    });
    setOverlayVisible(true);
  }, []);

  const closePlayer = () => {
    setOverlayVisible(false);
    setCurrentLesson(null);
    setActiveKeys(new Set());
    setActiveFingers(new Set());
  };

  const restartLesson = () => {
    if (currentLesson && !currentLesson.lesson.infoOnly) {
      startLesson(currentLesson.lesson);
    }
  };

  const highlightForChar = (ch) => {
    const norm = normalizeKeyChar(ch);
    if (!norm) {
      setActiveKeys(new Set());
      setActiveFingers(new Set());
      return;
    }
    setActiveKeys(new Set([norm]));
    const finger = fingerMap[norm];
    setActiveFingers(finger ? new Set([finger]) : new Set());
  };

  const flashKey = (ch, ok) => {
    const norm = normalizeKeyChar(ch);
    setKeyFlash({ key: norm ?? null, type: ok ? "correct" : "wrong" });
    setTimeout(() => setKeyFlash({ key: null, type: null }), 150);
  };

  const calculateStats = (lesson) => {
    if (!lesson.startedAt || lesson.lesson.infoOnly) {
      return { wpm: 0, acc: 100, prog: 0 };
    }
    const elapsedMin = (Date.now() - lesson.startedAt) / 60000;
    const words = lesson.correct / 5;
    const wpm = elapsedMin > 0 ? Math.round(words / elapsedMin) : 0;
    const total = lesson.correct + lesson.errors;
    const acc = total
      ? Math.max(0, Math.round((lesson.correct / total) * 100))
      : 100;
    const totalChars = lesson.pages.join("").length;
    const typedGlobal =
      lesson.pages.slice(0, lesson.pageIndex).join("").length + lesson.idx;
    const prog = totalChars
      ? Math.round((typedGlobal / totalChars) * 100)
      : 0;
    return { wpm, acc, prog };
  };

  const openReview = (stats, lesson) => {
    const mistakes = lesson.log.filter((r) => !r.correct);
    const counts = {};
    mistakes.forEach((m) => {
      counts[m.expected] = (counts[m.expected] || 0) + 1;
    });
    setCurrentLesson((prev) => ({
      ...prev,
      reviewData: {
        wpm: stats.wpm,
        acc: stats.acc,
        grade: lesson.lesson.infoOnly ? null : gradeFromAcc(stats.acc),
        mistakes,
        counts,
        total: lesson.pages.join("").length,
        date: new Date().toISOString(),
        title: lesson.lesson.title
      }
    }));
    setReviewVisible(true);
  };

  const handleKey = useCallback(
    (ch) => {
      if (!currentLesson || currentLesson.finished) return;
      if (currentLesson.lesson.infoOnly) return;

      setCurrentLesson((prev) => {
        const L = { ...prev };
        if (L.startedAt == null) L.startedAt = Date.now();
        const expected = L.chars[L.idx];
        let ok = false;

        if (ch === expected) {
          ok = true;
          L.correct++;
        } else {
          L.errors++;
        }

        L.log.push({
          page: L.pageIndex,
          i: L.idx,
          expected,
          typed: ch,
          correct: ok
        });

        flashKey(expected, ok);

        if (L.idx < L.chars.length - 1) {
          L.idx++;
          highlightForChar(L.chars[L.idx]);
          return L;
        }

        if (L.pageIndex < L.pages.length - 1) {
          L.pageIndex++;
          L.chars = [...L.pages[L.pageIndex]];
          L.idx = 0;
          highlightForChar(L.chars[0]);
          return L;
        }

        L.finished = true;

        const finalStats = calculateStats(L);

        if (!L.lesson.infoOnly) {
          recordLessonResult(L.lesson.id, finalStats);
        }

        setTimeout(() => {
          openReview(finalStats, L);
        }, 100);

        return L;
      });
    },
    [currentLesson, recordLessonResult]
  );

  useEffect(() => {
    if (!overlayVisible || !hiddenInputRef.current) return;
    if (currentLesson?.lesson?.infoOnly) return;

    const id = setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 20);

    return () => clearTimeout(id);
  }, [overlayVisible, currentLesson]);

  useEffect(() => {
    const onKey = (e) => {
      if (!overlayVisible || !currentLesson) return;
      if (currentLesson.lesson.infoOnly) return;

      if (e.key.length === 1) {
        e.preventDefault();
        handleKey(e.key);
      } else if (e.key === "Spacebar" || e.code === "Space") {
        e.preventDefault();
        handleKey(" ");
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (reviewVisible) setReviewVisible(false);
        else closePlayer();
      } else if (e.key === "Enter" && currentLesson.finished) {
        e.preventDefault();
        setReviewVisible(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayVisible, currentLesson, handleKey, reviewVisible]);

  useEffect(() => {
    if (
      currentLesson?.chars &&
      currentLesson.idx < currentLesson.chars.length &&
      !currentLesson.lesson.infoOnly
    ) {
      highlightForChar(currentLesson.chars[currentLesson.idx]);
    }
  }, [currentLesson?.idx]);

  const lessonChars = useMemo(() => {
    if (!currentLesson || currentLesson.lesson.infoOnly) return new Set();
    const set = new Set();
    const text = currentLesson.lesson.text ?? "";
    for (const ch of text) {
      const norm = normalizeKeyChar(ch);
      if (!norm || norm === " " || norm === "\n" || norm === "\t") continue;
      set.add(norm);
    }
    return set;
  }, [currentLesson]);

  const stats = currentLesson
    ? calculateStats(currentLesson)
    : { wpm: 0, acc: 100, prog: 0 };

  const filtered = LESSONS.filter((l) => {
    if (levelFilter === "Completed") {
      return !l.infoOnly && completedLessons.has(l.id);
    }
    return levelFilter === "All" ? true : l.level === levelFilter;
  });

  return (
    <main>
      <section className={styles.hero}>
        <h1 className={styles.title}>Lessons</h1>
        <p className={styles.subtitle}>
          Structured practice from home-row basics to full-keyboard expert
          drills.
        </p>
      </section>

      <section className={styles.filterbar}>
        <button
          className={[
            styles["filter-btn"],
            levelFilter === "All" ? styles.active : ""
          ].join(" ")}
          onClick={() => setLevelFilter("All")}
        >
          All
        </button>
        <button
          className={[
            styles["filter-btn"],
            levelFilter === "Beginner" ? styles.active : ""
          ].join(" ")}
          onClick={() => setLevelFilter("Beginner")}
        >
          Beginner
        </button>
        <button
          className={[
            styles["filter-btn"],
            levelFilter === "Intermediate" ? styles.active : ""
          ].join(" ")}
          onClick={() => setLevelFilter("Intermediate")}
        >
          Intermediate
        </button>
        <button
          className={[
            styles["filter-btn"],
            levelFilter === "Expert" ? styles.active : ""
          ].join(" ")}
          onClick={() => setLevelFilter("Expert")}
        >
          Expert
        </button>
        <button
          className={[
            styles["filter-btn"],
            levelFilter === "Completed" ? styles.active : ""
          ].join(" ")}
          onClick={() => setLevelFilter("Completed")}
        >
          Completed
        </button>
      </section>

      <section className={styles.grid}>
        {filtered.map((lesson) => {
          const isComplete =
            !lesson.infoOnly && completedLessons.has(lesson.id);

          const res = resultsByLesson?.[lesson.id] || null;
          const recentGrade = res?.last?.grade || null;
          const bestGrade = res?.best?.grade || null;

          return (
            <article
              key={lesson.id}
              className={styles.card}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: ".5rem"
                }}
              >
                <h3>{lesson.title}</h3>
                <span className={styles.badge}>{lesson.level}</span>
              </div>

              <p className={styles.muted}>{lesson.description}</p>

              <div
                className={styles.actions}
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "auto"
                }}
              >
                <button
                  className={styles.btn}
                  onClick={() => startLesson(lesson)}
                >
                  Start
                </button>

                {isComplete && (
                  <div
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: ".2px",
                      background: "rgba(34,197,94,.16)",
                      border: "1px solid rgba(34,197,94,.45)",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      flexShrink: 0
                    }}
                    title={
                      recentGrade && bestGrade
                        ? `Recent: ${recentGrade} | Best: ${bestGrade}`
                        : "Complete"
                    }
                  >
                    <span style={{ fontSize: "16px" }}>✓</span>
                    {recentGrade && (
                      <span style={{ opacity: 0.92 }}>
                        Recent <strong>{recentGrade}</strong>
                      </span>
                    )}
                    {bestGrade && (
                      <span style={{ opacity: 0.92 }}>
                        Best <strong>{bestGrade}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {overlayVisible && currentLesson && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="playerTitle"
        >
          <div className={styles.player}>
            <header className={styles["player-header"]}>
              <div
                style={{ display: "flex", alignItems: "center", gap: ".6rem" }}
              >
                <span className={styles.badge}>
                  {currentLesson.lesson.level}
                </span>
                <h2 id="playerTitle">{currentLesson.lesson.title}</h2>
              </div>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  WPM <strong id="statWPM">{stats.wpm}</strong>
                </div>
                <div className={styles.stat}>
                  Accuracy <strong id="statACC">{stats.acc}</strong>
                </div>
                <div className={styles.stat}>
                  Progress <strong id="statPROG">{stats.prog}</strong>
                </div>
              </div>
            </header>

            <div className={styles["typing-pane"]}>
              {currentLesson.lesson.infoOnly ? (
                <div className={styles["lesson-text"]} id="lessonText">
                  <HandPlacementContent lesson={currentLesson.lesson} />
                </div>
              ) : (
                <>
                  <div className={styles["lesson-text"]} id="lessonText">
                    {currentLesson.chars.map((ch, i) => {
                      const spanClasses = [];
                      if (i === currentLesson.idx)
                        spanClasses.push(styles["char-current"]);
                      const logEntry = currentLesson.log.find(
                        (l) =>
                          l.i === i && l.page === currentLesson.pageIndex
                      );
                      if (logEntry)
                        spanClasses.push(
                          logEntry.correct
                            ? styles["char-correct"]
                            : styles["char-wrong"]
                        );
                      return (
                        <span
                          key={i}
                          data-i={i}
                          className={spanClasses.join(" ")}
                        >
                          {ch === " " ? "\u00A0" : ch}
                        </span>
                      );
                    })}
                  </div>

                  <div className={styles["kb-wrap"]} aria-hidden="true">
                    {KEY_LAYOUT.map((row, rowIdx) => {
                      const visibleRow = row.filter((key) => {
                        const norm = normalizeKeyChar(key);
                        return lessonChars.has(norm);
                      });
                      if (visibleRow.length === 0) return null;
                      return (
                        <div key={rowIdx} className={styles["kb-row"]}>
                          {visibleRow.map((key) => {
                            const normKey = normalizeKeyChar(key);
                            return (
                              <div
                                key={key}
                                className={[
                                  styles.key,
                                  activeKeys.has(normKey)
                                    ? styles.active
                                    : "",
                                  keyFlash.key === normKey &&
                                  keyFlash.type === "correct"
                                    ? styles["correct-flash"]
                                    : "",
                                  keyFlash.key === normKey &&
                                  keyFlash.type === "wrong"
                                    ? styles["wrong-flash"]
                                    : ""
                                ].join(" ")}
                                data-key={key}
                              >
                                {key.toUpperCase()}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    <div className={styles["kb-row"]}>
                      <div
                        className={[
                          styles.key,
                          styles.space,
                          activeKeys.has(" ") ? styles.active : "",
                          keyFlash.key === " " &&
                          keyFlash.type === "correct"
                            ? styles["correct-flash"]
                            : "",
                          keyFlash.key === " " && keyFlash.type === "wrong"
                            ? styles["wrong-flash"]
                            : ""
                        ].join(" ")}
                        data-key="SPACE"
                      >
                        SPACE
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <input
              ref={hiddenInputRef}
              className={styles["hidden-input"]}
              aria-hidden="true"
              readOnly
            />

            <footer className={styles["player-footer"]}>
              <button
                className={styles.btn}
                onClick={() =>
                  reviewVisible ? setReviewVisible(false) : closePlayer()
                }
              >
                Exit
              </button>
              <div style={{ display: "flex", gap: ".5rem" }}>
                {!currentLesson.lesson.infoOnly && (
                  <>
                    <button className={styles.btn} onClick={restartLesson}>
                      Restart
                    </button>
                    {currentLesson.finished && (
                      <button
                        className={styles.btn}
                        onClick={() => setReviewVisible(true)}
                      >
                        Review
                      </button>
                    )}
                  </>
                )}
              </div>
            </footer>
          </div>
        </div>
      )}

      {reviewVisible && currentLesson?.reviewData && (
        <div
          className={styles["review-overlay"]}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reviewTitle"
        >
          <div className={styles.review}>
            <header>
              <h3 id="reviewTitle">{currentLesson.reviewData.title} Review</h3>
              <button
                className={styles["icon-close"]}
                aria-label="Close"
                onClick={() => setReviewVisible(false)}
              >
                ×
              </button>
            </header>

            <div className={styles.stats} id="reviewStats">
              <span className={styles.chip}>
                WPM <strong>{currentLesson.reviewData.wpm}</strong>
              </span>
              <span className={styles.chip}>
                Accuracy <strong>{currentLesson.reviewData.acc}</strong>
              </span>
              {currentLesson.reviewData.grade && (
                <span className={styles.chip}>
                  Grade <strong>{currentLesson.reviewData.grade}</strong>
                </span>
              )}
              <span className={styles.chip}>
                Errors{" "}
                <strong>{currentLesson.reviewData.mistakes.length}</strong>
              </span>
              <span className={styles.chip}>
                Typed <strong>{currentLesson.reviewData.total}</strong>
              </span>
              <span className={styles.chip}>
                Date{" "}
                <strong>
                  {new Date(currentLesson.reviewData.date).toLocaleString()}
                </strong>
              </span>
            </div>

            <div className={styles.panel}>
              <div className={styles.mistakes}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Expected</th>
                      <th>Typed</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentLesson.reviewData.mistakes
                      .slice(0, 120)
                      .map((m, idx) => (
                        <tr key={idx} className={styles.bad}>
                          <td>{idx + 1}</td>
                          <td>{m.expected === " " ? "⎵" : m.expected}</td>
                          <td>{m.typed === " " ? "⎵" : m.typed}</td>
                          <td>{m.correct ? "✓" : "✗"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.heat}>
                <div
                  className={styles.subtitle}
                  style={{ margin: "0 0 .4rem 0" }}
                >
                  Mistake heat
                </div>
                <div className={styles["heat-grid"]}>
                  {Object.entries(currentLesson.reviewData.counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([ch, count], idx) => (
                      <div key={idx} className={styles["heat-cell"]}>
                        <div
                          style={{
                            fontSize: "1.1rem",
                            marginBottom: ".25rem"
                          }}
                        >
                          {ch === " " ? "⎵" : ch}
                        </div>
                        <div className={styles.muted}>
                          {count} error{count === 1 ? "" : "s"}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}