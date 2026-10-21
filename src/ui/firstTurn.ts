/** The highest roller goes first; play then continues around the table in the listed order. */
export function orderFrom<T>(players: readonly T[], first: number): T[] {
  return players.map((_, i) => players[(first + i) % players.length]);
}
