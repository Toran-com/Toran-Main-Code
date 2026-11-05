import { type ReactNode, ViewTransition } from "react";

// Something that's on both pages moves from where it was to where it is
// now as you go from one to the other: an event's date and name grow from
// its card in a list into the top of its page, a mandir's name from the
// list into its heading. The browser's View Transitions, through React
// (app/globals.css has the timing; none when the phone asks for less
// motion). Where the browser can't, pages simply change as before.
export function Morph({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}

// The names that pair things up across pages.
export const morphName = {
  eventDate: (id: string) => `event-${id}-date`,
  eventTitle: (id: string) => `event-${id}-title`,
  mandir: (slug: string) => `mandir-${slug}`,
};
