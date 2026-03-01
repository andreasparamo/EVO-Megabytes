'use client';

import { useState, useEffect, useRef } from 'react';

const BACKGROUND_URL = '/track.png'; 
const MUSIC_URL = 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race1.ogg';
const USER_IMAGE_URL = '/running_ninja.jpg';
const BOT_IMAGE_URL = '/running_demon.jpg';

const difficultyConfigs = {
  beginner: { timeLimit: 75, minAccuracy: 70, botBaseWpm: 25 },
  intermediate: { timeLimit: 60, minAccuracy: 80, botBaseWpm: 45 },
  expert: { timeLimit: 50, minAccuracy: 95, botBaseWpm: 65 }
};

const MAX_QUOTE_LEN = 250;

export default function NinjaRaceGame({ onBack }) {
  const [gameState, setGameState] = useState('menu'); 
  const [difficulty, setDifficulty] = useState('beginner');
  const [customWpm, setCustomWpm] = useState(50);
  const [quote, setQuote] = useState('');
  const [userInput, setUserInput] = useState('');
  const [hasError, setHasError] = useState(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(75);
  const [count, setCount] = useState(3);

  const [stats, setStats] = useState({ wpm: 0, accuracy: 0, score: 0, status: '', won: false });
  const [bots, setBots] = useState({ b1: 0, b2: 0, b3: 0 });
  const [botMultipliers, setBotMultipliers] = useState({ b1: 0.9, b2: 1.0, b3: 1.1 });
  const [noTransition, setNoTransition] = useState(true);

  const audioRef = useRef(null);
  const inputRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const totalKeystrokesRef = useRef(0);
  const correctCharsRef = useRef(0);
  const nextQuoteRef = useRef('');
  const typedLenRef = useRef(0);

  const getCurrentConfig = () => {
    if (difficulty === 'custom') {
      return { timeLimit: 60, minAccuracy: 80, botBaseWpm: customWpm };
    }
    return difficultyConfigs[difficulty];
  };

  useEffect(() => {
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true; 
    audioRef.current.volume = 0.3;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = localMuted;
  }, [localMuted]);

  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'countdown') {
      if (count > 0) {
        const timer = setTimeout(() => setCount(count - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        startActualRace();
      }
    }
  }, [gameState, count]);

  const fetchQuote = async () => {
    try {
      const [res1, res2] = await Promise.all([
        fetch(`https://uselessfacts.jsph.pl/api/v2/facts/random?_=${Date.now()}`),
        fetch(`https://uselessfacts.jsph.pl/api/v2/facts/random?_=${Date.now() + 1}`)
      ]);
      
      const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
      
      let combinedText = `${data1.text} ${data2.text}`.trim().replace(/\s+/g, ' ');
      
      return combinedText.slice(0, MAX_QUOTE_LEN);
    } catch {
      return "Error connecting to the public database. Please verify your connection and restart the match to try again.";
    }
  };

  useEffect(() => {
    let interval;
    if (gameState === 'playing' && quote.length > 0) {
      interval = setInterval(() => {
        const config = getCurrentConfig();
        const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, config.timeLimit - elapsedSec);
        
        setTimeLeft(Math.ceil(remaining));
        if (remaining <= 0) {
          clearInterval(interval);
          endGame('timeout');
          return;
        }

        setBots(prev => {
          const moveBot = (current, multiplier) => {
            if (current >= 100) return 100;
            const speed = config.botBaseWpm * multiplier;
            const charsPerSecond = (speed * 5) / 60;
            const progressStep = (charsPerSecond / quote.length) * 10; 
            return Math.min(100, current + progressStep);
          };

          return {
            b1: moveBot(prev.b1, botMultipliers.b1), 
            b2: moveBot(prev.b2, botMultipliers.b2), 
            b3: moveBot(prev.b3, botMultipliers.b3)  
          };
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [gameState, quote, difficulty, customWpm, botMultipliers]);

  const startCountdown = async () => {
    setNoTransition(true);
    setUserInput('');
    setHasError(false);
    typedLenRef.current = 0;
    setBots({ b1: 0, b2: 0, b3: 0 });
    
    setBotMultipliers({
      b1: 0.75 + Math.random() * 0.5, 
      b2: 0.75 + Math.random() * 0.5,
      b3: 0.75 + Math.random() * 0.5
    });

    setGameState('countdown');
    setCount(3);
    const q = nextQuoteRef.current || await fetchQuote();
    setQuote(q);
  };

  const startActualRace = () => {
    totalKeystrokesRef.current = 0;
    correctCharsRef.current = 0;
    startTimeRef.current = Date.now();
    setGameState('playing');
    
    setTimeout(() => setNoTransition(false), 50);
    if (audioRef.current) {
        audioRef.current.play().catch(() => {});
    }
    
    fetchQuote().then(q => nextQuoteRef.current = q);
  };

  const handlePause = () => {
    if (gameState !== 'playing') return;
    setGameState('paused');
    pauseTimeRef.current = Date.now();
    if (audioRef.current) audioRef.current.pause();
  };

  const handleResume = () => {
    if (gameState !== 'paused') return;
    setGameState('playing');
    const timePaused = Date.now() - pauseTimeRef.current;
    startTimeRef.current += timePaused; 
    if (audioRef.current) {
        audioRef.current.play().catch(() => {});
    }
  };

  const handleRestart = (overrideDiff = null) => {
    const activeDiff = overrideDiff || difficulty;
    const config = activeDiff === 'custom' 
      ? { timeLimit: 60, minAccuracy: 80, botBaseWpm: customWpm } 
      : difficultyConfigs[activeDiff];

    setNoTransition(true); 
    setGameState('menu');
    setUserInput('');
    setHasError(false);
    setQuote('');
    typedLenRef.current = 0;
    setBots({ b1: 0, b2: 0, b3: 0 });
    setTimeLeft(config.timeLimit);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
  };

  const handleInput = (e) => {
    if (gameState !== 'playing') return;
    const val = e.target.value;
    
    if (val.length < userInput.length) {
      return; 
    }

    const newChars = val.slice(userInput.length);
    if (!newChars) return;
    
    const addedChar = newChars[newChars.length - 1]; 
    const expectedChar = quote[userInput.length];

    totalKeystrokesRef.current++;

    if (addedChar === expectedChar) {
      setHasError(false);
      const newUserInput = userInput + addedChar;
      setUserInput(newUserInput);
      typedLenRef.current = newUserInput.length;
      correctCharsRef.current = newUserInput.length;

      if (newUserInput.length === quote.length) {
        endGame('finished');
      }
    } else {
      setHasError(true);
    }
  };

  const endGame = (reason) => {
    const config = getCurrentConfig();
    const elapsedSec = (Date.now() - startTimeRef.current) / 1000;

    const calcBotProg = (multiplier) => {
      const speed = config.botBaseWpm * multiplier;
      const charsPerSecond = (speed * 5) / 60;
      return (charsPerSecond * elapsedSec / quote.length) * 100;
    };

    let beatingBots = [];
    if (calcBotProg(botMultipliers.b3) >= 100) beatingBots.push("Bot 3"); 
    if (calcBotProg(botMultipliers.b2) >= 100) beatingBots.push("Bot 2"); 
    if (calcBotProg(botMultipliers.b1) >= 100) beatingBots.push("Bot 1"); 

    let place = beatingBots.length + 1;

    let botNamesStr = "";
    if (beatingBots.length === 1) {
      botNamesStr = beatingBots[0];
    } else if (beatingBots.length === 2) {
      botNamesStr = beatingBots.join(" and ");
    } else if (beatingBots.length === 3) {
      botNamesStr = beatingBots.slice(0, -1).join(", ") + ", and " + beatingBots[beatingBots.length - 1];
    }

    const timeMin = elapsedSec / 60;
    const wpm = Math.round((correctCharsRef.current / 5) / timeMin) || 0;
    const accuracy = Math.round((correctCharsRef.current / Math.max(1, totalKeystrokesRef.current)) * 100);

    let status = '';
    let isWin = false;

    if (reason === 'timeout') {
      status = 'Time Expired! ' + (botNamesStr ? `${botNamesStr} beat you.` : 'The bots beat you.');
    } else if (accuracy < config.minAccuracy) {
      status = `Disqualified! Too many errors.`; 
    } else if (place === 1) {
      status = '1st Place! Victory!';
      isWin = true; 
    } else {
      const suffixes = ["th", "st", "nd", "rd"];
      const v = place % 100;
      const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
      status = `${place}${suffix} Place! ${botNamesStr} beat you.`;
    }

    setStats({ wpm, accuracy, status, won: isWin });
    setGameState('summary');
  };

  const userProgress = quote.length > 0 ? (userInput.length / quote.length) * 100 : 0;
  
  const racerTransition = noTransition ? 'none' : 'left 0.1s linear';

  return (
    <section id="ninjaRacePage" style={{ 
        color: '#fff', 
        minHeight: '100vh', 
        padding: '1rem', 
        position: 'relative'
    }}>
      
      <div className="nav-container" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn" onClick={onBack}>← Back</button>
          <span style={{ fontSize: '1.1rem', fontWeight: '500' }}>Ninja Race</span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <button 
            className="btn primary" 
            onClick={gameState === 'paused' ? handleResume : handlePause}
            disabled={gameState !== 'playing' && gameState !== 'paused'}
            style={{ opacity: (gameState === 'playing' || gameState === 'paused') ? 1 : 0.4, cursor: (gameState === 'playing' || gameState === 'paused') ? 'pointer' : 'not-allowed' }}
          >
            {gameState === 'paused' ? 'Resume' : 'Pause'}
          </button>
          
          <button 
            className="btn" 
            onClick={() => handleRestart()}
            disabled={gameState === 'menu'}
            style={{ opacity: gameState !== 'menu' ? 1 : 0.4, cursor: gameState !== 'menu' ? 'pointer' : 'not-allowed' }}
          >
            Restart
          </button>

          <span className="pill">Time: <b>{timeLeft}s</b></span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#222', padding: '4px 12px', borderRadius: '6px' }}>
            <select 
              value={difficulty} 
              onChange={(e) => {
                const newDiff = e.target.value;
                setDifficulty(newDiff);
                handleRestart(newDiff); 
              }} 
              style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', cursor: 'pointer' }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
              <option value="custom">Custom</option>
            </select>

            {difficulty === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid #444', paddingLeft: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>Bot WPM: {customWpm}</span>
                <input 
                  type="range" 
                  min="10" 
                  max="150" 
                  value={customWpm} 
                  onChange={(e) => {
                    const newWpm = Number(e.target.value);
                    setCustomWpm(newWpm);
                    handleRestart('custom'); 
                  }}
                  style={{ width: '80px', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>

          <button className="btn" onClick={() => setLocalMuted(!localMuted)}>{localMuted ? '🔇' : '🔊'}</button>
        </div>
      </div>

      <div className="race-arena" style={{ 
          position: 'relative', 
          padding: '20px', 
          borderRadius: '8px',
          backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.2)), url('${BACKGROUND_URL}')`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          minHeight: '280px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
        {[bots.b1, bots.b2, userProgress, bots.b3].map((prog, i) => (
          <div key={i} className={`nr-lane ${i < 3 ? 'border-bottom' : ''}`} style={{ 
            height: '60px', position: 'relative', display: 'flex', alignItems: 'center',
            borderBottom: i < 3 ? '1px solid rgba(255, 255, 255, 0.08)' : 'none'
          }}>
            <div style={{ 
              position: 'absolute', left: `${prog}%`, transition: racerTransition, transform: 'translateX(-100%)',
              display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2
            }}>
              <div style={{
                background: i === 2 ? '#4ade80' : '#4f46e5',
                padding: '4px 10px', borderRadius: '4px',
                fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap',
                color: i === 2 ? '#000' : '#fff',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}>
                {i === 2 ? 'YOU' : `BOT ${i > 2 ? i : i + 1}`}
              </div>
              <img 
                src={i === 2 ? USER_IMAGE_URL : BOT_IMAGE_URL} 
                alt={i === 2 ? 'User Racer' : 'Bot Racer'}
                style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  objectFit: 'cover', border: `2px solid ${i === 2 ? '#4ade80' : '#4f46e5'}`,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.3)', background: '#111',
                  transform: i !== 2 ? 'scaleX(-1)' : 'none'
                }}
              />
            </div>
          </div>
        ))}
        <div className="finish-line" style={{ 
          position: 'absolute', right: '10px', top: 0, bottom: 0, width: '4px', background: 'repeating-linear-gradient(0deg, #fff, #fff 10px, #000 10px, #000 20px)', zIndex: 1 
        }} />
      </div>

      <div className="typing-container" style={{ marginTop: '2rem', textAlign: 'center', position: 'relative' }}>
        {gameState === 'menu' && <button className="btn primary" onClick={startCountdown} style={{ fontSize: '1.5rem', marginTop: '2rem' }}>START RACE</button>}
        
        {gameState === 'countdown' && <h1 style={{ fontSize: '4rem', textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>{count}</h1>}

        {(gameState === 'playing' || gameState === 'paused') && (
          <>
            <div className="quote-display" style={{ fontSize: '1.25rem', lineHeight: '1.6', marginBottom: '1rem', textAlign: 'left', background: '#0b0b0b', padding: '20px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
              {quote.split('').map((char, i) => {
                let color = '#888';
                let background = 'transparent';
                let textDecoration = 'none';

                if (i < userInput.length) {
                  color = '#4ade80'; 
                } else if (i === userInput.length && gameState === 'playing') {
                  if (hasError) {
                    color = '#ef4444'; 
                    background = 'rgba(239, 68, 68, 0.2)'; 
                  } else {
                    textDecoration = 'underline';
                    background = '#444';
                  }
                }

                return (
                  <span key={i} style={{ color, background, textDecoration }}>
                    {char}
                  </span>
                );
              })}
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={handleInput}
              disabled={gameState !== 'playing'}
              style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
            />
          </>
        )}

        {gameState === 'paused' && (
          <div className="paused-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px' }}>
            <h2>Game Paused</h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn primary" onClick={handleResume} style={{ fontSize: '1.2rem' }}>Resume</button>
              <button className="btn" onClick={() => handleRestart()} style={{ fontSize: '1.2rem' }}>Restart</button>
            </div>
          </div>
        )}

        {gameState === 'summary' && (
          <div className="summary-overlay" style={{ background: 'rgba(0,0,0,0.9)', padding: '2rem', borderRadius: '12px', border: '1px solid #444', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, width: '80%' }}>
            <h2 style={{ color: stats.won ? '#4ade80' : '#ef4444' }}>{stats.status}</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', margin: '2rem 0' }}>
              <div><p style={{ color: '#aaa' }}>Speed</p><h3>{stats.wpm} WPM</h3></div>
              <div><p style={{ color: '#aaa' }}>Accuracy</p><h3>{stats.accuracy}%</h3></div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn primary" onClick={startCountdown}>Play Again</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}