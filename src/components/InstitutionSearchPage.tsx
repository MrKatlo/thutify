import { useState, useEffect } from 'react';
import * as cfApi from '../services/cfApi';
import { BookOpen, Search, ArrowRight, Loader2, Compass, MapPin, Building, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import { navigate } from '../hooks/useRouter';
import { motion, AnimatePresence } from 'motion/react';
import { Institution } from '../types';

export function InstitutionSearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllInstitutions();
  }, []);

  const fetchAllInstitutions = async () => {
    setLoading(true);
    setError('');
    try {
      // Use the public search API (assuming it handles status=active filtering)
      const list = await cfApi.searchInstitutions('');
      setInstitutions(list);
    } catch (err: any) {
      console.error("Error fetching institutions:", err);
      setError("Failed to load institutions list.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = institutions.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInstitutionTypeLabel = (type: string) => {
    switch (type) {
      case 'school': return 'Academic School';
      case 'college': return 'College / University';
      case 'training_center': return 'Training Center';
      case 'company': return 'Corporate Academy';
      default: return 'Educational Academy';
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center p-4 font-sans selection:bg-black selection:text-white relative overflow-x-hidden">
      <div className="w-full max-w-xl py-12">
        
        {/* Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-black/10 cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/')}>
            <BookOpen className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Find Your Institution</h1>
          <p className="text-gray-500 text-sm font-semibold mt-1">Search below to access your school's custom portal or sign up for classes.</p>
        </div>

        {/* Search input card */}
        <Card className="p-6 md:p-8 shadow-xl border-gray-100 bg-white space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all text-sm font-semibold shadow-inner"
              placeholder="Search by institution name or web link..."
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl flex gap-3 items-center font-medium leading-relaxed">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* Results List */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 flex justify-between ml-1 border-b border-gray-50 pb-2">
              <span>Matching Portals ({filtered.length})</span>
              <span>Select to Join</span>
            </div>

            <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2.5">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-black" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Searching registered databases...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center space-y-4">
                  <Compass className="w-10 h-10 mx-auto text-gray-300 animate-bounce" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-500">No institutions found</p>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto">Double check spelling or ask your institution owner or staff for the exact slug link.</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence>
                  {filtered.map((inst, index) => (
                    <motion.div
                      key={inst.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      onClick={() => navigate(`/${inst.slug}/login`)}
                      className="p-4 bg-white border border-gray-100 hover:border-black rounded-2xl flex items-center justify-between cursor-pointer shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0">
                          {inst.logoUrl ? (
                            <img src={inst.logoUrl} className="w-full h-full object-contain rounded-xl" alt={inst.name} />
                          ) : (
                            <Building className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-black transition-colors">{inst.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400 font-semibold">
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {inst.country}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                            <span>{getInstitutionTypeLabel(inst.institutionType)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-black group-hover:border-black transition-all">
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </Card>

        {/* Action Link footer */}
        <div className="text-center mt-6 flex justify-center gap-6">
          <button onClick={() => navigate('/signup-institution')} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">
            Register a New School
          </button>
          <span className="text-gray-300 font-bold text-xs">|</span>
          <button onClick={() => navigate('/')} className="text-xs font-bold text-gray-400 hover:text-black uppercase tracking-widest transition-colors">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
