 'use client';

import { useEffect, useRef } from 'react';
import { useGameScore } from '@/src/hooks/useGameScore';

const MUSIC_URL =
  'https://codeskulptor-demos.commondatastorage.googleapis.com/descent/background%20music.mp3';

const PLAYER_IMAGE_URL = '/Ninja.jpg';
const PLATFORM_IMAGE_URL = '/plank.jpg';

const FIXED_JUMP_DURATION_MS = 850;

export default function KeyboardJumpGame({ onBack }) {
  const canvasRef = useRef(null);

  // Hook to save game scores to Firestore for the leaderboard
  const { saveScore } = useGameScore('keyboardjump');
  const saveScoreRef = useRef(saveScore);

  // Keep the ref in sync with the latest saveScore callback
  useEffect(() => {
    saveScoreRef.current = saveScore;
  }, [saveScore]);

  useEffect(() => {
    let isCancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const bgMusic = new Audio(MUSIC_URL);
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    let localMuted = false;

    const playerImg = new Image();
    playerImg.src = PLAYER_IMAGE_URL;

    const platformImg = new Image();
    platformImg.src = PLATFORM_IMAGE_URL;

    let playerImgReady = false;
    let platformImgReady = false;

    let playerProcessedCanvas = null;
    let platformProcessedCanvas = null;

    function removeWhiteToTransparentToCanvas(img) {
      const iw = img.naturalWidth || img.width || 1;
      const ih = img.naturalHeight || img.height || 1;

      const oc = document.createElement('canvas');
      oc.width = iw;
      oc.height = ih;
      const octx = oc.getContext('2d');
      octx.clearRect(0, 0, iw, ih);
      octx.drawImage(img, 0, 0, iw, ih);

      const imgData = octx.getImageData(0, 0, iw, ih);
      const d = imgData.data;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        const nearWhite = r > 245 && g > 245 && b > 245;
        if (nearWhite) d[i + 3] = 0;
      }

      octx.putImageData(imgData, 0, 0);
      return oc;
    }

    playerImg.onload = () => {
      playerImgReady = true;
      playerProcessedCanvas = removeWhiteToTransparentToCanvas(playerImg);
    };
    playerImg.onerror = () => {
      playerImgReady = false;
      playerProcessedCanvas = null;
    };

    platformImg.onload = () => {
      platformImgReady = true;
      platformProcessedCanvas = removeWhiteToTransparentToCanvas(platformImg);
    };
    platformImg.onerror = () => {
      platformImgReady = false;
      platformProcessedCanvas = null;
    };

    const difficultyConfigs = {
      beginner: {
        key: 'beginner',
        wordList: [
          'as',
          'to',
          'in',
          'on',
          'up',
          'cat',
          'dog',
          'sun',
          'run',
          'red',
          'blue',
          'home',
          'code',
          'play',
          'jump',
          'tree',
          'ball',
          'bird',
          'ring',
          'star'
        ],
        jumpDuration: FIXED_JUMP_DURATION_MS,
        lives: 5
      },
      intermediate: {
        key: 'intermediate',
        wordList: [
          'as',
          'fair',
          'euro',
          'tree',
          'code',
          'home',
          'snow',
          'blue',
          'note',
          'quick',
          'jump',
          'bird',
          'star',
          'rock',
          'data',
          'cloud',
          'water',
          'light',
          'sound',
          'ring',
          'space',
          'night',
          'green',
          'wind',
          'road',
          'grass',
          'tiny',
          'happy'
        ],
        // changed to match beginner
        jumpDuration: FIXED_JUMP_DURATION_MS,
        lives: 3
      },
      expert: {
        key: 'expert',
        wordList: [
          'keyboard',
          'mountain',
          'computer',
          'practice',
          'galaxy',
          'language',
          'journey',
          'developer',
          'platform',
          'strategy',
          'analysis',
          'distance',
          'umbrella',
          'relation',
          'solution',
          'velocity',
          'triangle',
          'electron',
          'graphics',
          'pressure'
        ],
        // changed to match beginner
        jumpDuration: FIXED_JUMP_DURATION_MS,
        lives: 2
      }
    };

    let difficultyKey = 'beginner';
    let gameState = 'menu';
    const maxLevels = 3;
    let level = 1;

    const player = {
      x: W * 0.2,
      y: H - 120,
      w: 72,
      h: 72,
      jumping: false,
      jumpStart: 0,
      jumpDuration: FIXED_JUMP_DURATION_MS,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0
    };

    const camera = { yOffset: 0, targetYOffset: 0 };
    const platforms = [];

    let currentPlatformIndex = 0;
    let targetPlatformIndex = 1;
    let score = 0;
    let lives = 5;
    let wrongFlashTimer = 0;
    let levelNoticeTimer = 0;
    let messageText = '';

    let typed = '';
    let currentWord = '';

    let lastTime = 0;
    let animationFrameId;

    const stats = {
      correctWords: 0,
      correctChars: 0,
      wrongKeys: 0,
      levelStartTime: 0
    };
    let summaryData = null;

    function getDifficulty() {
      return difficultyConfigs[difficultyKey];
    }

    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function syncStartBtnText() {
      const startBtn = document.getElementById('kj-start-btn');
      if (!startBtn) return;
      if (gameState === 'menu' || gameState === 'gameOver' || gameState === 'summary') {
        startBtn.textContent = 'Start';
      } else if (gameState === 'playing') {
        startBtn.textContent = 'Pause';
      } else if (gameState === 'paused') {
        startBtn.textContent = 'Resume';
      }
    }

    function playAudio() {
      const playPromise = bgMusic.play();
      if (playPromise !== undefined) playPromise.catch(() => {});
    }

    function pauseAudio() {
      bgMusic.pause();
    }

    function syncOverlay() {
      const overlay = document.getElementById('overlay');
      const title = document.getElementById('overlay-title');
      const desc = document.getElementById('overlay-desc');
      const actions = document.getElementById('overlay-actions');
      if (!overlay || !title || !desc || !actions) return;

      if (gameState === 'playing' || gameState === 'menu') {
        overlay.style.display = 'none';
      } else {
        overlay.style.display = 'flex';
        actions.innerHTML = '';
        if (gameState === 'gameOver') {
          title.textContent = 'Game Over';
          desc.textContent = messageText;
          const btn = document.createElement('button');
          btn.className = 'btn primary';
          btn.textContent = 'Play Again';
          btn.onclick = () => {
            level = 1;
            startLevel(true);
            playAudio();
          };
          actions.appendChild(btn);
        } else if (gameState === 'paused') {
          title.textContent = 'Paused';
          desc.textContent = 'Press Resume to continue.';
          const btn = document.createElement('button');
          btn.className = 'btn primary';
          btn.textContent = 'Resume';
          btn.onclick = () => {
            gameState = 'playing';
            syncOverlay();
            syncStartBtnText();
            const typebox = document.getElementById('typebox');
            if (typebox) typebox.focus();
            playAudio();
          };
          actions.appendChild(btn);
        } else if (gameState === 'summary' && summaryData) {
          title.textContent = summaryData.isFinal
            ? 'Difficulty complete!'
            : `Level ${summaryData.level} complete`;
          desc.innerHTML = `
            Score: ${score} <br/><br/>
            Time: ${summaryData.elapsedSec.toFixed(1)} s<br/>
            Accuracy: ${summaryData.accuracy}%<br/>
            Speed: ${summaryData.wpm} WPM
          `;
          const btn = document.createElement('button');
          btn.className = 'btn primary';
          btn.textContent = summaryData.isFinal ? 'Play Again' : 'Next Level';
          btn.onclick = () => {
            if (summaryData.isFinal) {
              level = 1;
            } else {
              level += 1;
            }
            startLevel(false);
            summaryData = null;
            playAudio();
          };
          actions.appendChild(btn);
        }
      }
    }

    function updateWordDisplay() {
      const typebox = document.getElementById('typebox');
      if (typebox) typebox.value = typed;
    }

    function updateStatsUI() {
      const scoreValEl = document.getElementById('kj-score-val');
      const levelValEl = document.getElementById('kj-level-val');
      const livesValEl = document.getElementById('kj-lives-val');
      if (scoreValEl) scoreValEl.textContent = score;
      if (levelValEl) levelValEl.textContent = level;
      if (livesValEl) livesValEl.textContent = lives;
    }

    function resetToMenu() {
      level = 1;
      score = 0;
      typed = '';
      currentWord = '';
      platforms.length = 0;
      currentPlatformIndex = 0;
      targetPlatformIndex = 1;
      player.jumping = false;
      player.jumpStart = 0;
      player.startX = 0;
      player.startY = 0;
      player.targetX = 0;
      player.targetY = 0;
      camera.yOffset = 0;
      camera.targetYOffset = 0;
      wrongFlashTimer = 0;
      levelNoticeTimer = 0;
      messageText = '';
      summaryData = null;

      lives = getDifficulty().lives;

      // Always keep jump speed constant
      player.jumpDuration = FIXED_JUMP_DURATION_MS;

      updateStatsUI();
      updateWordDisplay();

      gameState = 'menu';
      syncOverlay();
      syncStartBtnText();

      pauseAudio();
      bgMusic.currentTime = 0;

      render();
    }

    function setDifficulty(key) {
      if (!difficultyConfigs[key]) return;
      difficultyKey = key;
      const diffSelectEl = document.getElementById('kj-difficulty');
      if (diffSelectEl) diffSelectEl.value = key;

      // Always keep jump speed constant (beginner speed)
      player.jumpDuration = FIXED_JUMP_DURATION_MS;

      resetToMenu();
    }

    function attachListeners() {
      const diffSelectEl = document.getElementById('kj-difficulty');
      if (diffSelectEl) diffSelectEl.onchange = (e) => setDifficulty(e.target.value);

      const muteBtn = document.getElementById('kj-mute-btn');
      if (muteBtn) {
        muteBtn.onclick = () => {
          localMuted = !localMuted;
          bgMusic.muted = localMuted;
          muteBtn.textContent = localMuted ? '🔇' : '🔊';
        };
      }

      const startBtn = document.getElementById('kj-start-btn');
      if (startBtn) {
        startBtn.onclick = () => {
          if (gameState === 'menu' || gameState === 'gameOver' || gameState === 'summary') {
            startLevel(true);
            playAudio();
          } else if (gameState === 'playing') {
            gameState = 'paused';
            syncOverlay();
            pauseAudio();
          } else if (gameState === 'paused') {
            gameState = 'playing';
            syncOverlay();
            const typebox = document.getElementById('typebox');
            if (typebox) typebox.focus();
            playAudio();
          }
          syncStartBtnText();
        };
      }

      const restartBtn = document.getElementById('kj-restart-btn');
      if (restartBtn) {
        restartBtn.onclick = () => {
          level = 1;
          score = 0;
          startLevel(true);
          bgMusic.currentTime = 0;
          playAudio();
          syncStartBtnText();
        };
      }
    }

    function getRandomWords(count) {
      const base = shuffleArray(getDifficulty().wordList.slice());
      const out = [];
      while (out.length < count) out.push(...base);
      return out.slice(0, count);
    }

    function createPlatformsForCurrentLevel() {
      platforms.length = 0;
      const steps = 12 + (level - 1) * 4;
      const wordsNeeded = steps - 1;
      const randomWords = getRandomWords(wordsNeeded);

      const startY = H - 80;
      const stepHeight = 50;
      const xSideLeft = W * 0.2;
      const xSideRight = W * 0.55;

      for (let i = 0; i < steps; i++) {
        const y = startY - i * stepHeight;
        const x = i % 2 === 0 ? xSideLeft : xSideRight;
        platforms.push({
          x,
          y,
          w: 160,
          h: 30,
          word: i === 0 ? '' : randomWords[i - 1]
        });
      }
    }

    function resetStatsForLevel() {
      stats.correctWords = 0;
      stats.correctChars = 0;
      stats.wrongKeys = 0;
      stats.levelStartTime = performance.now();
    }

    function computeSummary() {
      const now = performance.now();
      const elapsedSec = (now - stats.levelStartTime) / 1000;
      const totalKeys = stats.correctChars + stats.wrongKeys;
      const accuracy = totalKeys ? Math.round((stats.correctChars * 100) / totalKeys) : 100;
      const wpm = elapsedSec ? Math.round((stats.correctChars / 5) / (elapsedSec / 60)) : 0;

      return {
        level,
        elapsedSec,
        totalKeys,
        accuracy,
        wpm,
        correctWords: stats.correctWords,
        correctChars: stats.correctChars,
        wrongKeys: stats.wrongKeys,
        score
      };
    }

    function chooseNextWord() {
      const p = platforms[targetPlatformIndex];
      if (!p || !p.word) {
        currentWord = '';
        typed = '';
        updateWordDisplay();
        return;
      }
      currentWord = p.word;
      typed = '';
      updateWordDisplay();
    }

    function startLevel(resetAll) {
      if (resetAll) {
        level = 1;
        score = 0;
      }
      createPlatformsForCurrentLevel();

      const diff = getDifficulty();
      lives = diff.lives;
      wrongFlashTimer = 0;
      messageText = '';
      currentPlatformIndex = 0;
      targetPlatformIndex = 1;
      camera.yOffset = 0;
      camera.targetYOffset = 0;

      // Always keep jump speed constant (beginner speed)
      player.jumpDuration = FIXED_JUMP_DURATION_MS;

      const first = platforms[0];
      if (first) {
        player.x = first.x + first.w * 0.2;
        player.y = first.y - player.h + 6;
      }
      player.jumping = false;

      resetStatsForLevel();
      chooseNextWord();
      updateStatsUI();
      gameState = 'playing';
      syncOverlay();
      syncStartBtnText();

      const typebox = document.getElementById('typebox');
      if (typebox) typebox.focus();
    }

    function showLevelSummary(isFinal) {
      const summary = computeSummary();
      summary.isFinal = isFinal;
      summaryData = summary;
      gameState = 'summary';

      // Save score to Firestore when completing a difficulty
      if (isFinal && score > 0 && saveScoreRef.current) {
        saveScoreRef.current(score, { level, difficulty: difficultyKey });
      }

      syncOverlay();
      syncStartBtnText();
      pauseAudio();
    }

    function handleLevelComplete() {
      const isFinal = level >= maxLevels;
      if (isFinal) {
        showLevelSummary(true);
      } else {
        level++;
        startLevel(false);
        levelNoticeTimer = 2.5;
      }
    }

    function endGameLose() {
      gameState = 'gameOver';
      messageText = `Score ${score} · Level ${level}`;

      // Save score to Firestore for the leaderboard
      if (score > 0 && saveScoreRef.current) {
        saveScoreRef.current(score, { level, difficulty: difficultyKey });
      }

      syncOverlay();
      syncStartBtnText();
      pauseAudio();
      bgMusic.currentTime = 0;
    }

    function triggerJump() {
      const nextIndex = targetPlatformIndex;
      if (nextIndex >= platforms.length) return;

      const nextPlatform = platforms[nextIndex];
      player.jumping = true;
      player.jumpStart = performance.now();
      player.startX = player.x;
      player.startY = player.y;
      player.targetX = nextPlatform.x + nextPlatform.w * 0.2;
      player.targetY = nextPlatform.y - player.h + 6;

      camera.targetYOffset = Math.max(0, H - 200 - nextPlatform.y);
    }

    function drawPlatformImage(p, y) {
      if (!platformImgReady || !platformProcessedCanvas) return false;

      const imgW = platformProcessedCanvas.width;
      const imgH = platformProcessedCanvas.height;

      const scale = Math.min(p.w / imgW, p.h / imgH) * 0.9;

      const drawW = imgW * scale;
      const drawH = imgH * scale;

      const dx = p.x + (p.w - drawW) / 2;
      const dy = y + (p.h - drawH) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(platformProcessedCanvas, dx, dy, drawW, drawH);

      return true;
    }

    function drawPlatforms() {
      ctx.save();
      ctx.translate(0, camera.yOffset);

      for (let i = 0; i < platforms.length; i++) {
        const p = platforms[i];
        const y = p.y;

        const drawn = drawPlatformImage(p, y);

        if (!drawn) {
          const grad = ctx.createLinearGradient(0, y, 0, y + p.h);
          grad.addColorStop(0, '#53a93f');
          grad.addColorStop(1, '#34742a');
          ctx.fillStyle = grad;

          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(p.x, y, p.w, p.h, 10);
          else ctx.rect(p.x, y, p.w, p.h);
          ctx.fill();
        }

        if (p.word && i >= targetPlatformIndex) {
          ctx.font =
            '700 18px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

          if (i === targetPlatformIndex && typed.length > 0) {
            const typedPart = p.word.substring(0, typed.length);
            const remainingPart = p.word.substring(typed.length);
            const typedWidth = ctx.measureText(typedPart).width;
            const remainingWidth = ctx.measureText(remainingPart).width;
            const totalWidth = typedWidth + remainingWidth;
            const startX = p.x + p.w / 2 - totalWidth / 2;

            ctx.fillStyle = '#59ff9a';
            ctx.textAlign = 'left';
            ctx.fillText(typedPart, startX, y - 10);

            ctx.fillStyle = '#ffffff';
            ctx.fillText(remainingPart, startX + typedWidth, y - 10);
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(p.word, p.x + p.w / 2, y - 10);
          }
        }
      }

      ctx.restore();
    }

    function drawPlayerFallback() {
      ctx.save();
      ctx.translate(0, camera.yOffset);
      ctx.fillStyle = '#fff';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.restore();
    }

    function drawPlayer() {
      ctx.save();
      ctx.translate(0, camera.yOffset);

      if (playerImgReady && playerProcessedCanvas) {
        const imgW = playerProcessedCanvas.width || player.w;
        const imgH = playerProcessedCanvas.height || player.h;

        const scale = Math.min(player.w / imgW, player.h / imgH) * 1.15;
        const drawW = imgW * scale;
        const drawH = imgH * scale;

        const dx = player.x + (player.w - drawW) / 2;
        const dy = player.y + (player.h - drawH) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(playerProcessedCanvas, dx, dy, drawW, drawH);
      } else {
        ctx.restore();
        drawPlayerFallback();
        return;
      }

      ctx.restore();
    }

    function drawHUDOverlay() {
      if (levelNoticeTimer > 0 && gameState === 'playing') {
        const alpha = Math.max(0, Math.min(1, levelNoticeTimer));
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font =
          '700 48px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 8;
        ctx.fillText(`Level ${level}`, W / 2, H / 2);
        ctx.restore();
      }

      if (wrongFlashTimer > 0) {
        const alpha = Math.max(0, wrongFlashTimer * 2);
        ctx.save();
        ctx.fillStyle = `rgba(255,0,0,${0.25 * alpha})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      if (gameState !== 'menu') {
        drawPlatforms();
        drawPlayer();
        drawHUDOverlay();
      }
    }

    function update(dt, now) {
      camera.yOffset += (camera.targetYOffset - camera.yOffset) * Math.min(1, dt * 3);

      if (wrongFlashTimer > 0) wrongFlashTimer -= dt;
      if (levelNoticeTimer > 0) levelNoticeTimer -= dt;

      if (gameState !== 'playing') return;

      if (player.jumping) {
        const t = Math.min(1, (now - player.jumpStart) / player.jumpDuration);
        const parabolic = 4 * t * (1 - t);

        player.x = player.startX + (player.targetX - player.startX) * t;

        const baseY = player.startY + (player.targetY - player.startY) * t;
        player.y = baseY - parabolic * 130;

        if (t >= 1) {
          player.jumping = false;
          currentPlatformIndex = targetPlatformIndex;
          targetPlatformIndex++;
          chooseNextWord();
          if (targetPlatformIndex >= platforms.length && gameState === 'playing') {
            handleLevelComplete();
          }
        }
      }
    }

    function loop(timestamp) {
      if (isCancelled) return;
      if (!lastTime) lastTime = timestamp;
      let dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      if (dt > 0.1) dt = 0.1;

      update(dt, timestamp);
      render();

      if (!isCancelled) animationFrameId = requestAnimationFrame(loop);
    }

    function keyHandler(e) {
      const key = e.key.toLowerCase();

      if (gameState === 'menu' || gameState === 'summary' || gameState === 'gameOver') return;
      if (gameState !== 'playing') return;

      if (key.length === 1 && key >= 'a' && key <= 'z') e.preventDefault();
      if (key.length !== 1 || key < 'a' || key > 'z') return;
      if (!currentWord) return;

      const expected = currentWord[typed.length];
      if (key === expected) {
        typed += key;
        if (typed.length === currentWord.length) {
          score += 50;
          updateStatsUI();
          stats.correctWords += 1;
          stats.correctChars += currentWord.length;
          triggerJump();
        } else {
          stats.correctChars += 1;
          updateWordDisplay();
        }
      } else {
        stats.wrongKeys += 1;
        lives -= 1;
        wrongFlashTimer = 0.25;
        updateStatsUI();

        const tb = document.getElementById('typebox');
        if (tb) {
          tb.classList.add('input-bad');
          setTimeout(() => tb.classList.remove('input-bad'), 220);
        }

        if (lives <= 0) {
          updateWordDisplay();
          endGameLose();
        }
      }
    }

    attachListeners();
    setDifficulty('beginner');
    bgMusic.muted = localMuted;
    updateStatsUI();
    syncOverlay();
    syncStartBtnText();

    animationFrameId = requestAnimationFrame(loop);
    window.addEventListener('keydown', keyHandler);

    return () => {
      isCancelled = true;
      window.removeEventListener('keydown', keyHandler);
      cancelAnimationFrame(animationFrameId);
      bgMusic.pause();
    };
  }, []);

  return (
    <section id="keyboardJumpPage">
      <div
        className="nav-container"
        style={{
          padding: 0,
          margin: 0,
          maxWidth: '100%',
          display: 'flex',
          gap: '.6rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <button className="btn" onClick={onBack}>
            ← Back
          </button>
          <h2 style={{ marginLeft: '.4rem' }}>Keyboard Jump</h2>
        </div>

        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <label
            htmlFor="kj-difficulty"
            className="sr-only"
            style={{ position: 'absolute', left: '-9999px' }}
          >
            Difficulty
          </label>
          <select id="kj-difficulty" aria-label="Difficulty" defaultValue="beginner">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>

          <button id="kj-start-btn" className="primary">
            Start
          </button>

          <button
            id="kj-mute-btn"
            className="btn"
            style={{
              fontSize: '1.2rem',
              padding: '0.4rem 0.6rem',
              width: '40px',
              display: 'flex',
              justifyContent: 'center'
            }}
            title="Toggle Mute"
          >
            🔊
          </button>

          <button id="kj-restart-btn">Restart</button>

          <span className="pill">
            Score: <b id="kj-score-val">0</b>
          </span>
          <span className="pill">
            Level: <b id="kj-level-val">1</b>
          </span>
          <span className="pill">
            Lives: <b id="kj-lives-val">5</b>
          </span>
        </div>
      </div>

      <div className="kj-wrapper">
        <section id="stage">
          <div id="game">
            <canvas
              id="kj-gameCanvas"
              ref={canvasRef}
              width={960}
              height={540}
              className="kj-canvas"
              style={{ width: '100%', height: '100%', display: 'block' }}
            />

            <div id="overlay">
              <div id="overlayContent">
                <h2 id="overlay-title"></h2>
                <p id="overlay-desc"></p>
                <div
                  id="overlay-actions"
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center'
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="footer">
            <div />
            <input
              id="typebox"
              type="text"
              placeholder="Start typing…"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </section>
      </div>
    </section>
  );
}