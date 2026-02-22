'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const WORDS = {
  beginner: ['cat','dog','sun','tree','book','code','star','bird','fish','wind','game','home','rock','ball','milk','blue','green','happy','quick','light','train','apple','bread','mouse','table','phone','water','smile','jump','rain','cloud','river','chair','plant','paper','piano','lemon','grape','quiet','sound','truck','road','house','clock','stone','sugar','butter','cable','castle','garden','blank','simple','bright','clean','cool','fresh','sweet','tiny','brave'],
  intermediate: ['jungle','rocket','puzzle','python','silver','laptop','winter','coffee','planet','thunder','network','battery','keyboard','monitor','quantum','dynamic','channel','gateway','compile','process','package','feature','digital','gravity','texture','control','cluster','balance','library','storage','service','latency','iterate','compute','backend','frontend','mutable','immutable','parallel','virtual','pointer','decimal','validate','optimize','fallback','tracking','partial','connect','resolve','context','adapter','decoder','encoder','handler','cursor','overlay','provider','schema'],
  expert: ['synchronous','metamorphosis','cryptography','microarchitecture','idempotency','observability','characteristic','multiplication','thermodynamics','inconsequential','polymorphism','interoperability','disambiguation','heterogeneous','electromagnetic','parallelizable','synchronization','serialization','mischaracterize','counterintuitive','decomposition','infrastructure','deserialization','posttranslational','electrophysiology','photoautotrophic','metacognition','hyperparameter','spectrophotometer','bioluminescence','neuroplasticity','phenomenological','telecommunication','photosensitivity','computationally','indistinguishable']
};

const PRESETS = {
  beginner: { baseFall: 60, spawn: 1600, laneWidth: 160 },
  intermediate: { baseFall: 85, spawn: 1300, laneWidth: 175 },
  expert: { baseFall: 110, spawn: 1100, laneWidth: 195 }
};

const bags = { beginner: [], intermediate: [], expert: [] };

function refillBag(key) {
  const arr = WORDS[key].slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  bags[key] = arr;
}
function nextWord(key) {
  if (!bags[key] || bags[key].length === 0) refillBag(key);
  return bags[key].pop();
}


function estimateWordWidth(text) {
  const char = 10; // px per char
  const padding = 34; // pill padding/border
  return Math.min(420, Math.max(86, text.length * char + padding));
}

export default function WordFallGame({ onBack }) {
  const [difficulty, setDifficulty] = useState('beginner');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [words, setWords] = useState([]);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayContent, setOverlayContent] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState(false);

  const gameRef = useRef(null);
  const typeboxRef = useRef(null);
  const requestRef = useRef();
  const lastTimeRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const startTimeRef = useRef(null);
  const lanesRef = useRef([]);
  const laneCountRef = useRef(0);

  const computeLanes = useCallback(() => {
    if (!gameRef.current) return;
    const width = gameRef.current.clientWidth;
    const laneWidth = PRESETS[difficulty].laneWidth;

    // fewer lanes => more horizontal spacing => less overlap across lanes
    const extraGap = 70;
    const count = Math.max(3, Math.floor(width / (laneWidth + extraGap)));

    laneCountRef.current = count;
    const margin = 18;
    const usable = width - margin * 2;
    lanesRef.current = Array.from({ length: count }, (_, i) =>
      Math.round(margin + (i + 0.5) * (usable / count))
    );
  }, [difficulty]);

  const findSpawnSlot = useCallback((text) => {
    if (!gameRef.current) return null;
    if (!lanesRef.current.length) computeLanes();

    const alive = words.filter(w => (w.state ?? 'alive') === 'alive');
    const laneCandidates = lanesRef.current.map((_, i) => i);

    // shuffle lanes
    for (let i = laneCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [laneCandidates[i], laneCandidates[j]] = [laneCandidates[j], laneCandidates[i]];
    }

    const wWidth = estimateWordWidth(text);
    const newY = -50;

    // minimum separation
    const minXGap = 26;
    const minYGap = 90;

    for (const lane of laneCandidates) {
      const xCenter = lanesRef.current[lane];
      const newX = Math.round(xCenter - wWidth / 2);

      // keep fully on screen
      const maxX = gameRef.current.clientWidth - wWidth - 6;
      const clampedX = Math.max(6, Math.min(maxX, newX));

      // check collision against existing words (2D)
      let ok = true;
      for (const other of alive) {
        const oWidth = other.w ?? estimateWordWidth(other.text);
        const dx = Math.abs((clampedX + wWidth / 2) - (other.x + oWidth / 2));
        const dy = Math.abs(newY - other.y);

        const overlapX = dx < (wWidth + oWidth) / 2 + minXGap;
        const overlapY = dy < minYGap;

        if (overlapX && overlapY) {
          ok = false;
          break;
        }
      }

      if (ok) return { lane, x: clampedX, w: wWidth };
    }

    return null;
  }, [words, computeLanes]);

  const spawnWord = useCallback(() => {
    const aliveCount = words.filter(w => (w.state ?? 'alive') === 'alive').length;
    if (aliveCount >= 3) return;

    const text = nextWord(difficulty);
    const slot = findSpawnSlot(text);
    if (!slot) return;

    setWords(prev => {
      const newWord = {
        id: Date.now() + Math.random(),
        text,
        lane: slot.lane,
        y: -50,
        speed: 0,
        x: slot.x,
        w: slot.w,
        state: 'alive', // alive | slicing
        sliceDir: Math.random() < 0.5 ? -1 : 1,
        slicedAt: 0
      };
      return [...prev, newWord];
    });
  }, [words, difficulty, findSpawnSlot]);

  const removeWord = useCallback((wordId) => {
    setWords(prev => prev.filter(w => w.id !== wordId));
  }, []);

  const sliceWord = useCallback((wordId) => {
    const now = performance.now();
    setWords(prev =>
      prev.map(w => (w.id === wordId ? { ...w, state: 'slicing', slicedAt: now } : w))
    );
    setTimeout(() => removeWord(wordId), 520);
  }, [removeWord]);

  const gameOver = useCallback(() => {
    setRunning(false);
    setPaused(false);
    setOverlayContent({
      title: 'Game Over',
      message: `Score ${score} · Level ${level}`,
      actions: [{
        label: 'Play Again',
        primary: true,
        onClick: () => restart()
      }]
    });
    setOverlayVisible(true);
  }, [score, level]); // eslint-disable-line react-hooks/exhaustive-deps

  const resolveOverlaps = useCallback((list) => {
    // very light overlap resolver for max 3 words
    const alive = list.filter(w => (w.state ?? 'alive') === 'alive');
    const minYGap = 78;

    // sort by y (top->bottom)
    alive.sort((a, b) => a.y - b.y);

    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const A = alive[i];
        const B = alive[j];

        const aw = A.w ?? estimateWordWidth(A.text);
        const bw = B.w ?? estimateWordWidth(B.text);

        const dx = Math.abs((A.x + aw / 2) - (B.x + bw / 2));
        const dy = Math.abs(A.y - B.y);

        // only separate if they are near each other horizontally (so it’s a real overlap)
        const nearX = dx < (aw + bw) / 2 + 18;
        if (nearX && dy < minYGap) {
          // push the higher one up a bit (clamp to keep on screen)
          const push = (minYGap - dy) / 2;
          A.y = Math.max(-60, A.y - push);
          B.y = B.y + push;
        }
      }
    }

    // write back changes
    const byId = new Map(alive.map(w => [w.id, w]));
    return list.map(w => (byId.has(w.id) ? { ...w, y: byId.get(w.id).y } : w));
  }, []);

  const update = useCallback((dt) => {
    if (!gameRef.current) return;

    let lifeLost = false;

    setWords(prev => {
      let updated = prev
        .map(w => {
          if ((w.state ?? 'alive') === 'slicing') return w;

          const base = PRESETS[difficulty].baseFall;
          const elapsed = startTimeRef.current ? (performance.now() - startTimeRef.current) / 1000 : 0;
          const timeFactor = 1 + Math.min(1.0, elapsed * 0.004);
          const levelFactor = 1 + (level - 1) * 0.06;
          const speed = (base + Math.random() * base * 0.25) * levelFactor * timeFactor;

          const newY = w.y + speed * dt;

          if (newY >= gameRef.current.clientHeight - 60) {
            if (!lifeLost) {
              lifeLost = true;
              setLives(l => {
                const newLives = Math.max(0, l - 1);
                if (newLives <= 0) setTimeout(() => gameOver(), 100);
                return newLives;
              });
            }
            return null;
          }

          return { ...w, y: newY, speed };
        })
        .filter(Boolean);

      updated = resolveOverlaps(updated);
      return updated;
    });

    lastSpawnRef.current += dt * 1000;
    const baseSpawn = PRESETS[difficulty].spawn;
    const cap = Math.max(900, baseSpawn - (level - 1) * 30);

    const aliveCount = words.filter(w => (w.state ?? 'alive') === 'alive').length;
    if (lastSpawnRef.current >= cap && aliveCount < 3) {
      lastSpawnRef.current = 0;
      spawnWord();
    }
  }, [difficulty, level, gameOver, spawnWord, words, resolveOverlaps]);

  const animate = useCallback((time) => {
    if (!running || paused) {
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    if (lastTimeRef.current === null) lastTimeRef.current = time;

    const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000);
    lastTimeRef.current = time;

    update(dt);
    requestRef.current = requestAnimationFrame(animate);
  }, [running, paused, update]);

  const reset = useCallback(() => {
    setWords([]);
    setScore(0);
    setLevel(1);
    setLives(3);
    startTimeRef.current = performance.now();
    lastSpawnRef.current = 0;
    lastTimeRef.current = null;
    setPaused(false);
    computeLanes();

    setTimeout(() => spawnWord(), 120);
    setTimeout(() => spawnWord(), 420);
  }, [computeLanes, spawnWord]);

  const startGame = () => {
    if (!running) {
      reset();
      setRunning(true);
      setOverlayVisible(false);
      setTimeout(() => typeboxRef.current && typeboxRef.current.focus(), 20);
    } else {
      togglePause();
    }
  };

  const togglePause = () => {
    setPaused(prev => {
      const newPaused = !prev;
      if (newPaused) {
        setOverlayContent({ title: 'Paused', message: 'Press Resume to continue.' });
        setOverlayVisible(true);
      } else {
        setOverlayVisible(false);
      }
      return newPaused;
    });
  };

  const restart = () => {
    setOverlayVisible(false);
    reset();
    setRunning(true);
    setTimeout(() => typeboxRef.current && typeboxRef.current.focus(), 20);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const value = inputValue.trim();
      if (!value) return;

      let match = null;
      let maxY = -Infinity;

      words.forEach(w => {
        if ((w.state ?? 'alive') !== 'alive') return;
        if (w.text.toLowerCase() === value.toLowerCase() && w.y > maxY) {
          match = w;
          maxY = w.y;
        }
      });

      if (match) {
        sliceWord(match.id);
        setScore(s => s + 10);
        setInputValue('');
      } else {
        setInputError(true);
        setTimeout(() => setInputError(false), 220);
      }
    }
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  useEffect(() => {
    computeLanes();
    const handleResize = () => computeLanes();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [computeLanes]);

  return (
    <section id="wordfallPage">
      <div
        className="nav-container"
        style={{
          padding: 0,
          margin: 0,
          maxWidth: '100%',
          display: 'flex',
          gap: '.6rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <button className="btn" onClick={onBack}>← Back</button>
          <h2 style={{ marginLeft: '.4rem' }}>WordFall</h2>
        </div>

        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <label htmlFor="difficulty" className="sr-only" style={{ position: 'absolute', left: '-9999px' }}>
            Difficulty
          </label>
          <select
            id="difficulty"
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>

          <button onClick={startGame} className="primary">
            {!running ? 'Start' : paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={restart}>Restart</button>

          <span className="pill">Score: <b>{score}</b></span>
          <span className="pill">Level: <b>{level}</b></span>
          <span className="pill">Lives: <b>{lives}</b></span>
        </div>
      </div>

      <div className="kj-wrapper">
        <div className="kj-header">
          <div className="kj-title">WordFall</div>

          {/* removed extra text next to difficulty */}
          <div className="kj-meta">
            <span>
              Difficulty:{' '}
              <strong>
                {difficulty === 'beginner'
                  ? 'Beginner'
                  : difficulty === 'intermediate'
                  ? 'Intermediate'
                  : 'Expert'}
              </strong>
            </span>
          </div>
        </div>

        <section id="stage">
          <div id="game" ref={gameRef}>
            {words.map(word => {
              const isSlicing = (word.state ?? 'alive') === 'slicing';
              return (
                <div
                  key={word.id}
                  className={`word ${isSlicing ? 'slicing' : ''}`}
                  style={{
                    transform: `translate(${word.x}px, ${word.y}px)`,
                    position: 'absolute'
                  }}
                >
                  {isSlicing ? (
                    <>
                      <span className="half left" aria-hidden="true">{word.text}</span>
                      <span className="half right" aria-hidden="true">{word.text}</span>
                      <span className="slash" aria-hidden="true" />
                      <span className="sr-only">{word.text}</span>
                    </>
                  ) : (
                    word.text
                  )}
                </div>
              );
            })}

            {overlayVisible && (
              <div id="overlay">
                <div id="overlayContent">
                  {overlayContent && (
                    <>
                      <h2>{overlayContent.title}</h2>
                      {overlayContent.message && <p>{overlayContent.message}</p>}
                      {overlayContent.actions && overlayContent.actions.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {overlayContent.actions.map((action, idx) => (
                            <button
                              key={idx}
                              className={`btn ${action.primary ? 'primary' : ''}`}
                              onClick={action.onClick}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="footer">
            {/* removed bottom text */}
            <div />
            <input
              ref={typeboxRef}
              id="typebox"
              type="text"
              placeholder="Start typing…"
              autoComplete="off"
              spellCheck="false"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={inputError ? 'input-bad' : ''}
            />
          </div>
        </section>
      </div>
    </section>
  );
}