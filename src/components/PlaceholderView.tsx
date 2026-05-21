import { Card, Button } from './ui/Card';
import { motion } from 'motion/react';
import { Construction, LayoutTemplate, MoreVertical, Plus, Filter, Search, Download } from 'lucide-react';

interface PlaceholderViewProps {
  routeId: string;
}

export function PlaceholderView({ routeId }: PlaceholderViewProps) {
  // Parse route string: "category/action" -> "Category" and "Action"
  const segments = routeId.split('/').map(segment => 
    segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  );
  
  const title = segments[segments.length - 1];
  const parentCategory = segments.length > 1 ? segments[0] : 'Dashboard';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumb Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
            <span>{parentCategory}</span>
            <span className="text-gray-300">/</span>
            <span className="text-black">{title}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">
            Manage and view {title.toLowerCase()} configurations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 bg-white hidden sm:flex">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button className="gap-2 bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4" /> Add New
          </Button>
        </div>
      </div>

      {/* KPI Cards Placeholder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="p-5 flex flex-col justify-between h-32 border-gray-100/50 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                <LayoutTemplate className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-xs font-bold text-gray-400">0.0%</span>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">--</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Total {title}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <Card className="border border-gray-100 shadow-xl shadow-black/5 bg-white overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row gap-4 justify-between bg-gray-50/30">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>
          <Button variant="outline" className="gap-2 bg-white text-gray-600 border-gray-200 shrink-0">
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>

        {/* Empty State Body */}
        <div className="flex flex-col items-center justify-center p-12 md:p-24 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-amber-100/50"
          >
            <Construction className="w-10 h-10 text-amber-500" />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Under Construction</h2>
          <p className="text-gray-500 max-w-sm mx-auto text-sm leading-relaxed font-medium">
            The database schema and full UI implementation for <span className="font-bold text-gray-700">{title}</span> is scheduled for the next release phase.
          </p>
        </div>
      </Card>
    </div>
  );
}
