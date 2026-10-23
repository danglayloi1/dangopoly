import { useState } from 'react';
import { formatMoney } from '../engine/money';
import { useLang } from '../i18n/LangContext';
import { ScreenTop } from './Header';
import { Icon } from './icons';
import { BADGES, clearRecords, loadRecords, type Records } from './records';

/** Everyone who has finished a game on this device: games, wins, best fortune, and their badges. */
export function RecordsScreen({ onBack }: { onBack: () => void }) {
  const { t, uiLang } = useLang();
  const [records, setRecords] = useState<Records>(loadRecords);
  const people = Object.entries(records).sort(([, a], [, b]) => b.wins - a.wins || b.games - a.games || b.lastPlayed - a.lastPlayed);
  const [chosen, setChosen] = useState<string | null>(people[0]?.[0] ?? null);
  const person = chosen ? records[chosen] : undefined;
  const date = (ms: number) => new Date(ms).toLocaleDateString(uiLang === 'en' ? 'en-GB' : 'vi-VN');

  const clear = () => {
    if (!window.confirm(t.clearRecordsConfirm)) return;
    clearRecords();
    setRecords({});
    setChosen(null);
  };

  return (
    <main className="setup records">
      <ScreenTop title={t.records} onBack={onBack} />

      {people.length === 0 ? (
        <section className="setup-card">
          <p className="muted center">{t.recordsEmpty}</p>
          <ul className="badge-grid">
            {BADGES.map(({ id, icon }) => (
              <li key={id} className="badge-tile locked">
                <Icon name={icon} size={34} />
                <strong>{t.badges[id].name}</strong>
                <span>{t.badges[id].how}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="setup-card">
            <table className="records-table">
              <thead>
                <tr>
                  <th scope="col">{t.recordsTable.name}</th>
                  <th scope="col">{t.recordsTable.games}</th>
                  <th scope="col">{t.recordsTable.wins}</th>
                  <th scope="col">{t.recordsTable.best}</th>
                </tr>
              </thead>
              <tbody>
                {people.map(([key, r]) => (
                  <tr key={key} className={key === chosen ? 'chosen' : undefined}>
                    <th scope="row">
                      <button className="link" aria-pressed={key === chosen} onClick={() => setChosen(key)}>
                        {r.name}
                      </button>
                    </th>
                    <td>{r.games}</td>
                    <td>{r.wins}</td>
                    <td>{formatMoney(r.bestWorth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {person && (
            <section className="setup-card">
              <h2>{t.badgesOf(person.name, Object.keys(person.badges).length, BADGES.length)}</h2>
              <ul className="badge-grid">
                {BADGES.map(({ id, icon }) => {
                  const when = person.badges[id];
                  return (
                    <li key={id} className={`badge-tile${when === undefined ? ' locked' : ''}`}>
                      <Icon name={icon} size={34} />
                      <strong>{t.badges[id].name}</strong>
                      <span>{when === undefined ? t.badges[id].how : `${t.badges[id].how} · ${date(when)}`}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <button className="secondary center-button" onClick={clear}>
            {t.clearRecords}
          </button>
        </>
      )}
    </main>
  );
}
