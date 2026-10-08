import Link from "next/link";
import { Mark } from "@/components/mark";

const steps = [
  {
    title: "Connect an agent",
    body: "Give Claude or Cursor the MCP key for your account. The agent can then talk to your wishlist.",
  },
  {
    title: "File the missing piece",
    body: "When a task stops because a tool, permission, or dataset is missing, the agent calls file_wish instead of failing quietly.",
  },
  {
    title: "See what to build",
    body: "Similar wishes cluster into one capability, ranked by how often agents ask and how badly they need it.",
  },
];

const points = [
  {
    title: "Private to your account",
    body: "Each person gets their own list and their own MCP key. Other people's wishes stay on their dashboard.",
  },
  {
    title: "Grouped, not duplicated",
    body: "OpenAI reads the wishes and folds paraphrases into a single title: the thing a human should build next.",
  },
  {
    title: "Live as agents work",
    body: "New wishes appear on the dashboard as they are filed, with the task the agent was trying to finish.",
  },
];

export function Landing() {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-[-10%] h-80 w-80 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="absolute top-24 right-[-8%] h-96 w-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
      </div>

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-zinc-50">
          <Mark className="h-11 w-11" />
          <span className="text-2xl font-semibold tracking-tight sm:text-3xl">Agent Wishlist</span>
        </Link>
        <Link
          href="/login"
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-200"
        >
          Get started
        </Link>
      </header>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pt-10 pb-20 sm:px-6 sm:pt-16">
        <section className="max-w-3xl">
          <p className="text-sm font-medium tracking-wide text-amber-200">For people who ship with agents</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-50 sm:text-6xl">
            The capabilities your agents keep asking for.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Agents hit a wall, work around it, and move on. The missing tool never becomes a ticket.
            Agent Wishlist catches that moment and ranks what to build next.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm"
            >
              <p className="text-sm font-medium text-amber-200">0{index + 1}</p>
              <h2 className="mt-3 text-xl font-medium text-zinc-50">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{step.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">What you get</h2>
            <p className="mt-3 text-zinc-400">
              A private board of wishes, clustered into the work that unblocks your agents.
            </p>
          </div>
          <div className="grid gap-4">
            {points.map((point) => (
              <article
                key={point.title}
                className="rounded-3xl border border-white/10 bg-zinc-950/40 p-6"
              >
                <h3 className="text-lg font-medium text-zinc-50">{point.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{point.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-400/15 via-violet-400/10 to-amber-300/15 p-8 sm:p-12">
          <h2 className="text-3xl font-semibold tracking-tight">Open your wishlist</h2>
          <p className="mt-3 max-w-xl text-zinc-300">
            Create an account, connect an agent, and the next time it gets stuck the wish shows up live.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex rounded-full bg-amber-300 px-5 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-amber-200"
          >
            Get started
          </Link>
        </section>
      </main>
    </div>
  );
}
