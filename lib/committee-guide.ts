// The committee guide (/for-mandirs/guide) and its one-page handout
// (/for-mandirs/guide/print) share these steps, so the two always agree.

export const GUIDE_PATH = "/for-mandirs/guide";

// The handout's short version: one line each, in the order a committee
// meets them.
export const HANDOUT_STEPS = [
  {
    title: "Create an account",
    body: "On the Toran website, go to “For mandir committees” and choose “Create an account”. Give your email: we send you a link, so there’s no password.",
  },
  {
    title: "Choose your mandir",
    body: "Search for your mandir by name or town (most UK mandirs already have a page) and say what you do there. We check with the mandir, usually within a few days.",
  },
  {
    title: "Add what’s coming up",
    body: "Tick the festivals your mandir celebrates, bring back last year’s events, or add one in a minute. Or send us your patrika and we’ll type it up for you to check.",
  },
  {
    title: "Keep it right",
    body: "Press “Still on”, “Cancel” or “Edit” next to any event. Families see the change straight away.",
  },
  {
    title: "Share it",
    body: "Send each event to your WhatsApp groups in one tap, and print a notice of what’s on with a QR code for the noticeboard.",
  },
  {
    title: "Bring in a colleague",
    body: "Invite another committee member by email so you’re not the only one. Plan seva with a rota for your volunteers’ group.",
  },
] as const;
