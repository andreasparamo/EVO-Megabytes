'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameScore } from '@/src/hooks/useGameScore';

const BACKGROUND_URL = '/dojo background.jpg';

const MUSIC_URL = 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3';

const WORDS = {
  beginner: ['cat','dog','sun','tree','book','code','star','bird','fish','wind','game','home','rock','ball','milk','blue','green','happy','quick','light','train','apple','bread','mouse','table','phone','water','smile','jump','rain','cloud','river','chair','plant','paper','piano','lemon','grape','quiet','sound','truck','road','house','clock','stone','sugar','butter','cable','castle','garden','blank','simple','bright','clean','cool','fresh','sweet','tiny','brave'],
  intermediate: ['jungle','rocket','puzzle','python','silver','laptop','winter','coffee','planet','thunder','network','battery','keyboard','monitor','quantum','dynamic','channel','gateway','compile','process','package','feature','digital','gravity','texture','control','cluster','balance','library','storage','service','latency','iterate','compute','backend','frontend','mutable','immutable','parallel','virtual','pointer','decimal','validate','optimize','fallback','tracking','partial','connect','resolve','context','adapter','decoder','encoder','handler','cursor','overlay','provider','schema'],
  expert: ['synchronous','metamorphosis','cryptography','microarchitecture','idempotency','observability','characteristic','multiplication','thermodynamics','inconsequential','polymorphism','interoperability','disambiguation','heterogeneous','electromagnetic','parallelizable','synchronization','serialization','mischaracterize','counterintuitive','decomposition','infrastructure','deserialization','posttranslational','electrophysiology','photoautotrophic','metacognition','hyperparameter','spectrophotometer','bioluminescence','neuroplasticity','phenomenological','telecommunication','photosensitivity','computationally','indistinguishable']
};

const PRESETS = {
  beginner: { baseFall: 60, spawn: 1600, laneWidth: 160 },
  intermediate: { baseFall: 60, spawn: 1300, laneWidth: 175 },
  expert: { baseFall: 60, spawn: 1100, laneWidth: 195 }
};

const COLORS = ['#FF0055', '#00CC66', '#0099FF', '#FFCC00', '#9933FF', '#FF6600', '#00E5FF', '#FF3399'];

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
  const char = 10; 
  const padding = 34; 
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
  const [isMuted, setIsMuted] = useState(false);

  // Hook to save game scores to Firestore for the leaderboard
  const { saveScore } = useGameScore('wordfall');

  const gameRef = useRef(null);
  const typeboxRef = useRef(null);
  const requestRef = useRef();
  const lastTimeRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const startTimeRef = useRef(null);
  const lanesRef = useRef([]);
  const laneCountRef = useRef(0);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4; 
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    if (running && !paused) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Audio play blocked until interaction:", error);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [running, paused]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const computeLanes = useCallback(() => {
    if (!gameRef.current) return;
    const width = gameRef.current.clientWidth;
    const laneWidth = PRESETS[difficulty].laneWidth;

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

    for (let i = laneCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [laneCandidates[i], laneCandidates[j]] = [laneCandidates[j], laneCandidates[i]];
    }

    const wWidth = estimateWordWidth(text);
    const newY = -50;

    const minXGap = 50;
    const minYGap = 130;

    for (const lane of laneCandidates) {
      const xCenter = lanesRef.current[lane];
      const newX = Math.round(xCenter - wWidth / 2);

      const maxX = gameRef.current.clientWidth - wWidth - 6;
      const clampedX = Math.max(6, Math.min(maxX, newX));

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
    if (aliveCount >= 5) return;

    const text = nextWord(difficulty);
    const slot = findSpawnSlot(text);
    if (!slot) return;

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    setWords(prev => {
      const newWord = {
        id: Date.now() + Math.random(),
        text,
        color,
        lane: slot.lane,
        y: -50,
        speed: 0,
        x: slot.x,
        w: slot.w,
        state: 'alive', 
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
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Save score to Firestore for the leaderboard
    if (score > 0) {
      saveScore(score, { level, difficulty });
    }

    setOverlayContent({
      title: 'Game Over',
      message: `Score ${score}`,
      actions: [{
        label: 'Play Again',
        primary: true,
        onClick: () => restart()
      }]
    });
    setOverlayVisible(true);
  }, [score, level, difficulty, saveScore]); 

  const resolveOverlaps = useCallback((list) => {
    const alive = list.filter(w => (w.state ?? 'alive') === 'alive');
    const minYGap = 120;

    alive.sort((a, b) => a.y - b.y);

    for (let i = 0; i < alive.length; i++) {
      for (let j = i + 1; j < alive.length; j++) {
        const A = alive[i];
        const B = alive[j];

        const aw = A.w ?? estimateWordWidth(A.text);
        const bw = B.w ?? estimateWordWidth(B.text);

        const dx = Math.abs((A.x + aw / 2) - (B.x + bw / 2));
        const dy = Math.abs(A.y - B.y);

        const nearX = dx < (aw + bw) / 2 + 40;
        if (nearX && dy < minYGap) {
          const push = (minYGap - dy) / 2;
          A.y = Math.max(-60, A.y - push);
          B.y = B.y + push;
        }
      }
    }

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
          const timeMultiplier = 1 + (elapsed * 0.015);
          const speed = (base * timeMultiplier) + (Math.random() * 10);

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
    if (lastSpawnRef.current >= cap && aliveCount < 5) {
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
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }

    setTimeout(() => spawnWord(), 120);
    setTimeout(() => spawnWord(), 420);
  }, [computeLanes, spawnWord]);

  const handleDifficultyChange = (e) => {
    const newDifficulty = e.target.value;
    setDifficulty(newDifficulty);
    
    setRunning(false);
    setPaused(false);
    setScore(0);
    setLevel(1);
    setLives(3);
    setWords([]);
    setOverlayVisible(false);
    
    startTimeRef.current = null;
    lastSpawnRef.current = 0;
    lastTimeRef.current = null;
    
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

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

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    const trimmed = value.trim();
    if (!trimmed) return;

    let match = null;
    let maxY = -Infinity;

    words.forEach(w => {
      if ((w.state ?? 'alive') !== 'alive') return;
      if (w.text.toLowerCase() === trimmed.toLowerCase() && w.y > maxY) {
        match = w;
        maxY = w.y;
      }
    });

    if (match) {
      sliceWord(match.id);
      setScore(s => s + 10);
      setInputValue('');
      setInputError(false);
    }
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
            onChange={handleDifficultyChange}
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>

          <button onClick={startGame} className="primary">
            {!running ? 'Start' : paused ? 'Resume' : 'Pause'}
          </button>
          
          <button 
            onClick={() => setIsMuted(!isMuted)} 
            className="btn"
            title={isMuted ? "Unmute Music" : "Mute Music"}
            style={{ width: '40px', display: 'flex', justifyContent: 'center', padding: '0.55rem 0' }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button onClick={restart}>Restart</button>

          <span className="pill">Score: <b>{score}</b></span>
          <span className="pill">Lives: <b>{lives}</b></span>
        </div>
      </div>

      <div className="kj-wrapper">
        <div className="kj-header">
          <div className="kj-meta">
          </div>
        </div>

        <section id="stage">
          <div 
            id="game" 
            ref={gameRef}
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('${BACKGROUND_URL}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {words.map(word => {
              const isSlicing = (word.state ?? 'alive') === 'slicing';
              return (
                <div
                  key={word.id}
                  className={`word ${isSlicing ? 'slicing' : ''}`}
                  style={{
                    transform: `translate(${word.x}px, ${word.y}px)`,
                    position: 'absolute',
                    '--word-color': word.color,
                    color: '#fff',
                    border: `2px solid ${word.color}`,
                    background: `${word.color}33`,
                    boxShadow: `0 0 15px ${word.color}66`
                  }}
                >
                  {isSlicing ? (
                    <>
                      <span className="half left" aria-hidden="true" style={{background: `${word.color}33`}}>{word.text}</span>
                      <span className="half right" aria-hidden="true" style={{background: `${word.color}33`}}>{word.text}</span>
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
            <div />
            <input
              ref={typeboxRef}
              id="typebox"
              type="text"
              placeholder="Start typing…"
              autoComplete="off"
              spellCheck="false"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className={inputError ? 'input-bad' : ''}
            />
          </div>
        </section>
      </div>
    </section>
  );
}