import { ClosePerson, Occasion, MyOccasion, Notification, daysUntilOccasion } from './types'
import {
  addLocalNotification,
  getDisplayOccasionsForPerson,
  getLocalNotifications,
  getLocalOccasions,
  getLocalPeople,
  getLocalShoppingItems,
  getUpcomingLocalOccasions,
  mergeLocalNotifications,
} from './localStore'
import { supabase } from './supabase'

export const OCCASION_REMINDER_TWO_WEEKS = 'occasion_two_weeks'
export const OCCASION_REMINDER_SIX_DAYS = 'occasion_six_days'

type OccasionWithName = Occasion & { person_name?: string }

function reminderYear(occ: Occasion): string {
  const days = daysUntilOccasion(occ)
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return String(date.getFullYear())
}

function alreadySent(
  existing: Notification[],
  type: string,
  occasionId: string,
  year: string,
): boolean {
  return existing.some(n => (
    n.type === type
    && String(n.payload_json.occasion_id || '') === occasionId
    && String(n.payload_json.year || '') === year
  ))
}

function hasPurchasedGift(
  items: Array<{ receiver_id?: string | null; status: string }>,
  personId: string,
): boolean {
  return items.some(item => (
    item.receiver_id === personId
    && (item.status === 'purchased' || item.status === 'gifted')
  ))
}

async function persistRemote(userId: string, items: Notification[]) {
  if (userId.startsWith('local-') || items.length === 0) return
  try {
    await supabase.from('notifications').insert(items.map(item => ({
      user_id: item.user_id,
      type: item.type,
      payload_json: item.payload_json,
      scheduled_at: item.scheduled_at,
      sent_at: item.sent_at,
      status: item.status,
    })))
  } catch {
    // local copy is enough
  }
}

export function syncOccasionReminders(input: {
  userId: string
  people: ClosePerson[]
  occasions: OccasionWithName[]
  shoppingItems?: Array<{ receiver_id?: string | null; status: string }>
}): Notification[] {
  const shoppingItems = input.shoppingItems || getLocalShoppingItems(input.userId)
  const existing = getLocalNotifications(input.userId)
  const peopleById = new Map(input.people.map(person => [person.id, person]))
  const created: Notification[] = []

  for (const occ of input.occasions) {
    const person = peopleById.get(occ.person_id)
    if (!person || person.name === 'خودم') continue
    const personName = occ.person_name || person.name
    const days = daysUntilOccasion(occ)
    const year = reminderYear(occ)
    const purchased = hasPurchasedGift(shoppingItems, person.id)

    if (
      days <= 14
      && days >= 7
      && !alreadySent(existing, OCCASION_REMINDER_TWO_WEEKS, occ.id, year)
    ) {
      const item = addLocalNotification({
        user_id: input.userId,
        type: OCCASION_REMINDER_TWO_WEEKS,
        payload_json: {
          message: `فقط دو هفته به ${occ.title} ${personName} مونده. از کادوبا براش یه کادوی توپ پیدا کن`,
          occasion_id: occ.id,
          occasion_title: occ.title,
          person_id: person.id,
          person_name: personName,
          year,
        },
      })
      created.push(item)
      existing.unshift(item)
    }

    if (
      days <= 6
      && days >= 0
      && !purchased
      && !alreadySent(existing, OCCASION_REMINDER_SIX_DAYS, occ.id, year)
    ) {
      const item = addLocalNotification({
        user_id: input.userId,
        type: OCCASION_REMINDER_SIX_DAYS,
        payload_json: {
          message: `برای ${occ.title} ${personName} کادو گرفتی؟ دیگه چیزی نمونده`,
          occasion_id: occ.id,
          occasion_title: occ.title,
          person_id: person.id,
          person_name: personName,
          year,
        },
      })
      created.push(item)
      existing.unshift(item)
    }
  }

  void persistRemote(input.userId, created)
  return created
}

const reminderSyncs = new Map<string, Promise<Notification[]>>()

export async function ensureOccasionReminders(userId: string): Promise<Notification[]> {
  const pending = reminderSyncs.get(userId)
  if (pending) return pending
  const run = runOccasionReminders(userId).finally(() => {
    reminderSyncs.delete(userId)
  })
  reminderSyncs.set(userId, run)
  return run
}

async function runOccasionReminders(userId: string): Promise<Notification[]> {
  const localPeople = getLocalPeople(userId)
  const localOccasions = getUpcomingLocalOccasions(userId)
  const localShop = getLocalShoppingItems(userId)

  if (userId.startsWith('local-')) {
    return syncOccasionReminders({
      userId,
      people: localPeople,
      occasions: localOccasions,
      shoppingItems: localShop,
    })
  }

  try {
    const { data: peopleData } = await supabase
      .from('close_people')
      .select('*')
      .order('created_at', { ascending: false })
    const peopleList = (peopleData || localPeople) as ClosePerson[]
    if (peopleList.length === 0) return []

    const personIds = peopleList.map(p => p.id)
    const { data: occasionsData } = await supabase
      .from('occasions')
      .select('*')
      .in('person_id', personIds)
      .order('occasion_date', { ascending: true })
    const ownByPerson = new Map<string, Occasion[]>()
    for (const o of (occasionsData || []) as Occasion[]) {
      const arr = ownByPerson.get(o.person_id) || []
      arr.push(o)
      ownByPerson.set(o.person_id, arr)
    }

    const linkedIds = peopleList.map(p => p.linked_user_id).filter(Boolean) as string[]
    let sharedAll: MyOccasion[] = []
    if (linkedIds.length > 0) {
      const { data: sharedData } = await supabase
        .from('my_occasions')
        .select('*')
        .in('owner_user_id', linkedIds)
      sharedAll = (sharedData || []) as MyOccasion[]
    }

    const occasionsWithNames = peopleList.flatMap(person => (
      getDisplayOccasionsForPerson(person, {
        own: ownByPerson.get(person.id) || getLocalOccasions(person.id),
        shared: person.linked_user_id ? sharedAll.filter(s => s.owner_user_id === person.linked_user_id) : [],
      }).map(o => ({ ...o, person_name: person.name }))
    ))

    const { data: shoppingData } = await supabase
      .from('shopping_list_items')
      .select('receiver_id, status')
      .eq('user_id', userId)
    const shopList = shoppingData || localShop

    const { data: remoteNotes } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (remoteNotes?.length) mergeLocalNotifications(remoteNotes as Notification[])

    return syncOccasionReminders({
      userId,
      people: peopleList,
      occasions: occasionsWithNames,
      shoppingItems: shopList,
    })
  } catch {
    return syncOccasionReminders({
      userId,
      people: localPeople,
      occasions: localOccasions,
      shoppingItems: localShop,
    })
  }
}
