// mirrors the ids in app/utils/avatarOptions.ts. kept as a separate,
// server-side list rather than importing that file directly, since
// server/ and app/ are separate build contexts in Nuxt -- this is just
// the set of keys the profile PUT is allowed to write to avatar_id, the
// actual SVG art lives only on the client.
export const VALID_AVATAR_IDS = [
  'fox',
  'cat',
  'panda',
  'robot',
  'owl',
  'bunny',
  'koala',
  'penguin',
  'alien',
  'bear',
  'dragon',
  'frog'
]

export const DEFAULT_AVATAR_ID = 'fox'
