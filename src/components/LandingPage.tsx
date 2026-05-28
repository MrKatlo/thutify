import { ArrowRight, Award, BookOpen, CheckCircle2, Compass, GraduationCap, Shield, Sparkles, Users } from 'lucide-react';
import { Button } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import { motion } from 'motion/react';
import logoImage from '../images/thutiy,com.png';

const featureCards = [
  {
    icon: Shield,
    title: 'Secure school branding',
    description: 'Keep your brand front and center with custom school identity, private student access, and secure admin controls.',
  },
  {
    icon: GraduationCap,
    title: 'Live learning workflows',
    description: 'Publish courses, manage lessons, host virtual classes, and review student activity from one clean workspace.',
  },
  {
    icon: Award,
    title: 'Professional certificates',
    description: 'Award completion with polished PDF certificates that match your institution’s visual identity.',
  },
  {
    icon: Compass,
    title: 'Integrated finances',
    description: 'Track invoices, payments, and outstanding balances without leaving the learning management system.',
  },
];

const stats = [
  { label: 'Institutions', value: '250+', accent: 'bg-slate-950 text-white' },
  { label: 'Active learners', value: '18K+', accent: 'bg-white border border-black/5' },
  { label: 'Course completion', value: '96%', accent: 'bg-amber-50 text-amber-700' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fcfcfb] text-gray-900 font-sans selection:bg-black selection:text-white flex flex-col justify-between">
      <header className="max-w-7xl mx-auto w-full px-6 py-6">
        <div className="rounded-full border border-black/5 bg-white/85 px-4 py-3 shadow-[0_12px_50px_-30px_rgba(0,0,0,0.65)] backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-2xl bg-white border border-black/5 p-0.5 shadow-md shadow-black/10 overflow-hidden flex items-center justify-center">
              <img src={logoImage} alt="Thutiy logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="font-black text-base tracking-tight text-gray-900">Thutiy</p>
              <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">Education OS</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/find-institution')} className="font-bold text-sm">
              Find School
            </Button>
            <Button variant="primary" onClick={() => navigate('/signup-institution')} className="font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-black/10">
              Register School
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-6 py-6 lg:py-10 flex-1">
        <section className="grid lg:grid-cols-[1.08fr_0.92fr] gap-8 items-center">
          <div className="space-y-7">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-[0_10px_35px_-22px_rgba(0,0,0,0.8)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              Smart learning operations for growing schools
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-black tracking-[-0.04em] text-gray-950 leading-[0.95]"
            >
              Bring your school online with one beautiful learning platform.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-gray-600 max-w-2xl leading-relaxed"
            >
              Thutiy helps academies, colleges, and training centers launch branded portals, manage lessons, track attendance, and run payments from a single workspace.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <Button
                variant="primary"
                onClick={() => navigate('/signup-institution')}
                className="w-full sm:w-auto px-6 py-3.5 text-base font-bold rounded-2xl shadow-xl shadow-black/10 flex items-center justify-center gap-2"
              >
                Start free trial
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/find-institution')}
                className="w-full sm:w-auto px-6 py-3.5 text-base font-bold rounded-2xl"
              >
                Explore student portal
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="flex flex-wrap gap-3"
            >
              {['Brand-ready dashboards', 'Attendance automation', 'Payment tracking'].map((item) => (
                <div key={item} className="inline-flex items-center gap-2 rounded-full bg-white border border-black/5 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  {item}
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid sm:grid-cols-3 gap-3"
            >
              {stats.map((stat) => (
                <div key={stat.label} className={`rounded-2xl px-4 py-3 border border-black/5 ${stat.accent} shadow-sm`}>
                  <p className="text-2xl font-black">{stat.value}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.24em] opacity-80">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="rounded-[2rem] border border-black/5 bg-white p-4 shadow-[0_30px_120px_-40px_rgba(0,0,0,0.55)]"
          >
            <div className="rounded-[1.75rem] bg-[#0b0b0c] p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 p-0.5 overflow-hidden">
                    <img src={logoImage} alt="Thutiy logo" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Thutiy Admin</p>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">School command center</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.26em] text-emerald-200">Live</span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Enrolled students</p>
                  <p className="mt-3 text-3xl font-black">1,284</p>
                  <p className="mt-2 text-xs text-emerald-200">+18% this month</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Courses</p>
                  <p className="mt-3 text-3xl font-black">96</p>
                  <p className="mt-2 text-xs text-white/70">Across 4 active programs</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 text-gray-900">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-500">Today’s focus</p>
                    <p className="mt-1 text-lg font-black">New lesson rollout</p>
                  </div>
                  <div className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-amber-700">High priority</div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full w-3/4 rounded-full bg-black" />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>82% course completion</span>
                  <span>12 pending reviews</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mt-10 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {featureCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1 + index * 0.08 }}
                className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_16px_60px_-40px_rgba(0,0,0,0.55)]"
              >
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="mt-4 text-lg font-black text-gray-950">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.description}</p>
              </motion.article>
            );
          })}
        </section>

        <section className="mt-10 rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_18px_60px_-38px_rgba(0,0,0,0.55)]">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-gray-500">Why schools choose Thutiy</p>
              <h2 className="mt-3 text-3xl font-black text-gray-950">A polished student experience backed by operational control.</h2>
              <p className="mt-3 text-base text-gray-600 leading-relaxed">From admissions to certificates, every step is designed to feel premium while staying simple for admins, teachers, and students.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Users, title: 'Role-aware journeys', text: 'Students, teachers, and admins each get the right dashboard and permissions.' },
                { icon: BookOpen, title: 'Course-first workflows', text: 'Organize modules, attendance, and assignments in one streamlined flow.' },
                { icon: Shield, title: 'Secure data handling', text: 'Keep institution records protected with smart governance controls.' },
                { icon: Compass, title: 'Digital operations', text: 'Launch campaigns, payments, and certificates without switching tools.' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl bg-[#fafafa] border border-black/5 p-4">
                    <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="mt-3 font-bold text-gray-950">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-400 uppercase tracking-[0.26em]">
          <p>© 2026 Thutiy Education OS. All rights reserved.</p>
          <div className="flex gap-5">
            <button onClick={() => navigate('/platform-admin')} className="hover:text-black transition-colors">SaaS Admin Portal</button>
            <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
