import { useMemo, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { Piece, piece } from '@collagejs/react';
import { buildTestPiece } from './mfe'
import ScoreBoardMfe from './ScoreBoardMfe'


function App() {
  const [count, setCount] = useState(0)
  const cjsPiece = useMemo(() => buildTestPiece(), []);
  const [magicValue, setMagicValue] = useState(111);

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>
      <div>
        <h1>CollageJS Piece</h1>
        <fieldset>
          <legend>Controls</legend>
          <button className="counter" onClick={() => setMagicValue((v) => v + 1)}>Update piece with new magic value</button>
          <input type="number" min="0" max="1000" value={magicValue} onChange={(e) => setMagicValue(Number(e.target.value))} />
          <input type="range" min="0" max="1000" value={magicValue} onChange={(e) => setMagicValue(Number(e.target.value))} />
        </fieldset>
        <Piece {...piece(cjsPiece, { shadow: { mode: 'open' } })} extra="제일 예쁜 가수" magic={magicValue} name="이지은" abc={true} />
        <h2>PRE from the app</h2>
        <pre>I'm content inside a PRE element.<br />Second line.</pre>
      </div>
      <div>
        <h1>Score Board Micro-Frontend 1</h1>
        <ScoreBoardMfe shadow={false} team1={{name: 'México', score: 1}} team2={{name: 'Brasil', score: 2}} />
        <h1>Score Board Micro-Frontend 2</h1>
        <ScoreBoardMfe shadow={true} team1={{name: 'Argentina', score: 3}} team2={{name: 'Germany', score: 4}} />
      </div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
