import { buildPiece } from "@collagejs/react";
import { cssMountFactory } from "@collagejs/vite-css/ex";
import ScoreBoard from "./ScoreBoard.js";

const cssMount = cssMountFactory('piece');

export function scoreBoardPiece() {
    const piece = buildPiece(ScoreBoard);
    return {
        mount: [cssMount, piece.mount],
        update: piece.update,
    }
}
