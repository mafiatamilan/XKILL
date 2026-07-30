package battles

import "context"

type Repository interface {
	CreateBattle(ctx context.Context, battle *Battle) error
	GetBattle(ctx context.Context, id string) (*Battle, error)
	UpdateBattle(ctx context.Context, battle *Battle) error
	ListActiveBattles(ctx context.Context) ([]Battle, error)
	CreateBattleRound(ctx context.Context, round *BattleRound) error
	CreateInvite(ctx context.Context, invite *BattleInvite) error
	UpdateInvite(ctx context.Context, invite *BattleInvite) error
}
