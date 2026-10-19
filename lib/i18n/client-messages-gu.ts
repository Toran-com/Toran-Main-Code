import type { ClientKey } from "@/lib/i18n/client-messages";

// The browser's lines (lib/i18n/client-messages.ts) in the Gujarati
// draft, in a file of their own so English pages never download them.
export const guClient: Record<ClientKey, string> = {
  "whatsOn.nearMe": "મારી નજીક",
  "whatsOn.finding": "તમને શોધી રહ્યા છીએ…",
  "day.today": "આજે",
  "day.tomorrow": "આવતીકાલે",
  "share.label": "શેર કરો: {text}",
  "share.otherApps": "અન્ય એપ્સ",
  "share.copyLink": "લિંક કૉપિ કરો",
  "share.copied": "લિંક કૉપિ થઈ ગઈ",
  "share.copyPrompt": "આ લિંક કૉપિ કરો:",
  "subscribe.apple": "Apple કે Outlook કેલેન્ડર",
  "subscribe.google": "Google કેલેન્ડર",
  "subscribe.note":
    "કોઈ એકાઉન્ટની જરૂર નથી. તમે ગમે ત્યારે તેને તમારા કેલેન્ડરમાંથી કાઢી શકો છો.",
  "countdown.days": "{days} દિવસ બાકી",
  "mandirs.find": "મંદિર કે શહેર શોધો",
  "mandirs.findExample": "દા.ત. Leicester, BAPS, Harrow",
  "mandirs.countOf": "{total}માંથી {shown} મંદિરો",
  "mandirs.count": "{total} મંદિરો",
  "mandirs.showAs": "મંદિરો આ રીતે બતાવો",
  "mandirs.map": "નકશો",
  "mandirs.list": "યાદી",
  "mandirs.noMatch":
    "“{query}” સાથે કોઈ મંદિર મળ્યું નહીં. નજીકનું શહેર લખી જુઓ, અથવા જોડણી તપાસો.",
  "mandirs.regions": "પ્રદેશો",
  "map.seeWhatsOn": "કાર્યક્રમો જુઓ →",
  "map.cluster": "અહીં નજીક {count} મંદિરો",
  "map.clusterTitle": "{label}: મોટું કરીને જુઓ",
  "map.clusterLabel": "{label}. જોવા માટે નકશો મોટો કરો.",
  "map.youAreHere": "તમે અહીં છો",
  "map.denied":
    "તમારા બ્રાઉઝરે તમારું સ્થાન આપ્યું નહીં. તેના બદલે તમે નકશો મોટો કરીને જોઈ શકો છો.",
  "map.failed":
    "અત્યારે તમારું સ્થાન મળ્યું નહીં. તેના બદલે તમે નકશો મોટો કરીને જોઈ શકો છો.",
  "map.label": "મંદિરોનો નકશો. યાદીમાં પણ બધા મંદિરો છે.",
  "map.noneOnMap": "આમાંનું કોઈ મંદિર હજી નકશા પર નથી. બધા યાદીમાં છે.",
  "map.missing.one":
    "{count} મંદિર હજી નકશા પર નથી (સ્થાન નથી). તે યાદીમાં છે.",
  "map.missing.other":
    "{count} મંદિરો હજી નકશા પર નથી (સ્થાન નથી). તે યાદીમાં છે.",
  "slot.full": "હમણાં જ કોઈએ છેલ્લી જગ્યા લઈ લીધી.",
  "slot.closed": "આ જગ્યા હવે Toran પર લઈ શકાતી નથી.",
  "slot.failed": "કંઈક ખોટું થયું. કૃપા કરીને ફરી પ્રયત્ન કરો.",
  "slot.youreOn": "✓ તમે આ સેવામાં છો",
  "slot.isFull": "ભરાઈ ગયું",
  "slot.takeLabel": "આ જગ્યા લો: {role}, {label}",
  "slot.taking": "લઈ રહ્યા છીએ…",
  "slot.take": "આ જગ્યા લો",
  "slot.yours": "તમારી સેવા",
  "slot.onlyYourPhone":
    "આ તમારી છે એ ફક્ત તમારો ફોન જાણે છે: Toran તમારું નામ રાખતું નથી. યાદ રાખવા માટે તેને તમારા કેલેન્ડરમાં ઉમેરો.",
  "slot.youreOnRole": "✓ તમે {role}માં છો, {label}",
  "slot.givingBack": "પાછી આપી રહ્યા છીએ…",
  "slot.cantMakeIt": "હું નહીં આવી શકું",
  "report.thanks": "આભાર. પાના પર મૂકતા પહેલાં અમે મંદિર સાથે ખાતરી કરીશું.",
  "report.another": "બીજા વિશે જણાવો",
  "report.error.title": "કૃપા કરીને કાર્યક્રમનું નામ લખો (2 થી 120 અક્ષર).",
  "report.error.summary": "કૃપા કરીને વર્ણન 280 અક્ષરથી ઓછું રાખો.",
  "report.error.titleGu": "કૃપા કરીને ગુજરાતી નામ 2 થી 120 અક્ષર વચ્ચે રાખો.",
  "report.error.summaryGu": "કૃપા કરીને ગુજરાતી વર્ણન 280 અક્ષરથી ઓછું રાખો.",
  "report.error.kind": "કૃપા કરીને કાર્યક્રમનો પ્રકાર પસંદ કરો.",
  "report.error.date": "કૃપા કરીને આજથી આવતા બે વર્ષની અંદરની તારીખ પસંદ કરો.",
  "report.error.time":
    "કૃપા કરીને સાચો સમય પસંદ કરો, અથવા આખા દિવસ માટે ખાલી રાખો.",
  "report.error.repeat": "કૃપા કરીને તે કેટલી વાર થાય છે તે પસંદ કરો.",
  "report.error.until":
    "કૃપા કરીને પહેલી તારીખ પછીની અને એક વર્ષની અંદરની છેલ્લી તારીખ પસંદ કરો.",
  "report.error.link":
    "કૃપા કરીને http:// કે https://થી શરૂ થતું વેબ સરનામું લખો, અથવા ખાલી રાખો.",
  "report.error.busy":
    "આભાર, પણ અત્યારે ઘણા કાર્યક્રમો તપાસવાના બાકી છે. કૃપા કરીને થોડા દિવસ પછી ફરી પ્રયત્ન કરો.",
  "report.error.failed": "કંઈક ખોટું થયું. કૃપા કરીને ફરી પ્રયત્ન કરો.",
  "slot.google": "Google કેલેન્ડર",
  "slot.apple": "Apple કે Outlook કેલેન્ડર",
};
