import './ScoreBoard.css';

type TeamScore = {
    score: number;
    name: string;
};

type Props = {
    label?: string;
    team1: TeamScore;
    team2: TeamScore;
};

function TeamScoreDisplay({ team }: { team: TeamScore }) {
    return (
        <div className="team-score">
            <span className="score">{team.score}</span>
            <span className="team-name">{team.name}</span>
        </div>
    );
}

export default function ScoreBoard(props: Props) {
    return (
        <div className="score-board">
            <div className="score-label">{props.label || "Score Board"}</div>
            <div className="scores">
                <TeamScoreDisplay team={props.team1} />
                <TeamScoreDisplay team={props.team2} />
            </div>
        </div>
    );
}