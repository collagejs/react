import './App.css';
import ScoreBoard from "./ScoreBoard.js";

export default function App() {
  return <>
    <h1>Score Board Micro-Frontend</h1>
    <ScoreBoard team1={{ name: "Team 1", score: 0 }} team2={{ name: "Team 2", score: 0 }} />
  </>
}