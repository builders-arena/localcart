import Link from 'next/link';
import fs from 'node:fs';
import path from 'node:path';

interface DocSection {
  slug: string;
  title: string;
  content: string;
}

function loadDocs(): DocSection[] {
  const docsDir = path.join(process.cwd(), 'docs');
  const order = ['getting-started', 'architecture', 'security', 'api-reference', 'contributing'];

  return order
    .map((slug) => {
      const filePath = path.join(docsDir, `${slug}.md`);
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const titleMatch = raw.match(/^#\s+(.+)$/m);
      return {
        slug,
        title: titleMatch?.[1] || slug,
        content: raw,
      };
    })
    .filter((d): d is DocSection => d !== null);
}

export default function DocsPage() {
  const docs = loadDocs();

  return (
    <main className="min-h-screen bg-gray-950">
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-gray-950/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold">
              LC
            </span>
            LocalCart
            <span className="ml-2 text-gray-500">/</span>
            <span className="text-gray-400">Docs</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Home
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 pt-24 pb-20 md:px-6">
        {/* Sidebar TOC for desktop */}
        <div className="flex gap-12">
          <aside className="hidden w-48 shrink-0 md:block">
            <div className="sticky top-20">
              <div className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-4">
                Contents
              </div>
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.slug}>
                    <a
                      href={`#${doc.slug}`}
                      className="block text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {doc.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight mb-4">Documentation</h1>
            <p className="text-gray-400 mb-12">
              Everything you need to install, configure, and extend LocalCart.
            </p>

            {docs.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-gray-500">
                <p className="text-lg">Docs are being written.</p>
                <p className="mt-2 text-sm">
                  Add <code>.md</code> files to the <code>/docs</code> directory.
                </p>
              </div>
            ) : (
              <div className="space-y-16">
                {docs.map((doc) => (
                  <section key={doc.slug} id={doc.slug}>
                    <article className="prose prose-invert prose-sm max-w-none prose-headings:font-semibold prose-code:rounded prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-brand-300 prose-code:before:hidden prose-code:after:hidden prose-pre:bg-gray-900 prose-pre:border prose-pre:border-white/5">
                      {/* Render markdown as raw preformatted for now.
                          Swap with remark/rehype pipeline for production. */}
                      <pre className="whitespace-pre-wrap text-gray-300 !bg-transparent !border-0 !p-0 text-sm leading-relaxed">
                        {doc.content}
                      </pre>
                    </article>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
