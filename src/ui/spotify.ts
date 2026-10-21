// Background music through Spotify's embedded player. Nothing is loaded from Spotify until a
// player opens the music panel.

export type SpotifyKind = 'playlist' | 'album' | 'track' | 'artist';

export interface SpotifySource {
  kind: SpotifyKind;
  id: string;
}

/** A public playlist of Nghệ Tĩnh folk songs (dân ca ví giặm), used until a player picks their own. */
export const DEFAULT_MUSIC: SpotifySource = { kind: 'playlist', id: '2wmhArYN3t561GkaCivPJ7' };

const KINDS = 'playlist|album|track|artist';

/** Reads a Spotify share link (or a spotify: URI); null if it isn't one we can play. */
export function parseSpotifyLink(text: string): SpotifySource | null {
  const s = text.trim();
  const web = new RegExp(`^https?://open\.spotify\.com/(?:intl-[a-z-]+/)?(?:embed/)?(${KINDS})/([A-Za-z0-9]{22})(?:[/?#].*)?$`);
  const uri = new RegExp(`^spotify:(${KINDS}):([A-Za-z0-9]{22})$`);
  const m = s.match(web) ?? s.match(uri);
  return m ? { kind: m[1] as SpotifyKind, id: m[2] } : null;
}

export const embedUrl = ({ kind, id }: SpotifySource): string =>
  `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`;

const KEY = 'dangopoly.music';

export function loadMusic(): SpotifySource {
  try {
    const saved = localStorage.getItem(KEY);
    return (saved && parseSpotifyLink(saved)) || DEFAULT_MUSIC;
  } catch {
    return DEFAULT_MUSIC;
  }
}

export function saveMusic(source: SpotifySource | null): void {
  try {
    if (source) localStorage.setItem(KEY, `spotify:${source.kind}:${source.id}`);
    else localStorage.removeItem(KEY);
  } catch {
    // storage blocked: the choice just isn't remembered
  }
}
