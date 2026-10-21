import { describe, expect, it } from 'vitest';
import { embedUrl, parseSpotifyLink } from '../src/ui/spotify';

const ID = '2wmhArYN3t561GkaCivPJ7';

describe('Spotify links', () => {
  it('reads share links, localized links, embed links and spotify: URIs', () => {
    expect(parseSpotifyLink(`https://open.spotify.com/playlist/${ID}?si=abc123`)).toEqual({ kind: 'playlist', id: ID });
    expect(parseSpotifyLink(`  https://open.spotify.com/intl-vi/album/${ID}  `)).toEqual({ kind: 'album', id: ID });
    expect(parseSpotifyLink(`https://open.spotify.com/embed/track/${ID}`)).toEqual({ kind: 'track', id: ID });
    expect(parseSpotifyLink(`spotify:artist:${ID}`)).toEqual({ kind: 'artist', id: ID });
  });

  it('rejects anything else', () => {
    expect(parseSpotifyLink('https://example.com/playlist/' + ID)).toBeNull();
    expect(parseSpotifyLink('https://open.spotify.com/show/' + ID)).toBeNull();
    expect(parseSpotifyLink('https://open.spotify.com/playlist/short')).toBeNull();
    expect(parseSpotifyLink('javascript:alert(1)')).toBeNull();
    expect(parseSpotifyLink('')).toBeNull();
  });

  it('builds the embed address', () => {
    expect(embedUrl({ kind: 'playlist', id: ID })).toBe(`https://open.spotify.com/embed/playlist/${ID}?utm_source=generator&theme=0`);
  });
});
