import qrcode from "qrcode-generator";

// A QR code as one SVG path, drawn in the page's own colours, so a printed
// notice can link to the live page. Error correction "M" survives a little
// wear on a noticeboard.
export function qrPath(text: string): { size: number; d: string } {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const size = qr.getModuleCount();
  const squares: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) squares.push(`M${col} ${row}h1v1h-1z`);
    }
  }
  return { size, d: squares.join("") };
}
