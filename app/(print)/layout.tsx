// Pages made for printing: no site header or footer, A4 width on screen.
export default function PrintLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-[210mm] flex-1 flex-col gap-6 px-4 py-8 sm:px-8 print:max-w-none print:p-0">
      {children}
    </main>
  );
}
