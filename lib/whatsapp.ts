// Opens WhatsApp (the app on a phone, WhatsApp Web on a computer) with the
// message ready to send to a chat or group.
export function whatsAppLink(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}
