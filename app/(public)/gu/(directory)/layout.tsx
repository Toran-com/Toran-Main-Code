import { PublicShell } from "@/components/public-shell";
import { setPageLocale } from "@/lib/i18n/page";

export default function GujaratiDirectoryLayout({
  children,
}: LayoutProps<"/gu">) {
  setPageLocale("gu");
  return <PublicShell>{children}</PublicShell>;
}
