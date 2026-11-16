// Family accounts (decision 0020): on wherever NEXT_PUBLIC_FAMILY_ACCOUNTS
// is "on" (Vercel, then redeploy), which needs the ICO registration and a
// signed DPIA that covers them (decision 0006). Without it, families keep
// everything on their phone, as before, and the site never offers a
// family login: unsetting it is the way to switch them off again. A file of its own,
// with nothing else in it, so pages that only ask whether it's on don't
// download the rest.
export const FAMILY_ACCOUNTS = process.env.NEXT_PUBLIC_FAMILY_ACCOUNTS === "on";
