import { motion } from 'motion/react';
import { Shield, Zap, Users, ArrowRight, CheckCircle2, Globe, GraduationCap, Layout, Smartphone } from 'lucide-react';
import { Button } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import { PublicLayout } from './layout/PublicLayout';

export function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-orange-50/50 rounded-full blur-[100px]" />
          <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-teal-50/50 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-6 border border-blue-100/50">
              <Zap className="w-3 h-3 fill-current" />
              The Modern LMS for Modern Academies
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-black text-gray-900 leading-[1.1] mb-8 max-w-4xl mx-auto">
              Transform Your Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-teal-500 to-orange-500">Experience.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
              Empower your students and educators with a comprehensive, unified platform designed to streamline administration and enhance engagement.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => navigate('/signup-institution')}
                className="w-full sm:w-auto px-10 py-4 text-sm font-bold rounded-2xl bg-black hover:bg-gray-800 text-white shadow-2xl shadow-black/20 flex items-center gap-2 group"
              >
                Register Institution
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/find-institution')}
                className="w-full sm:w-auto px-10 py-4 text-sm font-bold rounded-2xl border-2 border-gray-100 hover:bg-gray-50 text-gray-900 flex items-center gap-2"
              >
                Find Your School
              </Button>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-100 flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {['Schools', 'Universities', 'Training Centers', 'Corporates'].map((item) => (
                <div key={item} className="flex items-center gap-2 font-display font-bold text-gray-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-display font-black text-gray-900 mb-4">Everything you need to <br className="hidden md:block" /> scale your academy.</h2>
            <p className="text-gray-500 font-medium text-lg">Powerful features built for administrators, teachers, and students.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Layout className="w-6 h-6" />}
              title="Intuitive Dashboards"
              description="Beautifully designed interfaces that provide instant insights into student progress and institutional health."
              color="bg-blue-500"
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="Member Management"
              description="Easily manage students, teachers, and staff with granular permissions and automated onboarding."
              color="bg-orange-500"
            />
            <FeatureCard 
              icon={<GraduationCap className="w-6 h-6" />}
              title="Course Authoring"
              description="Build engaging courses with rich content, quizzes, and multimedia resources in minutes."
              color="bg-teal-500"
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6" />}
              title="Secure Financials"
              description="Integrated payment tracking, invoicing, and financial reporting for transparent academy management."
              color="bg-red-500"
            />
            <FeatureCard 
              icon={<Smartphone className="w-6 h-6" />}
              title="Mobile Ready"
              description="A fully responsive experience that works seamlessly across desktops, tablets, and smartphones."
              color="bg-purple-500"
            />
            <FeatureCard 
              icon={<Globe className="w-6 h-6" />}
              title="Custom Branding"
              description="Your academy, your brand. Customize logos, colors, and portal URLs to match your identity."
              color="bg-indigo-500"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-black rounded-[2.5rem] p-8 md:p-20 relative overflow-hidden text-center">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-8">Ready to elevate your institution?</h2>
              <p className="text-gray-400 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto">
                Join hundreds of educational institutions already using Thutify to deliver world-class learning experiences.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/signup-institution')}
                  className="px-12 py-5 bg-white text-black hover:bg-gray-100 font-bold rounded-2xl shadow-2xl shadow-white/5"
                >
                  Register Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/find-institution')}
                  className="px-12 py-5 border-white/20 text-white hover:bg-white/10 font-bold rounded-2xl"
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode, title: string, description: string, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100/50 hover:bg-white hover:shadow-2xl hover:shadow-black/5 transition-all duration-300"
    >
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-black/5`}>
        {icon}
      </div>
      <h3 className="text-xl font-display font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 text-sm font-semibold leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}
