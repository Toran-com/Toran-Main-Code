// Today's date and the time in London, whatever the server's own time
// zone. No translations here, so browser code can use them cheaply.

const LONDON = "Europe/London";

// Today's date in London as YYYY-MM-DD.
export function londonDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// The time in London as HH:MM (24-hour), as a time input wants it.
export function londonTime(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}
