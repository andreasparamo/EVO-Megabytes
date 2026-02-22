'use client';

import { useState } from 'react';
import './games.css';

import WordFallGame from './waterFall';
import KeyboardJumpGame from './keyBoardJump';

export default function GamesPage() {
  const [currentView, setCurrentView] = useState('games'); // 'games' | 'wordfall' | 'keyboardjump'

  // MAIN GAMES SELECT PAGE ---------------------------------------------
  if (currentView === 'games') {
    return (
      <main>
        <section id="gamesPage">
          <div className="games-hero">
            <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '.3px' }}>
              Games
            </h1>
            <p className="muted">Pick a game to practice your skills.</p>
          </div>

          <div className="grid">
            {/* WordFall card */}
            <article className="card">
              <div className="thumb">WORDFALL</div>
              <h3>WordFall</h3>
              <p>Type words before they hit the bottom. Difficulty-aware, clean UI.</p>
              <div className="row">
                <span className="muted">Typing • Reflex</span>
                <button className="btn primary" onClick={() => setCurrentView('wordfall')}>
                  Play
                </button>
              </div>
            </article>

            {/* Keyboard Jump card */}
            <article className="card">
              <div className="thumb">KEYBOARD JUMP</div>
              <h3>Keyboard Jump</h3>
              <p>Jump across platforms by typing words correctly. 3 difficulty modes.</p>
              <div className="row">
                <span className="muted">Typing • Platformer</span>
                <button className="btn primary" onClick={() => setCurrentView('keyboardjump')}>
                  Play
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    );
  }

  // WORDFALL VIEW ------------------------------------------------------
  if (currentView === 'wordfall') {
    return (
      <main>
        <WordFallGame onBack={() => setCurrentView('games')} />
      </main>
    );
  }

  // KEYBOARD JUMP VIEW -------------------------------------------------
  if (currentView === 'keyboardjump') {
    return (
      <main>
        <KeyboardJumpGame onBack={() => setCurrentView('games')} />
      </main>
    );
  }

  return null;
}
