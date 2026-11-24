import { PublicShell } from "@/components/public-shell";
import { setPageLocale } from "@/lib/i18n/page";

export default function TamilDirectoryLayout({ children }: LayoutProps<"/ta">) {
  setPageLocale("ta");
  return <PublicShell>{children}</PublicShell>;
}
