import Link from 'next/link';

export default function DemoPage() {
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
            <span className="text-gray-400">Demo</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            Home
          </Link>
        </div>
      </nav>

      <div className="pt-14 h-screen flex flex-col">
        <div className="border-b border-white/5 bg-gray-900/50 px-4 py-3 text-center text-xs text-gray-400">
          This is a static preview of the control panel UI.
          To see it connected to a live bridge, run{' '}
          <code className="rounded bg-white/5 px-1.5 py-0.5 text-brand-300">npm run bridge</code>{' '}
          locally.
        </div>
        <iframe
          src="/demo/index.html"
          className="flex-1 w-full border-0"
          title="LocalCart Control Panel Demo"
        />
      </div>
    </main>
  );
}
