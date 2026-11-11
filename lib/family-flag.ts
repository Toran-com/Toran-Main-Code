// Family accounts (decision 0020): built, and switched off until Toran is
// registered with the ICO and the DPIA covers them (decision 0006). Turn
// on by setting NEXT_PUBLIC_FAMILY_ACCOUNTS to "on" in Vercel and
// redeploying. While off, families keep everything on their phone, as
// before, and the site never offers a family login. A file of its own,
// with nothing else in it, so pages that only ask whether it's on don't
// download the rest.
export const FAMILY_ACCOUNTS = process.env.NEXT_PUBLIC_FAMILY_ACCOUNTS === "on";
