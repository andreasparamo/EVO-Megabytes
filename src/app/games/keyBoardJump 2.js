'use client';

import { useEffect, useRef } from 'react';

export default function KeyboardJumpGame({ onBack }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const difficultyLabelEl = document.getElementById('kj-difficulty-label');
    const wordListLabelEl = document.getElementById('kj-wordlist-label');
    const diffButtons = document.querySelectorAll('.kj-diff-btn');
    const wordDisplayEl = document.getElementById('kj-word-display');

    const difficultyConfigs = {
      easy: {
        key: 'easy',
        label: 'Easy',
        wordLabel: 'Short Words',
        wordList: [
          'as','to','in','on','up','cat','dog','sun','run','red',
          'blue','home','code','play','jump','tree','ball','bird','ring','star'
        ],
        jumpDuration: 850,
        lives: 5
      },
      medium: {
        key: 'medium',
        label: 'Medium',
        wordLabel: 'Standard Words',
        wordList: [
          'as','fair','euro','tree','code','home','snow','blue','note','quick',
          'jump','bird','star','rock','data','cloud','water','light','sound',
          'ring','space','night','green','wind','road','grass','tiny','happy'
        ],
        jumpDuration: 650,
        lives: 3
      },
      hard: {
        key: 'hard',
        label: 'Hard',
        wordLabel: 'Longer Words',
        wordList: [
          'keyboard','mountain','computer','practice','galaxy','language','journey','developer',
          'platform','strategy','analysis','distance','umbrella','relation','solution','velocity',
          'triangle','electron','graphics','pressure'
        ],
        jumpDuration: 520,
        lives: 2
      }
    };

    // GAME STATE
    let difficultyKey = 'medium';
    let gameState = 'menu'; // 'menu' | 'playing' | 'summary' | 'gameOver'
    const maxLevels = 3;
    let level = 1;

    const player = {
      x: W * 0.2,
      y: H - 120,
      w: 34,
      h: 40,
      jumping: false,
      jumpStart: 0,
      jumpDuration: 650,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0
    };

    const camera = { yOffset: 0, targetYOffset: 0 };
    const clouds = [];
    const platforms = [];

    let currentPlatformIndex = 0;
    let targetPlatformIndex = 1;
    let score = 0;
    let lives = 3;
    let wrongFlashTimer = 0;
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

    function rand(min, max) {
      return Math.random() * (max - min) + min;
    }

    function updateDifficultyUI() {
      const diff = getDifficulty();
      if (difficultyLabelEl) difficultyLabelEl.textContent = diff.label;
      if (wordListLabelEl) wordListLabelEl.textContent = diff.wordLabel;
      diffButtons.forEach(btn => {
        if (!(btn instanceof HTMLElement)) return;
        btn.classList.toggle('active', btn.dataset.diff === difficultyKey);
      });
    }

    function setDifficulty(key, options = {}) {
      if (!difficultyConfigs[key]) return;
      difficultyKey = key;
      updateDifficultyUI();
      if (options.restart) {
        level = 1;
        score = 0;
        startLevel(true);
      }
    }

    diffButtons.forEach(btn => {
      if (!(btn instanceof HTMLElement)) return;
      btn.addEventListener('click', () => {
        const key = btn.dataset.diff;
        if (key) setDifficulty(key, { restart: true });
      });
    });

    function resetClouds() {
      clouds.length = 0;
      for (let i = 0; i < 6; i++) {
        clouds.push({
          x: rand(0, W),
          y: rand(40, H * 0.6),
          w: rand(110, 180),
          h: rand(40, 70),
          speed: rand(10, 25),
          layer: Math.random() < 0.5 ? 1 : 2
        });
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
      const steps = 12 + (level - 1) * 4; // 12, 16, 20
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
          w: 200,
          h: 18,
          word: i === 0 ? '' : randomWords[i - 1],
          bobPhase: Math.random() * Math.PI * 2
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
      const wpm = elapsedSec
        ? Math.round((stats.correctChars / 5) / (elapsedSec / 60))
        : 0;

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

    // TYPE WORD display — now WHITE text
    function updateWordDisplay() {
      if (!wordDisplayEl) return;

      if (!currentWord) {
        wordDisplayEl.innerHTML =
          "<span class='remaining' style=\"color:#fff;\">All platforms cleared!</span>";
        return;
      }

      const safeTyped = typed.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const remaining = currentWord
        .slice(typed.length)
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      wordDisplayEl.innerHTML =
        `<span class="typed" style="color:#fff;">${safeTyped}</span>` +
        `<span class="remaining" style="color:#fff;">${remaining}</span>`;
    }

    function chooseNextWord() {
      const p = platforms[targetPlatformIndex];
      if (!p || !p.word) {
        currentWord = '';
        updateWordDisplay();
        return;
      }
      currentWord = p.word;
      typed = '';
      updateWordDisplay();
    }

    function startLevel(resetAll) {
      resetClouds();
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

      const first = platforms[0];
      player.x = first.x + first.w * 0.2;
      player.y = first.y - player.h;
      player.jumping = false;
      player.jumpDuration = diff.jumpDuration;

      resetStatsForLevel();
      chooseNextWord();
      gameState = 'playing';
    }

    function showLevelSummary(isFinal) {
      const summary = computeSummary();
      summary.isFinal = isFinal;
      summaryData = summary;
      gameState = 'summary';
    }

    function handleLevelComplete() {
      const isFinal = level >= maxLevels;
      showLevelSummary(isFinal);
    }

    function endGameLose() {
      gameState = 'gameOver';
      messageText = 'GAME OVER. Press any key to restart from Level 1.';
    }

    function handleWordComplete() {
      score += 50;
      stats.correctWords += 1;
      stats.correctChars += currentWord.length;
      triggerJump();
    }

    function triggerJump() {
      const nextIndex = targetPlatformIndex;
      if (nextIndex >= platforms.length) return;

      const nextPlatform = platforms[nextIndex];
      player.jumping = true;
      player.jumpStart = performance.now();
      player.startX = player.x;
      player.startY = player.y;
      player.targetX = nextPlatform.x + nextPlatform.w * 0.25;
      player.targetY = nextPlatform.y - player.h;

      camera.targetYOffset = Math.max(0, H - 200 - nextPlatform.y);
    }

    function drawBackground() {
      ctx.save();
      ctx.translate(0, camera.yOffset);

      ctx.fillStyle = '#6bb86e';
      ctx.beginPath();
      ctx.moveTo(0, H - 40);
      ctx.lineTo(W * 0.25, H - 160);
      ctx.lineTo(W * 0.5, H - 40);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(W * 0.3, H - 40);
      ctx.lineTo(W * 0.6, H - 190);
      ctx.lineTo(W * 0.9, H - 40);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      for (const c of clouds) {
        ctx.save();
        ctx.globalAlpha = c.layer === 2 ? 0.9 : 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(c.x, c.y - camera.yOffset * 0.6, c.w, c.h, 20);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawPlatforms() {
      ctx.save();
      ctx.translate(0, camera.yOffset);

      for (const p of platforms) {
        const bob = Math.sin(p.bobPhase) * 2;
        const y = p.y + bob;

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(p.x + p.w / 2, y + p.h + 6, p.w / 2.4, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        const grad = ctx.createLinearGradient(0, y, 0, y + p.h);
        grad.addColorStop(0, '#53a93f');
        grad.addColorStop(1, '#34742a');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(p.x, y, p.w, p.h, 8);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + 4, y + 3);
        ctx.lineTo(p.x + p.w - 4, y + 3);
        ctx.stroke();

        if (p.word && p !== platforms[0]) {
          ctx.font = '18px system-ui';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#000';
          ctx.fillText(p.word, p.x + p.w / 2, y - 8);
        }
      }

      ctx.restore();
    }

    function drawPanel(width, height, renderInner) {
      const x = W * 0.5 - width / 2;
      const y = H * 0.5 - height / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      renderInner(x, y, width, height);
      ctx.restore();
    }

    function drawPlayer() {
      ctx.save();
      ctx.translate(0, camera.yOffset);

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(
        player.x + player.w / 2,
        player.y + player.h + 4,
        player.w / 2.4,
        6,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      const bodyGrad = ctx.createLinearGradient(
        player.x,
        player.y,
        player.x,
        player.y + player.h
      );
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(1, '#d0e4ff');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(player.x, player.y, player.w, player.h, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(player.x + player.w * 0.35, player.y + player.h * 0.35, 2.8, 0, Math.PI * 2);
      ctx.arc(player.x + player.w * 0.65, player.y + player.h * 0.35, 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(player.x + player.w * 0.5, player.y + player.h * 0.58, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(player.x + player.w * 0.5, player.y - 4);
      ctx.lineTo(player.x + player.w * 0.5, player.y - 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(player.x + player.w * 0.5, player.y - 15, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawHUDOverlay() {
      ctx.save();
      ctx.font = '18px system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#000';
      ctx.fillText(`Score: ${score}`, 18, 14);
      ctx.fillText(`Level: ${level}/3`, 18, 36);

      const heartXStart = 18;
      const heartY = 64;
      ctx.font = '20px system-ui';
      for (let i = 0; i < lives; i++) {
        ctx.fillStyle = '#ff6a7a';
        ctx.fillText('❤', heartXStart + i * 22, heartY);
      }
      ctx.restore();

      if (wrongFlashTimer > 0) {
        const alpha = Math.max(0, wrongFlashTimer * 2);
        ctx.save();
        ctx.fillStyle = `rgba(255,0,0,${0.25 * alpha})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      if (gameState === 'menu') {
        drawPanel(520, 120, (x, y, w, h) => {
          ctx.font = '26px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000';
          ctx.fillText('Press any letter key to start', x + w / 2, y + h / 2);
        });
      } else if (gameState === 'gameOver') {
        drawPanel(520, 120, (x, y, w, h) => {
          ctx.font = '22px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#000';
          ctx.fillText(messageText, x + w / 2, y + h / 2);
        });
      } else if (gameState === 'summary' && summaryData) {
        drawPanel(560, 190, (x, y, w, h) => {
          ctx.textAlign = 'center';
          ctx.fillStyle = '#000';
          ctx.font = '22px system-ui';
          ctx.fillText(
            summaryData.isFinal
              ? 'Difficulty complete!'
              : `Level ${summaryData.level} complete`,
            x + w / 2,
            y + 36
          );
          ctx.font = '14px system-ui';
          const lines = [
            `Time: ${summaryData.elapsedSec.toFixed(1)} s`,
            `Words completed: ${summaryData.correctWords}`,
            `Keystrokes: ${summaryData.correctChars} correct · ${summaryData.wrongKeys} wrong`,
            `Accuracy: ${summaryData.accuracy}%`,
            `Estimated speed: ${summaryData.wpm} WPM`,
            '',
            summaryData.isFinal
              ? 'Press any key to play again (Level 1).'
              : 'Press any key for the next level.'
          ];
          lines.forEach((line, idx) => {
            ctx.fillText(line, x + w / 2, y + 70 + idx * 18);
          });
        });
      }
    }

    function render() {
      ctx.clearRect(0, 0, W, H);
      drawBackground();
      drawPlatforms();
      drawPlayer();
      drawHUDOverlay();
    }

    function update(dt, now) {
      for (const c of clouds) {
        c.x -= c.speed * dt * (c.layer === 2 ? 1.2 : 0.6);
        if (c.x + c.w < -40) {
          c.x = rand(20, 200) + W;
          c.y = rand(40, H * 0.6);
        }
      }

      camera.yOffset += (camera.targetYOffset - camera.yOffset) * Math.min(1, dt * 3);
      for (const p of platforms) p.bobPhase += dt * 1.5;

      if (wrongFlashTimer > 0) wrongFlashTimer -= dt;

      if (gameState !== 'playing') return;

      if (player.jumping) {
        const t = Math.min(1, (now - player.jumpStart) / player.jumpDuration);
        const ease = t;
        const parabolic = 4 * t * (1 - t);
        player.x = player.startX + (player.targetX - player.startX) * ease;
        const baseY = player.startY + (player.targetY - player.startY) * ease;
        const jumpHeight = 130;
        player.y = baseY - parabolic * jumpHeight;

        if (t >= 1) {
          player.jumping = false;
          currentPlatformIndex = targetPlatformIndex;
          targetPlatformIndex++;
          chooseNextWord();
          if (targetPlatformIndex >= platforms.length && gameState === 'playing') {
            handleLevelComplete();
          }
        }
      } else {
        player.y += Math.sin(now / 300) * 0.15;
      }
    }

    function loop(timestamp) {
      if (!lastTime) lastTime = timestamp;
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;
      update(dt, timestamp);
      render();
      animationFrameId = requestAnimationFrame(loop);
    }

    function keyHandler(e) {
      const key = e.key.toLowerCase();

      if (gameState === 'menu') {
        if (key.length === 1 && key >= 'a' && key <= 'z') {
          startLevel(true);
        }
        return;
      }

      if (gameState === 'summary' && summaryData) {
        if (summaryData.isFinal) {
          level = 1;
        } else {
          level += 1;
        }
        startLevel(false);
        summaryData = null;
        return;
      }

      if (gameState === 'gameOver') {
        level = 1;
        startLevel(true);
        return;
      }

      if (gameState !== 'playing') return;
      if (key.length !== 1 || key < 'a' || key > 'z') return;
      if (!currentWord) return;

      const expected = currentWord[typed.length];
      if (key === expected) {
        typed += key;
        if (typed.length === currentWord.length) {
          handleWordComplete();
        } else {
          stats.correctChars += 1;
          updateWordDisplay();
        }
      } else {
        stats.wrongKeys += 1;
        lives -= 1;
        wrongFlashTimer = 0.25;
        if (lives <= 0) {
          updateWordDisplay();
          endGameLose();
        }
      }
    }

    // INIT
    setDifficulty('medium');
    resetClouds();
    createPlatformsForCurrentLevel();
    chooseNextWord();
    updateWordDisplay();
    animationFrameId = requestAnimationFrame(loop);
    window.addEventListener('keydown', keyHandler);

    return () => {
      window.removeEventListener('keydown', keyHandler);
      cancelAnimationFrame(animationFrameId);
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
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <button className="btn" onClick={onBack}>
            ← Back
          </button>
          <h2 style={{ marginLeft: '.4rem' }}>Keyboard Jump</h2>
        </div>
      </div>

      <div className="kj-wrapper">
        <div className="kj-header">
          <div className="kj-title">Keyboard Jump</div>
          <div className="kj-meta">
            <span>
              Difficulty: <strong id="kj-difficulty-label">Medium</strong>
            </span>
            <span>
              Word List: <strong id="kj-wordlist-label">Standard Words</strong>
            </span>
            <span>Press any key to start</span>
          </div>
        </div>

        <div className="kj-diff-select">
          <span className="kj-diff-label">Mode</span>
          <button className="kj-diff-btn" data-diff="easy">
            Easy
          </button>
          <button className="kj-diff-btn active" data-diff="medium">
            Medium
          </button>
          <button className="kj-diff-btn" data-diff="hard">
            Hard
          </button>
        </div>

        <canvas
          id="kj-gameCanvas"
          ref={canvasRef}
          width={960}
          height={540}
          className="kj-canvas"
        />

        <div className="kj-hud">
          <div className="kj-word-box">
            <div className="kj-word-label" style={{ color: '#fff' }}>
              TYPE WORD
            </div>
            <div
              id="kj-word-display"
              style={{
                color: '#fff',
                fontSize: '1.1rem',
                fontWeight: 600,
                minHeight: '1.2em'
              }}
            />
          </div>
          <div className="kj-info">
            <div>
              <strong>Controls:</strong> just start typing letters
            </div>
            <div>Finish the word to jump to the next platform.</div>
          </div>
        </div>

        <div className="kj-footer">
          Practice typing game.
        </div>
      </div>
    </section>
  );
}
