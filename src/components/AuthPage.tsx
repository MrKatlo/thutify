import { GoogleAuthProvider } from 'firebase/auth';
import { loginWithGoogle } from '../lib/firebase';
import { BookOpen, LogIn } from 'lucide-react';
import { Button, Card } from './ui/Card';
import { motion } from 'motion/react';

export function AuthPage() {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfc] p-4 font-sans leading-relaxed">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/10">
            <BookOpen className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">TutorTrack</h1>
          <p className="text-gray-500 font-medium">The modern LMS for premium tutoring centers.</p>
        </div>

        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6 text-center tracking-tight">Welcome Back</h2>
          <Button 
            variant="outline" 
            onClick={handleLogin}
            className="w-full py-6 text-lg border-2 hover:border-black transition-all flex items-center justify-center gap-4"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Continue with Google
          </Button>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
