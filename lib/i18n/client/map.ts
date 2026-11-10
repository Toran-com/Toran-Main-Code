// What all three maps share (components/uk-map.ts and its controls):
// buttons, hints, directions and the key. English; the Gujarati is in
// lib/i18n/client-messages-gu.ts, the Hindi in client-messages-hi.ts.
export const enMap = {
  "mapUi.expand": "Full screen map",
  "mapUi.close": "Close full screen map",
  "mapUi.wholeUk": "Show the whole UK",
  "mapUi.scrollHint": "To zoom the map, hold Ctrl and scroll",
  "mapUi.scrollHintMac": "To zoom the map, hold ⌘ and scroll",
  "mapUi.touchHint": "Use two fingers to move the map, or open it full screen",
  "mapUi.directions": "Directions",
  "mapUi.directionsLabel": "Directions to {name} (opens Google Maps)",
  "mapUi.zoomHere": "Zoom in here",
  "mapUi.key.events": "Events at a mandir: tap to see them",
  "mapUi.key.places": "Places free at a mandir: tap to see them",
  "mapUi.nearest": "Nearest to you",
  "mapUi.under": "Less than a mile away",
  "mapUi.miles.one": "1 mile away",
  "mapUi.miles.other": "{miles} miles away",
} as const;
