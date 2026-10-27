import { PublicShell } from "@/components/public-shell";
import { setPageLocale } from "@/lib/i18n/page";

export default function HindiDirectoryLayout({ children }: LayoutProps<"/hi">) {
  setPageLocale("hi");
  return <PublicShell>{children}</PublicShell>;
}
