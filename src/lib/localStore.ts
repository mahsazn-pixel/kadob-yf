import { ClosePerson, Occasion, Profile } from './types'

const PEOPLE_KEY = 'kadoba_local_people'
const OCCASIONS_KEY = 'kadoba_local_occasions'
const PROFILE_KEY = 'kadoba_local_profile'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getLocalPeople(ownerUserId: string): ClosePerson[] {
  return readJson<ClosePerson[]>(PEOPLE_KEY, []).filter(p => p.owner_user_id === ownerUserId)
}

export function saveLocalPeople(people: ClosePerson[]) {
  writeJson(PEOPLE_KEY, people)
}

export function getAllLocalPeople(): ClosePerson[] {
  return readJson<ClosePerson[]>(PEOPLE_KEY, [])
}

export function upsertLocalPerson(person: ClosePerson): ClosePerson {
  const all = getAllLocalPeople()
  const index = all.findIndex(p => p.id === person.id)
  if (index >= 0) all[index] = person
  else all.unshift(person)
  saveLocalPeople(all)
  return person
}

export function deleteLocalPerson(id: string) {
  saveLocalPeople(getAllLocalPeople().filter(p => p.id !== id))
  writeJson(OCCASIONS_KEY, getAllLocalOccasions().filter(o => o.person_id !== id))
}

export function getAllLocalOccasions(): Occasion[] {
  return readJson<Occasion[]>(OCCASIONS_KEY, [])
}

export function getLocalOccasions(personId: string): Occasion[] {
  return getAllLocalOccasions()
    .filter(o => o.person_id === personId)
    .sort((a, b) => a.occasion_date.localeCompare(b.occasion_date))
}

export function upsertLocalOccasion(occasion: Occasion): Occasion {
  const all = getAllLocalOccasions()
  const index = all.findIndex(o => o.id === occasion.id)
  if (index >= 0) all[index] = occasion
  else all.push(occasion)
  writeJson(OCCASIONS_KEY, all)
  return occasion
}

export function deleteLocalOccasion(id: string) {
  writeJson(OCCASIONS_KEY, getAllLocalOccasions().filter(o => o.id !== id))
}

export function createLocalPerson(input: Omit<ClosePerson, 'id' | 'created_at' | 'updated_at'>): ClosePerson {
  const now = new Date().toISOString()
  return upsertLocalPerson({
    ...input,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  })
}

export function createLocalOccasion(input: Omit<Occasion, 'id' | 'created_at' | 'updated_at'>): Occasion {
  const now = new Date().toISOString()
  return upsertLocalOccasion({
    ...input,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  })
}

export function getLocalProfile(userId: string): Profile | null {
  const all = readJson<Record<string, Profile>>(PROFILE_KEY, {})
  return all[userId] || null
}

export function saveLocalProfile(profile: Profile): Profile {
  const all = readJson<Record<string, Profile>>(PROFILE_KEY, {})
  const next = {
    ...profile,
    updated_at: new Date().toISOString(),
    created_at: profile.created_at || new Date().toISOString(),
  }
  all[profile.id] = next
  writeJson(PROFILE_KEY, all)
  return next
}

export function getUpcomingLocalOccasions(ownerUserId: string, limit = 3) {
  const people = getLocalPeople(ownerUserId)
  const names = new Map(people.map(p => [p.id, p.name]))
  return getAllLocalOccasions()
    .filter(o => names.has(o.person_id))
    .map(o => ({ ...o, person_name: names.get(o.person_id) }))
}
