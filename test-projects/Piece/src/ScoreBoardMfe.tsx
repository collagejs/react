import type { CorePiece } from "@collagejs/core";
import { Piece, piece } from "@collagejs/react";
import { useMemo } from "react";

const moduleUri = 'http://localhost:4550/src/piece.tsx';

async function importPiece() {
    const m = await import(moduleUri);
    return m.scoreBoardPiece() as CorePiece<{ label?: string; team1: { score: number; name: string }; team2: { score: number; name: string } }>;
}

export default function ScoreBoardMfe() {
    const sb = useMemo(() => importPiece(), []);
    return <Piece {...piece(sb)} team1={{ score: 1, name: 'México' }} team2={{ score: 2, name: 'Brasil' }} />
}
