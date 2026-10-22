export type Lang = 'vi' | 'en';

/** What the game talks in: also Tiếng Nghệ, which uses the Vietnamese names of places, cards and tokens. */
export type UiLang = Lang | 'nghe';

export const dataLang = (ui: UiLang): Lang => (ui === 'en' ? 'en' : 'vi');

/** A piece of text shown in both languages. */
export type LocalText = Record<Lang, string>;
