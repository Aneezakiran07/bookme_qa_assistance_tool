// A small, fixed set of cute avatars a user can pick for their profile.
// Deliberately a closed set of app-owned SVGs rather than uploads, so
// there is never any user-provided markup rendered on the page --
// avatar_id is just a key into this list (see the migration that adds
// the column), and picking one is a single PUT with that key.
export interface AvatarOption {
  id: string
  label: string
  svg: string
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'fox',
    label: 'Fox',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 14 L24 26 L14 30 Z" fill="#f0862f"/>
      <path d="M54 14 L40 26 L50 30 Z" fill="#f0862f"/>
      <path d="M13 18 L22 25 L16 27 Z" fill="#fff"/>
      <path d="M51 18 L42 25 L48 27 Z" fill="#fff"/>
      <circle cx="32" cy="36" r="20" fill="#f0862f"/>
      <path d="M20 40 Q32 54 44 40 Q38 46 32 46 Q26 46 20 40 Z" fill="#fff"/>
      <circle cx="24" cy="33" r="3.2" fill="#2b2b2b"/>
      <circle cx="40" cy="33" r="3.2" fill="#2b2b2b"/>
      <path d="M29 40 L35 40 L32 44 Z" fill="#2b2b2b"/>
    </svg>`
  },
  {
    id: 'cat',
    label: 'Cat',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 12 L26 24 L12 26 Z" fill="#8a8f98"/>
      <path d="M50 12 L38 24 L52 26 Z" fill="#8a8f98"/>
      <circle cx="32" cy="36" r="20" fill="#aeb4bd"/>
      <circle cx="24" cy="34" r="3" fill="#1f3a2e"/>
      <circle cx="40" cy="34" r="3" fill="#1f3a2e"/>
      <path d="M30 41 Q32 43 34 41" stroke="#1f3a2e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M8 38 L20 36 M8 42 L20 40 M56 38 L44 36 M56 42 L44 40" stroke="#7a7f88" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: 'panda',
    label: 'Panda',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="18" r="8" fill="#2b2b2b"/>
      <circle cx="48" cy="18" r="8" fill="#2b2b2b"/>
      <circle cx="32" cy="36" r="20" fill="#fdfdfd"/>
      <ellipse cx="23" cy="34" rx="6.5" ry="7.5" fill="#2b2b2b"/>
      <ellipse cx="41" cy="34" rx="6.5" ry="7.5" fill="#2b2b2b"/>
      <circle cx="24" cy="35" r="2.4" fill="#fff"/>
      <circle cx="42" cy="35" r="2.4" fill="#fff"/>
      <ellipse cx="32" cy="45" rx="3" ry="2" fill="#2b2b2b"/>
    </svg>`
  },
  {
    id: 'robot',
    label: 'Robot',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="6" width="4" height="8" fill="#8fa3b3"/>
      <circle cx="32" cy="6" r="3.2" fill="#5ad1ff"/>
      <rect x="12" y="16" width="40" height="34" rx="10" fill="#c7d2db"/>
      <rect x="16" y="20" width="32" height="26" rx="7" fill="#eef3f7"/>
      <circle cx="25" cy="33" r="4" fill="#3aa3ff"/>
      <circle cx="39" cy="33" r="4" fill="#3aa3ff"/>
      <rect x="24" y="40" width="16" height="3" rx="1.5" fill="#8fa3b3"/>
    </svg>`
  },
  {
    id: 'owl',
    label: 'Owl',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 20 L22 28 L12 30 Z" fill="#8a5a3a"/>
      <path d="M50 20 L42 28 L52 30 Z" fill="#8a5a3a"/>
      <ellipse cx="32" cy="36" rx="19" ry="20" fill="#a97448"/>
      <circle cx="23" cy="34" r="8" fill="#fff"/>
      <circle cx="41" cy="34" r="8" fill="#fff"/>
      <circle cx="23" cy="34" r="4" fill="#2b2b2b"/>
      <circle cx="41" cy="34" r="4" fill="#2b2b2b"/>
      <path d="M32 40 L28 47 L36 47 Z" fill="#f0a93a"/>
    </svg>`
  },
  {
    id: 'bunny',
    label: 'Bunny',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6 Q14 22 20 32 Q26 30 24 16 Z" fill="#f3cfe0"/>
      <path d="M20 6 Q14 22 20 32 Q26 30 24 16 Z" fill="#fff" opacity="0.55"/>
      <path d="M44 6 Q50 22 44 32 Q38 30 40 16 Z" fill="#f3cfe0"/>
      <path d="M44 6 Q50 22 44 32 Q38 30 40 16 Z" fill="#fff" opacity="0.55"/>
      <circle cx="32" cy="38" r="18" fill="#fff" stroke="#e7e7ea" stroke-width="1.5"/>
      <circle cx="25" cy="37" r="3" fill="#2b2b2b"/>
      <circle cx="39" cy="37" r="3" fill="#2b2b2b"/>
      <ellipse cx="32" cy="43" rx="2.6" ry="2" fill="#f0a3c1"/>
    </svg>`
  },
  {
    id: 'koala',
    label: 'Koala',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="13" cy="26" r="10" fill="#9aa3ab"/>
      <circle cx="51" cy="26" r="10" fill="#9aa3ab"/>
      <circle cx="32" cy="36" r="19" fill="#b7bfc7"/>
      <circle cx="24" cy="35" r="3" fill="#2b2b2b"/>
      <circle cx="40" cy="35" r="3" fill="#2b2b2b"/>
      <ellipse cx="32" cy="42" rx="5" ry="4" fill="#2b2b2b"/>
    </svg>`
  },
  {
    id: 'penguin',
    label: 'Penguin',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="34" rx="19" ry="22" fill="#2b3038"/>
      <ellipse cx="32" cy="38" rx="12" ry="16" fill="#f4f6f8"/>
      <circle cx="26" cy="28" r="2.6" fill="#2b2b2b"/>
      <circle cx="38" cy="28" r="2.6" fill="#2b2b2b"/>
      <path d="M29 32 L35 32 L32 37 Z" fill="#f0a93a"/>
    </svg>`
  },
  {
    id: 'alien',
    label: 'Alien',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 12 L20 2 M42 12 L44 2" stroke="#5fd68a" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="20" cy="2" r="2.4" fill="#5fd68a"/>
      <circle cx="44" cy="2" r="2.4" fill="#5fd68a"/>
      <ellipse cx="32" cy="36" rx="18" ry="21" fill="#7ee2a3"/>
      <ellipse cx="24" cy="33" rx="5" ry="7" fill="#1f2a24"/>
      <ellipse cx="40" cy="33" rx="5" ry="7" fill="#1f2a24"/>
      <ellipse cx="25.5" cy="31" rx="1.4" ry="2" fill="#fff"/>
      <ellipse cx="41.5" cy="31" rx="1.4" ry="2" fill="#fff"/>
    </svg>`
  },
  {
    id: 'bear',
    label: 'Bear',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="15" cy="20" r="8" fill="#8a5a3a"/>
      <circle cx="49" cy="20" r="8" fill="#8a5a3a"/>
      <circle cx="32" cy="36" r="20" fill="#a97448"/>
      <circle cx="24" cy="35" r="3" fill="#2b2b2b"/>
      <circle cx="40" cy="35" r="3" fill="#2b2b2b"/>
      <ellipse cx="32" cy="40" rx="7" ry="5.5" fill="#c9946a"/>
      <ellipse cx="32" cy="39" rx="2.6" ry="2" fill="#2b2b2b"/>
    </svg>`
  },
  {
    id: 'dragon',
    label: 'Dragon',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 14 L24 24 L16 24 Z" fill="#3fae6c"/>
      <path d="M44 14 L40 24 L48 24 Z" fill="#3fae6c"/>
      <circle cx="32" cy="36" r="20" fill="#4fc47f"/>
      <path d="M12 34 L20 32 L20 40 Z" fill="#3fae6c"/>
      <path d="M52 34 L44 32 L44 40 Z" fill="#3fae6c"/>
      <circle cx="24" cy="34" r="3" fill="#1f2a24"/>
      <circle cx="40" cy="34" r="3" fill="#1f2a24"/>
      <circle cx="28" cy="43" r="1.6" fill="#1f2a24"/>
      <circle cx="36" cy="43" r="1.6" fill="#1f2a24"/>
    </svg>`
  },
  {
    id: 'frog',
    label: 'Frog',
    svg: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="22" r="8" fill="#6fce6a"/>
      <circle cx="44" cy="22" r="8" fill="#6fce6a"/>
      <circle cx="20" cy="22" r="3.4" fill="#2b2b2b"/>
      <circle cx="44" cy="22" r="3.4" fill="#2b2b2b"/>
      <ellipse cx="32" cy="40" rx="21" ry="16" fill="#7fdc78"/>
      <path d="M20 42 Q32 50 44 42" stroke="#2b2b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </svg>`
  }
]

export const DEFAULT_AVATAR_ID = 'fox'

export function getAvatarById(id: string | null | undefined): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.id === id) ?? AVATAR_OPTIONS.find((a) => a.id === DEFAULT_AVATAR_ID)!
}
