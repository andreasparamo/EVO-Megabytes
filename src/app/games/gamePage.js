'use client';

import { useState } from 'react';
import './games.css';

import WordFallGame from './waterFall';
import KeyboardJumpGame from './keyBoardJump';
import NinjaRaceGame from './ninjaRace';

export default function GamesPage() {
  const [currentView, setCurrentView] = useState('games');

  const games = [
    {
      id: 'wordfall',
      title: 'WordFall',
      description: 'Type words before they hit the bottom. Difficulty-aware, clean UI.',
      category: 'Typing • Reflex',
      image: '/dojo background.jpg'
    },
    {
      id: 'keyboardjump',
      title: 'Keyboard Jump',
      description: 'Jump across platforms by typing words correctly. 3 difficulty modes.',
      category: 'Typing • Platformer',
      image: '/Temple.jpg'
    },
    {
      id: 'ninjarace',
      title: 'Ninja Race',
      description: 'Race against 3 AI ninjas by typing words accurately. 3 difficulty modes.',
      category: 'Typing • Racing',
      image: '/racetrack.jpg'
    }
  ];

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
            {games.map((game) => (
              <article className="card" key={game.id}>
                <div
                  className="thumb game-thumb-image"
                  style={{
                    backgroundImage: `url('${game.image}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  <div className="thumb-overlay">{game.title.toUpperCase()}</div>
                </div>

                <h3>{game.title}</h3>
                <p>{game.description}</p>

                <div className="row">
                  <span className="muted">{game.category}</span>
                  <button className="btn primary" onClick={() => setCurrentView(game.id)}>
                    Play
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (currentView === 'wordfall') {
    return (
      <main>
        <WordFallGame onBack={() => setCurrentView('games')} />
      </main>
    );
  }

  if (currentView === 'keyboardjump') {
    return (
      <main>
        <KeyboardJumpGame onBack={() => setCurrentView('games')} />
      </main>
    );
  }

  if (currentView === 'ninjarace') {
    return (
      <main>
        <NinjaRaceGame onBack={() => setCurrentView('games')} />
      </main>
    );
  }

  return null;
}