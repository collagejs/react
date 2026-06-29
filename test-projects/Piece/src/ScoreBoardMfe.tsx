import type { CorePiece } from "@collagejs/core";
import { Piece, piece } from "@collagejs/react";
import { useState } from "react";
import './scoreBoardMfe.css';

// Use this URL to mount the piece from the dev server.  Note, however, that CSS will fail for piece instances mounted
// in shadow DOM.
// const moduleUrl = 'http://localhost:4550/src/piece.tsx';

// Use this URL to mount the piece from the dev server.  CSS works for piece instances mounted in shadow DOM when 
// the built piece is used.  You just don't get HMR when using the built piece.
const moduleUrl = 'http://localhost:4550/piece.js';

type TeamScore = {
    score: number;
    name: string;
};

type ScoreBoardProps = {
    label?: string;
    team1: TeamScore;
    team2: TeamScore;
};

type PartialScoreBoardProps = {
    label?: string;
    team1?: Partial<TeamScore>;
    team2?: Partial<TeamScore>;
};

async function importPiece() {
    const m = await import(/* @vite-ignore */ moduleUrl);
    return m.scoreBoardPiece() as CorePiece<ScoreBoardProps>;
}

export default function ScoreBoardMfe(props: PartialScoreBoardProps & { shadow: boolean | ShadowRootInit }) {
    const [show, setShow] = useState(true);
    const [score1, setScore1] = useState<TeamScore>({ score: props.team1?.score ?? 0, name: props.team1?.name ?? '' });
    const [score2, setScore2] = useState<TeamScore>({ score: props.team2?.score ?? 0, name: props.team2?.name ?? '' });
    return <>
        <div className="control-panel">
            <button className="control" onClick={() => setShow((s) => !s)}>
                {show ? 'Hide' : 'Show'} Score Board
            </button>
            <button className="control" onClick={() => setScore1((s) => ({ ...s, score: s.score + 1 }))}>
                <strong>{score1.name}</strong>:  Increment Score
            </button>
            <button className="control" onClick={() => setScore2((s) => ({ ...s, score: s.score + 1 }))}>
                <strong>{score2.name}</strong>:  Increment Score
            </button>
        </div>
        {show && <Piece {...piece(importPiece(), { shadow: props.shadow })} label={props.label} team1={score1} team2={score2} />}
    </>
}
