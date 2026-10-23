import { describe, expect, it } from 'vitest';
import { applyAction, createGame } from '../src/engine/game';
import type { GameState } from '../src/engine/types';
import { addGame, badgesEarned, recordKey, VETERAN_GAMES } from '../src/ui/records';

const TR = 1_000_000;

/** A finished two-player game that Đăng (player 0) won when Lan went bankrupt. */
function finished(change: (s: GameState) => void = () => {}, lanIsBot = false): GameState {
  const s = structuredClone(
    createGame({
      players: [
        { name: 'Đăng', token: 'nonLa' },
        { name: 'Lan', token: 'conTrau', ...(lanIsBot ? { bot: 'hard' as const } : {}) },
      ],
      seed: 3,
    }),
  );
  change(s);
  s.current = 1;
  s.phase = { kind: 'inDebt', debtor: 1, creditor: 0, amount: 100 * TR, reason: { kind: 'rent', space: 39 } };
  return applyAction(s, { type: 'DECLARE_BANKRUPTCY' });
}

describe('badges from one game', () => {
  it('needs a finished game', () => {
    const s = createGame({ players: [{ name: 'A', token: 'nonLa' }, { name: 'B', token: 'conTrau' }] });
    expect(badgesEarned(s, 0)).toEqual([]);
  });

  it('counts the đình, a whole set, rent, doubles and trades', () => {
    const game = finished((s) => {
      s.ownership[1] = { owner: 0, houses: 5, mortgaged: false };
      s.ownership[3] = { owner: 0, houses: 5, mortgaged: false };
      s.stats[0].rentReceived = 12 * TR;
      s.stats[0].doubles = 9;
      s.stats[0].trades = 3;
    });
    expect(badgesEarned(game, 0)).toEqual(expect.arrayContaining(['hotel', 'fullSet', 'rentKing', 'lucky', 'trader']));
    expect(badgesEarned(game, 1)).not.toContain('hotel');
  });

  it('rewards beating a Khó bot, but only the winner', () => {
    const game = finished(() => {}, true);
    expect(badgesEarned(game, 0)).toContain('beatHard');
    expect(badgesEarned(game, 0)).toContain('quickWin'); // won in the first round
  });
});

describe('records', () => {
  it('counts games and wins per name, ignoring case and spaces', () => {
    let records = {};
    ({ records } = addGame(records, finished(), [0, 1], { now: 1 }));
    const second = finished((s) => (s.players[0].name = '  đăng '));
    const { records: after, earned } = addGame(records, second, [0, 1], { now: 2 });
    const dang = after[recordKey('Đăng')];
    expect(dang.games).toBe(2);
    expect(dang.wins).toBe(2);
    expect(after[recordKey('Lan')].wins).toBe(0);
    // The first win was the first game: it isn't new the second time.
    expect(earned.find((e) => e.player === 0)?.badges ?? []).not.toContain('firstWin');
  });

  it('gives a badge only the first time, and the veteran badge after enough games', () => {
    let records = {};
    let veteranAt = -1;
    for (let i = 1; i <= VETERAN_GAMES; i++) {
      const result = addGame(records, finished(), [0], { now: i });
      records = result.records;
      if (result.earned[0]?.badges.includes('veteran')) veteranAt = i;
      if (i === 1) expect(result.earned[0].badges).toContain('firstWin');
      else expect(result.earned[0]?.badges ?? []).not.toContain('firstWin');
    }
    expect(veteranAt).toBe(VETERAN_GAMES);
  });

  it('keeps no records for bots', () => {
    const { records } = addGame({}, finished(() => {}, true), [0, 1]);
    expect(Object.keys(records)).toEqual([recordKey('Đăng')]);
  });
});
