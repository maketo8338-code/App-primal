// Notifications of this app: texts editable from the Bloxks Notifications tab.
// Keep the strict JSON between the two markers: the tab and the Bloxks server read it.
// In code: notificationContent('id', { locale, vars }) → { title, body }.

type NotificationText = { title: string; body: string }
type NotificationEntry = { kind: 'reminder' | 'push'; when: string; texts: Record<string, NotificationText> }

export const NOTIFICATIONS: Record<string, NotificationEntry> = /* bloxks:notifications:start */
{}
/* bloxks:notifications:end */

/** Title and body of a notification, in the user's language (falls back to the first one). */
export function notificationContent(
  id: string,
  options: { locale?: string | null; vars?: Record<string, string | number> } = {},
): NotificationText {
  // Own keys only: notificationContent('constructor') is an unknown id, not a crash.
  const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)
  const entry = own(NOTIFICATIONS, id) ? NOTIFICATIONS[id] : undefined
  const languages = entry ? Object.keys(entry.texts) : []
  const lang = (options.locale ?? '').slice(0, 2).toLowerCase()
  const text = !entry ? undefined : own(entry.texts, lang) ? entry.texts[lang] : entry.texts[languages[0]]
  if (!text) return { title: id, body: '' }
  const vars = options.vars
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (m, k: string) => (vars && own(vars, k) ? String(vars[k]) : m))
  return { title: fill(text.title), body: fill(text.body) }
}
