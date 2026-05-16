import { useState } from 'react';
import { Card, Button } from './ui/Card';
import { CheckCircle2, Circle, Trophy, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MOCK_QUIZ = {
  title: "Introduction to Calculus - Quiz 1",
  questions: [
    {
      id: 1,
      question: "What is the derivative of x^2?",
      options: ["x", "2x", "x^3/3", "2x^2"],
      correct: 1
    },
    {
      id: 2,
      question: "What is the integral of 1/x?",
      options: ["ln(x)", "e^x", "x^2", "1"],
      correct: 0
    },
    {
      id: 3,
      question: "Who is the 'father' of calculus along with Leibniz?",
      options: ["Newton", "Gauss", "Euler", "Pythagoras"],
      correct: 0
    }
  ]
};

export function Assessment() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentStep] = optionIdx;
    setAnswers(newAnswers);
  };

  const nextStep = () => {
    if (currentStep < MOCK_QUIZ.questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsFinished(true);
    }
  };

  const reset = () => {
    setCurrentStep(0);
    setAnswers([]);
    setIsFinished(false);
  };

  const score = answers.reduce((acc, ans, idx) => {
    return acc + (ans === MOCK_QUIZ.questions[idx].correct ? 1 : 0);
  }, 0);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Assessments</h1>
        <p className="text-gray-500 mt-1 font-medium">Test your knowledge with these quick quizzes.</p>
      </div>

      <AnimatePresence mode="wait">
        {!isFinished ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card title={MOCK_QUIZ.title} description={`Question ${currentStep + 1} of ${MOCK_QUIZ.questions.length}`}>
              <div className="mb-8">
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-8">
                  <div 
                    className="bg-black h-full transition-all duration-300" 
                    style={{ width: `${((currentStep + 1) / MOCK_QUIZ.questions.length) * 100}%` }} 
                  />
                </div>
                
                <h2 className="text-xl font-bold mb-6 text-gray-900">{MOCK_QUIZ.questions[currentStep].question}</h2>
                
                <div className="space-y-3">
                  {MOCK_QUIZ.questions[currentStep].options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(i)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
                        answers[currentStep] === i 
                        ? "border-black bg-black text-white shadow-lg" 
                        : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      <span className="font-bold">{option}</span>
                      {answers[currentStep] === i ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-gray-200 group-hover:text-gray-300" />}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-50">
                <Button 
                  onClick={nextStep} 
                  disabled={answers[currentStep] === undefined}
                  className="px-8 py-3"
                >
                  {currentStep === MOCK_QUIZ.questions.length - 1 ? 'Finish' : 'Next Question'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="text-center py-12">
               <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Trophy className="text-yellow-500 w-10 h-10" />
               </div>
               <h2 className="text-3xl font-extrabold mb-2">Quiz Completed!</h2>
               <p className="text-gray-500 font-medium mb-8">You've successfully completed {MOCK_QUIZ.title}</p>
               
               <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Your Score</p>
                    <p className="text-2xl font-black">{score}/{MOCK_QUIZ.questions.length}</p>
                 </div>
                 <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Percentage</p>
                    <p className="text-2xl font-black">{Math.round((score/MOCK_QUIZ.questions.length)*100)}%</p>
                 </div>
               </div>

               <div className="flex gap-4 justify-center">
                 <Button variant="outline" className="px-8" onClick={reset}>
                   <RefreshCw className="w-4 h-4 mr-2" />
                   Try Again
                 </Button>
                 <Button className="px-8">Continue Learning</Button>
               </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
