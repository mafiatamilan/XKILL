package battles

import "time"

type Battle struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Type        string    `json:"type"`
	Status      string    `json:"status"`
	ProblemIDs  []string  `json:"problem_ids"`
	PlayerIDs   []string  `json:"player_ids"`
	WinnerID    string    `json:"winner_id"`
	StartedAt   time.Time `json:"started_at"`
	EndedAt     *time.Time `json:"ended_at"`
	CreatedAt   time.Time `json:"created_at"`
}

type BattleRound struct {
	ID        string `json:"id"`
	BattleID  string `json:"battle_id"`
	RoundNum  int    `json:"round_num"`
	ProblemID string `json:"problem_id"`
	Player1ID string `json:"player1_id"`
	Player2ID string `json:"player2_id"`
	WinnerID  string `json:"winner_id"`
}

type BattleInvite struct {
	ID        string    `json:"id"`
	BattleID  string    `json:"battle_id"`
	FromID    string    `json:"from_id"`
	ToID      string    `json:"to_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}
