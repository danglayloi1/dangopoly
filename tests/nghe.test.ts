import { describe, expect, it } from 'vitest';
import { dataLang } from '../src/data/text';
import { createGame } from '../src/engine/game';
import { STRINGS } from '../src/i18n/strings';
import { describeLog } from '../src/ui/logText';

describe('Tiếng Nghệ', () => {
  const game = createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
    ],
    seed: 1,
  });

  it('talks in dialect but keeps the real place names', () => {
    expect(describeLog({ type: 'rolled', player: 0, dice: [2, 3] }, game, 'nghe')).toBe('Đăng đổ được 2 + 3');
    expect(describeLog({ type: 'declined', player: 1, space: 1 }, game, 'nghe')).toBe('Lan nỏ mua Vườn bưởi Phúc Trạch');
    expect(describeLog({ type: 'declined', player: 1, space: 1 }, game, 'en')).toBe("Lan didn't buy Phúc Trạch Pomelo Gardens");
  });

  it('falls back to standard Vietnamese for what it does not change', () => {
    expect(STRINGS.nghe.price).toBe(STRINGS.vi.price);
    expect(STRINGS.nghe.yourTurn).not.toBe(STRINGS.vi.yourTurn);
    expect(STRINGS.nghe.onlineErrors.codeTaken).toBe(STRINGS.vi.onlineErrors.codeTaken);
  });

  it('uses the Vietnamese names of places, cards and tokens', () => {
    expect(dataLang('nghe')).toBe('vi');
    expect(dataLang('en')).toBe('en');
  });
});
