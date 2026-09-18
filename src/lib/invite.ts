const INVITE_MESSAGE = 'بگو چی دوست داری کادو بگیری؟'

export function getInviteLink(): string {
  return `${window.location.origin}/invite`
}

export function getInviteText(link = getInviteLink()): string {
  return `${INVITE_MESSAGE}\n${link}`
}

export async function sendGiftInvite(phone: string): Promise<void> {
  const link = getInviteLink()
  const text = getInviteText(link)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'کادوبا', text, url: link })
      return
    } catch {
      return
    }
  }
  const smsUrl = `sms:${phone}?body=${encodeURIComponent(text)}`
  window.location.href = smsUrl
}
