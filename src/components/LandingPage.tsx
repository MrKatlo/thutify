import { BookOpen, Shield, GraduationCap, Award, Compass, Sparkles } from 'lucide-react';
import { Button } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import { motion } from 'motion/react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fbfbfa] text-gray-900 font-sans selection:bg-black selection:text-white flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
            <BookOpen className="text-white w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-gray-900">LearnFlow <span className="text-xs font-semibold px-2 py-0.5 bg-black/5 text-gray-500 rounded-full border border-black/5 ml-1">SaaS</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/find-institution')} className="font-bold text-sm">
            Find School
          </Button>
          <Button variant="primary" onClick={() => navigate('/signup-institution')} className="font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-black/10">
            Register School
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto w-full px-6 py-16 lg:py-24 flex-1 flex flex-col lg:flex-row items-center gap-16">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-black/5 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full border border-black/5"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            Empowering Modern Education Anywhere
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.05]"
          >
            One Platform. <br />
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500 bg-clip-text text-transparent">Infinite Learning.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-gray-500 max-w-xl mx-auto lg:mx-0 leading-relaxed"
          >
            Transform your academy, college, or corporation with LearnFlow. Create your custom educational portal easily with course builders, student portals, and complete billing systems.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <Button 
              variant="primary" 
              onClick={() => navigate('/signup-institution')}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold rounded-2xl shadow-xl shadow-black/10"
            >
              Get Started for Free
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/find-institution')}
              className="w-full sm:w-auto px-8 py-4 text-base font-bold rounded-2xl"
            >
              Join as a Student
            </Button>
          </motion.div>
        </div>

        {/* Hero Features Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl"
        >
          <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm space-y-4 hover:border-gray-200 transition-all group">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-md shadow-black/10 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900">Your Brand, Your Campus</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Keep your school's unique identity. Customize colors, use your logo, and keep all student data fully secure and private.</p>
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm space-y-4 hover:border-gray-200 transition-all group">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-md shadow-black/10 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900">Rich Course Builder</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Easily publish lessons, upload resource materials, schedule virtual classrooms, and grade student submissions in real-time.</p>
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm space-y-4 hover:border-gray-200 transition-all group">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-md shadow-black/10 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900">Branded Certificates</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Reward successful graduates with official, downloadable PDF certificates branded with your school's logo.</p>
          </div>

          <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm space-y-4 hover:border-gray-200 transition-all group">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-md shadow-black/10 group-hover:scale-105 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-lg text-gray-900">Integrated Financials</h3>
            <p className="text-sm text-gray-500 leading-relaxed">Manage course fees, log bank transfer receipts, and track student payment balances automatically.</p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          <p>© 2026 LearnFlow SaaS Platform. All Rights Reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate('/platform-admin')} className="hover:text-black transition-colors">SaaS Admin Portal</button>
            <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-black transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
