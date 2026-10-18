import { useState } from 'react';
import { formatMoney } from './engine/money';

type Lang = 'vi' | 'en';

const TEXT = {
  vi: {
    edition: 'Phiên bản Nghệ Tĩnh',
    tagline: 'Từ quê nhà Hà Tĩnh, qua cầu Bến Thủy, đến thành Vinh.',
    status: 'Đang xây dựng',
    progress: 'Cột mốc 1/10: dựng dự án',
    startMoney: 'Vốn khởi đầu',
    players: 'Người chơi',
    playersValue: '2–4, chung một máy',
    salary: 'Qua Xuất phát',
    footer: 'Một trò chơi của Đăng',
  },
  en: {
    edition: 'Nghệ Tĩnh Edition',
    tagline: 'From hometown Hà Tĩnh, across Bến Thủy bridge, to Vinh city.',
    status: 'Under construction',
    progress: 'Milestone 1/10: project setup',
    startMoney: 'Starting money',
    players: 'Players',
    playersValue: '2–4, one shared device',
    salary: 'Passing Start',
    footer: 'A game by Đăng',
  },
} satisfies Record<Lang, Record<string, string>>;

// The eight property color groups, cheapest first, as on the board.
const GROUPS = ['brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue'];

export default function App() {
  const [lang, setLang] = useState<Lang>('vi');
  const t = TEXT[lang];

  return (
    <main className="page">
      <div className="lang-switch" role="group" aria-label="Language">
        {(['vi', 'en'] as const).map((l) => (
          <button key={l} className={l === lang ? 'active' : ''} onClick={() => setLang(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <section className="hero">
        <div className="color-strip" aria-hidden="true">
          {GROUPS.map((g) => (
            <span key={g} className={`chip group-${g}`} />
          ))}
        </div>
        <h1>Dangopoly</h1>
        <p className="edition">{t.edition}</p>
        <p className="tagline">{t.tagline}</p>
      </section>

      <section className="facts">
        <div className="fact">
          <span className="label">{t.startMoney}</span>
          <span className="value">{formatMoney(15_000_000)}</span>
        </div>
        <div className="fact">
          <span className="label">{t.salary}</span>
          <span className="value">+{formatMoney(2_000_000)}</span>
        </div>
        <div className="fact">
          <span className="label">{t.players}</span>
          <span className="value small">{t.playersValue}</span>
        </div>
      </section>

      <section className="status">
        <span className="badge">{t.status}</span>
        <p>{t.progress}</p>
        <div className="bar">
          <div className="fill" style={{ width: '10%' }} />
        </div>
      </section>

      <footer>{t.footer}</footer>
    </main>
  );
}
