/**
 * Deterministic in-memory stand-in for `@react-pdf/renderer`.
 *
 * The real package is ESM-only and pulls in `yoga-layout` (WASM, `import.meta.url`),
 * which jest's CommonJS runtime cannot load. Every e2e suite boots the real
 * `AppModule` (which imports `pdf-exporter`), so this fake is wired via
 * `moduleNameMapper` in both jest configs. It implements just enough of the
 * surface our exporter uses: element component types, `StyleSheet.create`, and a
 * `renderToBuffer` that walks the exporter's React element tree, collects the
 * text nodes, and renders a real, minimal, parseable PDF containing that text.
 * Real PDF rendering is still verified by the runtime smoke test (node runs the
 * actual `@react-pdf/renderer`).
 */
export function Document(props: { children?: unknown }): unknown {
  return props.children;
}

export function Page(props: { children?: unknown }): unknown {
  return props.children;
}

export function View(props: { children?: unknown }): unknown {
  return props.children;
}

export function Text(props: { children?: unknown }): unknown {
  return props.children;
}

export const StyleSheet = {
  create<T>(styles: T): T {
    return styles;
  },
};

function collectText(node: unknown, out: string[]): void {
  if (typeof node === 'string') {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      collectText(child, out);
    }
    return;
  }
  if (node && typeof node === 'object') {
    const element = node as { props?: { children?: unknown } };
    if (element.props) {
      collectText(element.props.children, out);
    }
  }
}

function minimalPdf(lines: string[]): Uint8Array {
  const escaped = lines.map((line) => line.replace(/[\\()]/g, (c) => `\\${c}`));
  const stream =
    'BT /F1 12 Tf 72 720 Td\n' + escaped.map((l) => `(${l}) Tj T*`).join('\n') + '\nET';

  const objects = [
    null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i <= 5; i++) {
    offsets[i] = Buffer.byteLength(out);
    out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(out);
  out += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

export async function renderToBuffer(element: unknown): Promise<Uint8Array> {
  const lines: string[] = [];
  collectText(element, lines);
  if (lines.length === 0) {
    throw new Error('No text content rendered');
  }
  return minimalPdf(lines);
}
