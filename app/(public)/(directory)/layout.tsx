import { PublicShell } from "@/components/public-shell";

export default function DirectoryLayout({ children }: LayoutProps<"/">) {
  return <PublicShell>{children}</PublicShell>;
}
