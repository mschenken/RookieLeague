import raw from '../data/league.json'

export type Season = {
  year: number
  team: string
  w: number
  l: number
  t: number
  winPct: number
  seed: number
  seedShared: boolean
  finalRank: number
  teamCount: number
  playoffSpots: number
  madePlayoffs: boolean
  seedVsFinish: number | null
  placementPct: number
}

export type Manager = {
  id: string
  name: string
  /** False while this team still has no manager filled in in data/managers.csv. */
  identified: boolean
  teamNames: string[]
  seasons: Season[]
  firstYear: number | null
  lastYear: number | null
  seasonCount: number
  w: number
  l: number
  t: number
  games: number
  winPct: number
  championships: number
  runnerUps: number
  thirdPlace: number
  podiums: number
  finalsAppearances: number
  titleRate: number | null
  titleYears: number[]
  playoffAppearances: number
  playoffRate: number
  avgFinish: number
  avgFinishPct: number
  bestFinish: number | null
  seedVsFinish: number | null
  seedVsFinishSeasons: number
}

export type PodiumEntry = {
  year: number
  place: number
  team: string
  managerId: string
  managerName: string
}

export type WeekRecord = { year: number; team: string; week: number; points: number; managerId: string; managerName: string }
export type SeasonRecord = { year: number; team: string; points: number; managerId: string; managerName: string }
export type PlayerRecord = {
  year: number
  player: string
  nflTeam: string
  position: string
  week: number
  points: number
  team: string
  managerId: string
  managerName: string
}

export type League = {
  years: number[]
  seasons: { year: number; teamCount: number; playoffSpots: number; divisions: number }[]
  managersComplete: boolean
  unmappedTeams: number
  managers: Manager[]
  podium: PodiumEntry[]
  standings: (Omit<Season, 'teamCount' | 'playoffSpots' | 'placementPct'> & { managerId: string; division: string })[]
  records: { week: WeekRecord[]; season: SeasonRecord[]; player: PlayerRecord[] }
  warnings: { scope: string; msg: string }[]
}

export const league = raw as unknown as League

export const managers = league.managers
export const managerById = new Map(managers.map((m) => [m.id, m]))

export const FIRST_YEAR = Math.min(...league.years)
export const LAST_YEAR = Math.max(...league.years)

/** Career totals only mean something with a few seasons behind them. */
export const DEFAULT_MIN_SEASONS = 3

export const fmtPct = (v: number) => `.${String(Math.round(v * 1000)).padStart(3, '0')}`
export const fmtRecord = (m: { w: number; l: number; t: number }) => (m.t ? `${m.w}-${m.l}-${m.t}` : `${m.w}-${m.l}`)
export const fmtPoints = (v: number) => v.toFixed(2)
export const fmtSigned = (v: number) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2))

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

/** Extra team names a manager used, for the "aka" line. */
export function akaFor(m: Manager): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const n of m.teamNames) {
    const k = n.toLowerCase()
    if (!seen.has(k)) { seen.add(k); out.push(n) }
  }
  return out.slice(1)
}

/** True while some team names have no manager filled in in data/managers.csv. */
export const managersUnnamed = !league.managersComplete
export const unmappedTeams = league.unmappedTeams
