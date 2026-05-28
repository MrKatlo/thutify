import { ArrowRight, BadgeCheck, BookOpen, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { Button } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import logoImage from '../images/thutiy,com.png';

const highlights = [
  {
    icon: BookOpen,
    title: 'Course planning',
    description: 'Organize lessons, assignments, and progress in one calm workspace built for daily school operations.',
  },
  {
    icon: ShieldCheck,
    title: 'Attendance and family visibility',
    description: 'Keep teachers, parents, and leadership aligned with clear updates and reliable oversight.',
  },
  {
    icon: Zap,
    title: 'Operations without noise',
    description: 'Reduce manual follow-ups and keep the important work visible without adding more dashboards.',
  },
];

const proofPoints = [
  { value: '96%', label: 'staff adoption in 30 days' },
  { value: '18 hrs', label: 'saved each week' },
  { value: '4.9/5', label: 'teacher and parent rating' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fffdf8] text-slate-950 selection:bg-slate-950 selection:text-white">
      <div className="mx-auto max-w-6xl px-5 py-5 sm:px-6 lg:px-8">
        <header className="rounded-full border border-slate-200/80 bg-white/85 px-4 py-3 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.75)] backdrop-blur sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate('/')}>
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                <img src={logoImage} alt="Thutiy logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-black tracking-[-0.02em] text-slate-950">Thutiy</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Education OS</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/find-institution')} className="hidden px-4 py-2 text-sm font-semibold sm:inline-flex">
                Find School
              </Button>
              <Button variant="primary" onClick={() => navigate('/signup-institution')} className="rounded-xl px-4 py-2 text-sm font-bold">
                Register School
              </Button>
            </div>
          </div>
        </header>

        <main className="pt-6 sm:pt-8">
          <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(14,116,144,0.16),_transparent_22%),linear-gradient(180deg,#fffdf8,#fffefc)] px-5 py-6 shadow-[0_24px_90px_-48px_rgba(15,23,42,0.85)] sm:px-6 lg:px-8 lg:py-8">
            <div className="grid items-center gap-8 lg:grid-cols-[1.03fr_0.97fr]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  Calm school operations
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-2xl text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl">
                    The simpler way to run lessons, attendance, and communication.
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                    Thutiy gives education teams one polished workspace for planning, reporting, and family communication without the clutter of disconnected tools.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/signup-institution')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold"
                  >
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/find-institution')}
                    className="rounded-2xl px-5 py-3 text-sm font-bold"
                  >
                    View demo
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                  {['Branded school portal', 'Attendance insights', 'Simple parent updates'].map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-2">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.95)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-white/10 p-0.5">
                      <img src={logoImage} alt="Thutiy logo" className="h-full w-full object-contain" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Thutiy school cockpit</p>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-white/55">Weekly overview</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.24em] text-emerald-200">
                    Live
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {proofPoints.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-2xl font-black text-white">{item.value}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/55">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-3xl bg-white p-4 text-slate-950">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Today’s priority</p>
                      <p className="mt-1 text-lg font-black">Parent updates and attendance review</p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.24em] text-amber-700">
                      URGENT
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className="h-full w-3/4 rounded-full bg-slate-950" />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>82% response coverage</span>
                    <span>12 messages pending</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-3 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-36px_rgba(15,23,42,0.8)]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-slate-950">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </article>
              );
            })}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-36px_rgba(15,23,42,0.7)]">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
                <Users className="h-3.5 w-3.5" />
                Why leaders stay calm
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">A calmer workflow for schools that need clarity.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Thutiy reduces the daily noise of separate systems so school teams can focus on teaching, communication, and outcomes.
              </p>

              <ul className="mt-4 space-y-3">
                {[
                  'One workspace for lessons, attendance, and parent updates.',
                  'Clean reporting that makes priorities easy to see.',
                  'A professional brand experience for every student and family.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-white">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-[30px] border border-slate-200 bg-[#0b1118] p-5 text-white shadow-[0_28px_80px_-40px_rgba(0,0,0,0.9)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/55">What schools feel</p>
                  <p className="mt-2 text-2xl font-bold text-white">Less busywork. More visibility.</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
                  Focused
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">School leadership team</p>
                    <p className="text-sm text-white/65">A calmer operating rhythm across the week</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/70">
                  The platform brings daily priorities, updates, and reporting into one place so leaders can make decisions faster without losing focus.
                </p>
              </div>
            </article>
          </section>

          <section className="mt-6 rounded-[30px] border border-slate-200 bg-white px-5 py-5 shadow-[0_20px_60px_-38px_rgba(15,23,42,0.8)] md:flex md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Ready to simplify operations?</p>
              <p className="mt-2 text-2xl font-bold text-slate-950">Move from scattered tools to a focused school operating system.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 md:mt-0">
              <Button variant="primary" onClick={() => navigate('/signup-institution')} className="rounded-2xl px-4 py-2 text-sm font-bold">
                Create school profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/find-institution')} className="rounded-2xl px-4 py-2 text-sm font-bold">
                Book a walkthrough
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
