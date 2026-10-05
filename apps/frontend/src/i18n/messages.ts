import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enDecks from './locales/en/decks.json'
import enPlaygroups from './locales/en/playgroups.json'
import enGame from './locales/en/game.json'
import enProfile from './locales/en/profile.json'
import enHome from './locales/en/home.json'
import enTime from './locales/en/time.json'
import enLegal from './locales/en/legal.json'

import deCommon from './locales/de/common.json'
import deAuth from './locales/de/auth.json'
import deDecks from './locales/de/decks.json'
import dePlaygroups from './locales/de/playgroups.json'
import deGame from './locales/de/game.json'
import deProfile from './locales/de/profile.json'
import deHome from './locales/de/home.json'
import deTime from './locales/de/time.json'
import deLegal from './locales/de/legal.json'

// `en` defines the message schema used for type-checking translation keys.
const en = {
  common: enCommon,
  auth: enAuth,
  decks: enDecks,
  playgroups: enPlaygroups,
  game: enGame,
  profile: enProfile,
  home: enHome,
  time: enTime,
  legal: enLegal,
}

export type MessageSchema = typeof en

const de = {
  common: deCommon,
  auth: deAuth,
  decks: deDecks,
  playgroups: dePlaygroups,
  game: deGame,
  profile: deProfile,
  home: deHome,
  time: deTime,
  legal: deLegal,
}

export const messages = { en, de }
