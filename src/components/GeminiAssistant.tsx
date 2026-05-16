import { useState } from 'react';
import { Sparkles, Send, Loader2, X } from 'lucide-react';
import { getTutorAssistance } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './ui/Card';

export function GeminiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResponse('');
    const res = await getTutorAssistance(prompt);
    setResponse(res || 'No response generated.');
    setLoading(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-96"
          >
            <Card className="shadow-2xl border-2 border-black/5 p-0 overflow-hidden">
              <div className="bg-black p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-yellow-400 w-4 h-4" />
                  <span className="text-white font-bold text-sm">TutorAI Assistant</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 h-80 overflow-y-auto bg-[#fafafa]">
                {!response && !loading && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                      <Sparkles className="text-black w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">How can I help you today?</p>
                    <p className="text-xs text-gray-500">I can draft course descriptions, explain concepts, or help with scheduling.</p>
                  </div>
                )}
                
                {(response || loading) && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-black text-white px-4 py-2 rounded-2xl rounded-tr-none text-sm max-w-[80%]">
                        {prompt}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none text-sm shadow-sm max-w-[90%] prose prose-sm">
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span className="font-medium text-gray-400">Thinking...</span>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{response}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-white">
                <div className="flex gap-2">
                  <input 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    placeholder="Ask anything..."
                    className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                  />
                  <Button onClick={handleAsk} disabled={loading} className="p-2 aspect-square">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    </div>
  );
}
