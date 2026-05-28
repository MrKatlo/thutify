import React from 'react';
import { motion } from 'motion/react';
import { PublicLayout } from './layout/PublicLayout';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from './ui/Card';
import { navigate } from '../hooks/useRouter';

interface StaticPageProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function StaticPageTemplate({ title, subtitle, children }: StaticPageProps) {
  return (
    <PublicLayout>
      <section className="pt-32 pb-20 px-6 relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-display font-black text-gray-900 mb-6">{title}</h1>
            {subtitle && <p className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mb-12">{subtitle}</p>}
            <div className="prose prose-lg max-w-4xl text-gray-600 font-medium leading-relaxed">
              {children}
            </div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}

export function FeaturesPage() {
  return (
    <StaticPageTemplate 
      title="Platform Features" 
      subtitle="Explore the powerful tools we've built to help your institution thrive in the digital age."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
        <div className="space-y-4">
          <h3 className="text-2xl font-display font-bold text-gray-900">Institutional Management</h3>
          <p>Complete control over your academy's structure, staff, and students with our intuitive administrative suite.</p>
          <ul className="space-y-2">
            {['Multi-role access control', 'Detailed reporting', 'Bulk student enrollment', 'Teacher performance tracking'].map(item => (
              <li key={item} className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-blue-500" /> {item}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h3 className="text-2xl font-display font-bold text-gray-900">Learning Experience</h3>
          <p>Deliver engaging content and track student progress with ease using our modern learning tools.</p>
          <ul className="space-y-2">
            {['Interactive course builder', 'Quizzes and assessments', 'Real-time discussions', 'Mobile-first design'].map(item => (
              <li key={item} className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-teal-500" /> {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </StaticPageTemplate>
  );
}

export function SolutionsPage() {
  return (
    <StaticPageTemplate 
      title="Our Solutions" 
      subtitle="Tailored learning management for every type of educational organization."
    >
      <div className="space-y-16 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-3xl font-display font-black text-gray-900 mb-4">For K-12 & Higher Ed</h3>
            <p className="mb-6">Modernize your classroom with tools designed to enhance student engagement and simplify administrative overhead. Track attendance, manage grades, and facilitate communication all in one place.</p>
            <Button onClick={() => navigate('/signup-institution')} className="gap-2">Learn More <ArrowRight className="w-4 h-4" /></Button>
          </div>
          <div className="bg-blue-50 rounded-3xl p-12 aspect-video flex items-center justify-center">
             <span className="text-blue-500 font-display font-black text-2xl">Education Solution</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 bg-orange-50 rounded-3xl p-12 aspect-video flex items-center justify-center">
             <span className="text-orange-500 font-display font-black text-2xl">Corporate Training</span>
          </div>
          <div className="order-1 md:order-2">
            <h3 className="text-3xl font-display font-black text-gray-900 mb-4">For Corporate Training</h3>
            <p className="mb-6">Streamline employee onboarding and continuous professional development. Measure the impact of your training programs with advanced analytics and reporting.</p>
            <Button onClick={() => navigate('/signup-institution')} className="gap-2">Learn More <ArrowRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </StaticPageTemplate>
  );
}

export function PricingPage() {
  return (
    <StaticPageTemplate 
      title="Simple, Transparent Pricing" 
      subtitle="Choose the plan that's right for your institution. No hidden fees, no surprises."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {[
          { name: 'Starter', price: '$49', desc: 'Perfect for small tutors and individual educators.', features: ['Up to 50 students', '3 courses', 'Basic reporting', 'Email support'] },
          { name: 'Pro', price: '$149', desc: 'The best value for growing schools and training centers.', features: ['Up to 500 students', 'Unlimited courses', 'Advanced analytics', 'Priority support'], featured: true },
          { name: 'Enterprise', price: 'Custom', desc: 'Full-scale solution for large universities and corporations.', features: ['Unlimited everything', 'Custom domain', 'White labeling', 'Dedicated account manager'] }
        ].map(plan => (
          <div key={plan.name} className={`p-8 rounded-[2.5rem] border ${plan.featured ? 'border-black bg-black text-white shadow-2xl shadow-black/20 scale-105' : 'border-gray-100 bg-gray-50'}`}>
            <h3 className="text-xl font-display font-bold mb-2">{plan.name}</h3>
            <div className="text-4xl font-display font-black mb-4">{plan.price}<span className="text-sm font-medium opacity-60">/mo</span></div>
            <p className={`text-sm mb-8 font-medium ${plan.featured ? 'text-gray-400' : 'text-gray-500'}`}>{plan.desc}</p>
            <ul className="space-y-4 mb-10">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className={`w-4 h-4 ${plan.featured ? 'text-white' : 'text-black'}`} /> {f}
                </li>
              ))}
            </ul>
            <Button className={`w-full py-4 rounded-2xl font-bold ${plan.featured ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}>
              Get Started
            </Button>
          </div>
        ))}
      </div>
    </StaticPageTemplate>
  );
}

export function DocumentationPage() {
  return (
    <StaticPageTemplate title="Documentation" subtitle="Learn how to get the most out of Thutify with our comprehensive guides.">
      <div className="space-y-8">
        <section>
          <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">Getting Started</h3>
          <p>Welcome to Thutify! Our quick start guide will help you set up your institution and enroll your first students in minutes.</p>
        </section>
        <section>
          <h3 className="text-2xl font-display font-bold text-gray-900 mb-4">Course Creation</h3>
          <p>Learn how to use our rich media editor to create engaging lessons, quizzes, and assignments.</p>
        </section>
      </div>
    </StaticPageTemplate>
  );
}

export function ApiReferencePage() {
  return (
    <StaticPageTemplate title="API Reference" subtitle="Build custom integrations and extend Thutify's capabilities with our robust API.">
      <div className="bg-gray-900 rounded-3xl p-8 text-blue-400 font-mono text-sm overflow-x-auto">
        <pre>{`// Example API Request
fetch('https://api.thutify.com/v1/students', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
.then(res => res.json())
.then(console.log);`}</pre>
      </div>
      <p className="mt-8">Our RESTful API allows you to programmatically manage your institution, students, and courses. Stay tuned for our full SDK release.</p>
    </StaticPageTemplate>
  );
}

export function HelpCenterPage() {
  return (
    <StaticPageTemplate title="Help Center" subtitle="Find answers to frequently asked questions and get in touch with our support team.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100">
          <h3 className="text-xl font-display font-bold mb-4">Common Questions</h3>
          <ul className="space-y-4 text-sm font-semibold text-gray-500">
            <li className="hover:text-black cursor-pointer">How do I reset my password?</li>
            <li className="hover:text-black cursor-pointer">Can I use my own domain?</li>
            <li className="hover:text-black cursor-pointer">How do payments work?</li>
          </ul>
        </div>
        <div className="p-8 rounded-3xl bg-black text-white">
          <h3 className="text-xl font-display font-bold mb-4 text-white">Need more help?</h3>
          <p className="text-gray-400 mb-6">Our support team is available 24/7 to help you with any issues you might encounter.</p>
          <Button className="bg-white text-black hover:bg-gray-100">Contact Support</Button>
        </div>
      </div>
    </StaticPageTemplate>
  );
}

export function PrivacyPolicyPage() {
  return (
    <StaticPageTemplate title="Privacy Policy">
      <p>At Thutify, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information.</p>
      <h3 className="text-xl font-display font-bold text-gray-900 mt-8 mb-4">Information Collection</h3>
      <p>We collect information you provide directly to us when you create an account, such as your name, email address, and payment information.</p>
      <h3 className="text-xl font-display font-bold text-gray-900 mt-8 mb-4">Data Security</h3>
      <p>We use industry-standard security measures to protect your data from unauthorized access, disclosure, or destruction.</p>
    </StaticPageTemplate>
  );
}

export function TermsOfServicePage() {
  return (
    <StaticPageTemplate title="Terms of Service">
      <p>By using Thutify, you agree to comply with and be bound by the following terms and conditions of use.</p>
      <h3 className="text-xl font-display font-bold text-gray-900 mt-8 mb-4">Use of Service</h3>
      <p>You agree to use our service only for lawful purposes and in a way that does not infringe the rights of others.</p>
      <h3 className="text-xl font-display font-bold text-gray-900 mt-8 mb-4">Account Responsibility</h3>
      <p>You are responsible for maintaining the confidentiality of your account and password.</p>
    </StaticPageTemplate>
  );
}

export function CookiePolicyPage() {
  return (
    <StaticPageTemplate title="Cookie Policy">
      <p>We use cookies to enhance your experience on our website. This policy explains what cookies are and how we use them.</p>
      <h3 className="text-xl font-display font-bold text-gray-900 mt-8 mb-4">What are Cookies?</h3>
      <p>Cookies are small text files that are stored on your device when you visit a website.</p>
      <h3 className="text-xl font-display font-bold text-gray-900 mt-8 mb-4">How we use them</h3>
      <p>We use cookies to remember your preferences and provide a more personalized experience.</p>
    </StaticPageTemplate>
  );
}
