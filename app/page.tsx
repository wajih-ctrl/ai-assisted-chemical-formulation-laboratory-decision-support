import { RoleSelect } from '@/components/lab/role-select'
import { ArrowUpRightIcon, CheckCircle2Icon, FlaskConicalIcon, SparklesIcon } from 'lucide-react'

export default function LoginPage() {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,0.92fr)_minmax(620px,1.08fr)]">
      <section className="lab-grid relative order-2 flex min-h-[560px] flex-col justify-between gap-12 overflow-hidden bg-sidebar px-6 py-8 text-sidebar-foreground md:px-12 md:py-10 lg:order-1 lg:min-h-svh lg:px-[clamp(3rem,5vw,5.5rem)] lg:py-12">
        <div className="absolute -left-36 top-1/3 size-96 rounded-full bg-primary/15 blur-3xl" aria-hidden />
        <div className="absolute -right-32 -top-32 size-80 rounded-full bg-[#4361ee]/15 blur-3xl" aria-hidden />

        <div className="relative flex items-center gap-3">
          <span className="relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sidebar-primary to-[#5b8def] text-sidebar-primary-foreground shadow-lg shadow-black/20">
            <FlaskConicalIcon className="size-5" aria-hidden />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-sidebar bg-white" />
          </span>
          <span>
            <span className="block font-heading text-lg font-bold tracking-tight text-white">StrataLab</span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.13em] text-sidebar-foreground/85">Lab intelligence</span>
          </span>
        </div>

        <div className="relative flex max-w-2xl flex-col gap-8">
          <div className="flex flex-col gap-5">
            <p className="flex w-fit items-center gap-2 rounded-full border border-sidebar-primary/20 bg-sidebar-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-primary">
              <SparklesIcon className="size-3.5" aria-hidden />
              Evidence-led chemical intelligence
            </p>
            <h1 className="font-heading text-[2.45rem] font-semibold leading-[1.04] tracking-[-0.04em] text-white text-balance md:text-[3.35rem]">
              Turn laboratory history into your next confident decision.
            </h1>
            <p className="max-w-xl text-[15px] leading-7 text-sidebar-foreground md:text-base">
              Review historical bottle tests, compare formulations under matched conditions, spot untested regions and turn them into a reviewed testing plan.
            </p>
            <ul className="grid gap-2 text-xs text-sidebar-foreground/80 sm:grid-cols-3">
              {['Traceable evidence', 'Role-aware workflows', 'Clear uncertainty'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-sidebar-primary" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <figure className="glass-surface rounded-2xl p-5 shadow-2xl shadow-black/10 backdrop-blur-md">
            <figcaption className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.08em] text-sidebar-foreground">
              <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-sidebar-primary" />Live example observation</span>
              <span className="tnum rounded-full bg-white/5 px-2 py-1">INS-001</span>
            </figcaption>
            <p className="mt-4 max-w-lg font-heading text-lg font-medium leading-snug text-white">Potential diminishing returns for DM-A101 above 100 ppm</p>
            <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
              {[
                ['50 ppm', '60 %'],
                ['100 ppm', '82 %'],
                ['150 ppm', '84 %'],
              ].map(([dose, sep]) => (
                <div key={dose} className="rounded-xl border border-white/[0.06] bg-black/15 px-2 py-2.5">
                  <p className="tnum text-lg font-semibold text-white">{sep}</p>
                  <p className="text-xs text-sidebar-foreground">{dose}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-sidebar-foreground">
              CR-101 · 60 °C · 30 min settling · based on DEM-001, DEM-002, DEM-003, DEM-009. Single tests at most levels. Intermediate dosages are untested.
            </p>
          </figure>
        </div>

        <div className="relative flex max-w-xl items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs leading-relaxed text-sidebar-foreground">
          <p>Illustrative demo data only. Outputs are not scientifically validated.</p>
          <ArrowUpRightIcon className="hidden size-4 shrink-0 sm:block" aria-hidden />
        </div>
      </section>

      <section className="subtle-grid order-1 flex flex-col justify-center px-5 py-8 md:px-10 lg:order-2 lg:px-[clamp(3rem,5vw,5.5rem)] lg:py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-7">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#5b8def] text-white shadow-md">
              <FlaskConicalIcon className="size-[18px]" aria-hidden />
            </span>
            <span className="font-heading text-lg font-bold tracking-tight text-ink">StrataLab</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="eyebrow text-primary">Demo access</p>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-ink md:text-[1.8rem]">Choose your workspace</h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              No credentials are needed in this demonstration. Pick a role to see the workspace and permissions that role would have. You can switch roles at any time.
            </p>
          </div>
          <RoleSelect />
        </div>
      </section>
    </main>
  )
}
