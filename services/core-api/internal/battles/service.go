package battles

import "context"

type BattlesService interface {
	CreateBattle(ctx context.Context, battle *Battle) error
	GetBattle(ctx context.Context, id string) (*Battle, error)
	JoinBattle(ctx context.Context, battleID, userID string) error
	SubmitRound(ctx context.Context, roundID, userID, code string) error
	GetActiveBattles(ctx context.Context) ([]Battle, error)
	InvitePlayer(ctx context.Context, invite *BattleInvite) error
}
