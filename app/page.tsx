import Link from 'next/link';
import { CopyButton } from '@/components/copy-button';

// ─── Nav ─────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-gray-950/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold">
            LC
          </span>
          LocalCart
        </Link>
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <Link href="/docs" className="hidden hover:text-white transition-colors sm:block">
            Docs
          </Link>
          <a
            href="https://github.com/builders-arena/localcart"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/builders-arena/localcart"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
          >
            <GitHubIcon />
            Star on GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative grid-bg overflow-hidden pt-32 pb-20 md:pt-44 md:pb-32">
      {/* Radial glow behind heading */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[700px] rounded-full bg-brand-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center md:px-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-gray-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          100% local &middot; Zero cloud dependency &middot; MIT License
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Give your AI a{' '}
          <span className="glow-text">Shopping Cart</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400 md:text-xl">
          LocalCart lets your local LLM browse, compare, and buy on Amazon through a real browser
          session &mdash; without your data ever leaving your machine. Human-in-the-loop approval
          for every checkout.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <div className="code-block w-full max-w-md sm:w-auto">
            <pre className="!py-3 !px-5">
              <code className="text-brand-300">npx create-localcart@latest</code>
            </pre>
          </div>
          <span className="text-xs text-gray-500">or</span>
          <a
            href="https://github.com/builders-arena/localcart"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            <GitHubIcon />
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ────────────────────────────────────────────────────

const steps = [
  {
    number: '01',
    label: 'Your LLM',
    title: 'AI Decides',
    description:
      'A local LLM (Ollama, llama.cpp, or any OpenAI-compatible API) reasons about what to buy. It sees only sanitized product data — never your PII.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    number: '02',
    label: 'LocalCart Bridge',
    title: 'Bridge Translates',
    description:
      'The bridge receives structured JSON commands, enforces rate limits, checks the HITL gate, and drives the browser with human-like timing.',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
  },
  {
    number: '03',
    label: 'Your Browser',
    title: 'Browser Acts',
    description:
      'A real Chromium instance with your logged-in session performs the action. Mouse movements, typing, and scrolling all mimic human behavior.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-4 text-gray-400">
            Three components, one machine, zero cloud.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`step-connector relative rounded-2xl border ${step.border} ${step.bg} p-8`}
              style={i === steps.length - 1 ? { '--hide-connector': '1' } as React.CSSProperties : undefined}
            >
              <div className={`text-xs font-mono font-bold ${step.color} mb-1`}>
                {step.number}
              </div>
              <div className="mb-1 text-[11px] uppercase tracking-widest text-gray-500">
                {step.label}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{step.description}</p>

              {i < steps.length - 1 && (
                <div className="absolute -right-5 top-1/2 hidden -translate-y-1/2 text-gray-600 md:block">
                  <ArrowRightIcon />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Security Badges ─────────────────────────────────────────────────

const securityFeatures = [
  {
    icon: <ShieldIcon />,
    title: 'PII Redaction',
    description:
      'Credit cards, addresses, and emails are pattern-matched and replaced before any page data reaches the LLM.',
  },
  {
    icon: <LockIcon />,
    title: 'Human-in-the-Loop Gate',
    description:
      'Checkout and order placement require explicit human approval in the control panel. The LLM cannot bypass this.',
  },
  {
    icon: <EyeIcon />,
    title: 'Domain Allowlist',
    description:
      'The browser is locked to domains you configure. Navigation outside the allowlist is blocked at the bridge level.',
  },
  {
    icon: <ClockIcon />,
    title: 'Rate Limiting',
    description:
      'Hard-capped sliding window limits per action type prevent aggressive patterns that would trigger bot detection.',
  },
];

function Security() {
  return (
    <section className="border-y border-white/5 bg-gray-950/50 py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400">
            <ShieldIcon />
            Zero-Trust Local Model
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Security by architecture
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-gray-400">
            Not bolted on &mdash; baked in. Every defense is enforced at the bridge level,
            where the LLM cannot circumvent it.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {securityFeatures.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-colors"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/15 text-brand-400">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Quick Start ─────────────────────────────────────────────────────

function QuickStart() {
  const cloneCommands = `git clone https://github.com/builders-arena/localcart
cd localcart
npm install
npm run bridge`;

  return (
    <section id="quickstart" className="py-20 md:py-32">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Get started in 60 seconds</h2>
          <p className="mt-4 text-gray-400">One command to install. One command to run.</p>
        </div>

        <div className="mt-12 space-y-6">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">
              Option A &mdash; Scaffolded project
            </div>
            <div className="code-block">
              <pre>
                <code>
                  <span className="text-gray-500">$</span>{' '}
                  <span className="text-brand-300">npx create-localcart@latest</span>
                </code>
              </pre>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">
              Option B &mdash; Clone &amp; run
            </div>
            <div className="code-block">
              <pre>
                <code className="text-gray-300">
                  {cloneCommands.split('\n').map((line, i) => (
                    <span key={i} className="block">
                      <span className="text-gray-500">$</span> {line}
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="text-sm font-semibold text-gray-300">Then what?</h3>
            <ol className="mt-3 space-y-2 text-sm text-gray-400">
              <li>
                <span className="mr-2 font-mono text-brand-400">1.</span>
                LocalCart launches a Chromium window. Log in to Amazon if you haven&apos;t already.
              </li>
              <li>
                <span className="mr-2 font-mono text-brand-400">2.</span>
                Open <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">http://localhost:7701</code>{' '}
                for the control panel.
              </li>
              <li>
                <span className="mr-2 font-mono text-brand-400">3.</span>
                Point your local LLM at{' '}
                <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">http://localhost:7700/rpc</code>{' '}
                and send JSON-RPC commands.
              </li>
              <li>
                <span className="mr-2 font-mono text-brand-400">4.</span>
                Approve or reject checkout actions from the control panel.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Architecture Preview ────────────────────────────────────────────

function ArchitecturePreview() {
  return (
    <section className="border-t border-white/5 bg-gray-950/50 py-20 md:py-32">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            See what the bot sees
          </h2>
          <p className="mt-4 text-gray-400">
            The control panel shows the LLM&apos;s sanitized view in real time.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 glow-ring">
          <div className="flex items-center gap-2 border-b border-white/5 bg-gray-900/80 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500/60" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <span className="h-3 w-3 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs text-gray-500">LocalCart Control Panel</span>
          </div>
          <div className="bg-[#0f1117] p-6 font-mono text-xs leading-relaxed text-gray-400">
            <div className="text-emerald-400">LOCALCART READY</div>
            <div className="mt-2">
              <span className="text-gray-600">21:04:12</span>{' '}
              <span className="text-brand-400">search</span>{' '}
              <span className="text-emerald-400">success</span>
              <span className="text-gray-600"> — &quot;USB-C cable 6ft&quot; → 15 results</span>
            </div>
            <div>
              <span className="text-gray-600">21:04:18</span>{' '}
              <span className="text-brand-400">view_product</span>{' '}
              <span className="text-emerald-400">success</span>
              <span className="text-gray-600"> — B0CX23V2ZK &quot;Anker USB-C&quot; $12.99</span>
            </div>
            <div>
              <span className="text-gray-600">21:04:25</span>{' '}
              <span className="text-brand-400">add_to_cart</span>{' '}
              <span className="text-emerald-400">success</span>
              <span className="text-gray-600"> — cart: 1 item, $12.99</span>
            </div>
            <div className="mt-2 rounded border border-yellow-500/30 bg-yellow-500/5 p-3">
              <span className="text-yellow-400">APPROVAL REQUIRED</span>
              <span className="text-gray-500"> — proceed_to_checkout</span>
              <div className="mt-2 flex gap-3">
                <span className="rounded bg-emerald-600 px-3 py-1 text-emerald-100">APPROVE</span>
                <span className="rounded border border-red-500/30 px-3 py-1 text-red-400">REJECT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center text-sm text-gray-500 md:flex-row md:justify-between md:px-6">
        <div>
          LocalCart is open-source software under the{' '}
          <a href="https://opensource.org/licenses/MIT" className="text-gray-400 hover:text-white">
            MIT License
          </a>
          .
        </div>
        <div className="flex gap-6">
          <a href="https://github.com/builders-arena/localcart" className="hover:text-white">
            GitHub
          </a>
          <Link href="/docs" className="hover:text-white">
            Docs
          </Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Icons (inline SVG, no dependency) ───────────────────────────────

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10h10m0 0-3-3m3 3-3 3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1.5 3 4.5v4c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5v-4L9 1.5Z" />
      <path d="m6.5 9 2 2 3.5-3.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="10" height="7" rx="1.5" />
      <path d="M6 8V5.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 9s3-5.5 7.5-5.5S16.5 9 16.5 9s-3 5.5-7.5 5.5S1.5 9 1.5 9Z" />
      <circle cx="9" cy="9" r="2.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7" />
      <path d="M9 5v4l2.5 2.5" />
    </svg>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <HowItWorks />
      <Security />
      <ArchitecturePreview />
      <QuickStart />
      <Footer />
    </main>
  );
}
