import { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ui/Toast';
import { Card, Button } from './ui/Card';
import { Folder, FileText, Download, Plus, Search, Film, Eye, Loader2, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as cfApi from '../services/cfApi';

interface ContentLibraryProps {
  initialCategory?: string;
  autoOpenUpload?: boolean;
}

export function ContentLibrary({ initialCategory = 'All Files', autoOpenUpload = false }: ContentLibraryProps) {
  const { profile, institutionId } = useAuth();
  const toast = useToast();
  
  // States
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(initialCategory);

  // Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('Syllabi & PDFs');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewAsset, setPreviewAsset] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    fetchMaterials();
  }, [institutionId]);

  useEffect(() => {
    if (autoOpenUpload) {
      setShowUploadModal(true);
    }
  }, [autoOpenUpload]);

  const fetchMaterials = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      const list = await cfApi.listMaterials(institutionId);
      setMaterials(list);
    } catch (err) {
      console.error("Fetch materials failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !institutionId || !profile) return;
    setUploading(true);
    setUploadProgress(20);

    try {
      // 1. Upload to R2 via Worker
      const uploadRes = await cfApi.uploadFile(selectedFile);
      setUploadProgress(70);
      
      // 2. Create material record in D1
      await cfApi.createMaterial(institutionId, {
        name: selectedFile.name,
        type: selectedFile.type.includes('video') ? 'Video' : selectedFile.type.includes('pdf') ? 'PDF' : 'Document',
        size: formatFileSize(selectedFile.size),
        file_size: selectedFile.size,
        category: uploadCategory,
        r2_key: uploadRes.key,
        download_url: uploadRes.url,
      });

      setUploadProgress(100);
      toast.success("Material uploaded successfully!");
      setShowUploadModal(false);
      setSelectedFile(null);
      fetchMaterials();
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAsset = async (file: any) => {
    if (!institutionId || !file) return;
    try {
      await cfApi.incrementMaterialDownloads(institutionId, file.id);
    } catch (err) {
      console.warn('Could not increment downloads:', err);
    }

    const downloadUrl = file.download_url || file.downloadUrl;
    const isProtected = downloadUrl?.includes('/api/storage/object');
    if (isProtected) {
      try {
        const url = new URL(downloadUrl, window.location.origin);
        const key = url.searchParams.get('key');
        if (!key) throw new Error('Missing storage key');

        const blob = await cfApi.fetchStorageObject(key);
        if (file.type === 'Video') {
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          const objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
          setPreviewAsset(file);
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        return;
      } catch (err) {
        console.error('Protected asset fetch failed:', err);
      }
    }

    window.open(downloadUrl, '_blank');
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!institutionId) return;
    if (!confirm("Are you sure?")) return;
    try {
      await cfApi.deleteMaterial(institutionId, fileId);
      toast.success("Material removed.");
      fetchMaterials();
    } catch (err) {
      console.error("Delete material failed:", err);
      toast.error("Failed to remove material.");
    }
  };

  const categories = [
    { label: 'All Files', count: materials.length },
    { label: 'Lecture Videos', count: materials.filter(m => m.category === 'Lecture Videos').length },
    { label: 'Syllabi & PDFs', count: materials.filter(m => m.category === 'Syllabi & PDFs').length },
    { label: 'Assignments sheets', count: materials.filter(m => m.category === 'Assignments sheets').length },
  ];

  const title = activeCategory === 'Lecture Videos'
    ? 'Video Lessons'
    : activeCategory === 'Syllabi & PDFs'
      ? 'Documents & Resources'
      : activeCategory === 'Assignments sheets'
        ? 'Assignment Materials'
        : 'Content Library';

  const description = activeCategory === 'Lecture Videos'
    ? 'Manage video lessons stored in your institution bucket.'
    : activeCategory === 'Syllabi & PDFs'
      ? 'Upload and share PDF syllabi, notes, and guides with your students.'
      : activeCategory === 'Assignments sheets'
        ? 'Distribute worksheets, assignments, and practice files.'
        : 'Store course assets in the shared institutional repository.';

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All Files' || m.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const canManage = profile?.role === 'teacher' || profile?.role === 'owner';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{title}</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">{description}</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowUploadModal(true)} className="bg-black text-white hover:bg-gray-800">
            <Plus className="w-4 h-4 mr-2" />
            Upload Asset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
          <Card title="Folders">
            <div className="space-y-1 mt-4">
              {categories.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveCategory(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeCategory === item.label ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${activeCategory === item.label ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{item.count}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 text-black animate-spin" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Accessing cloud drive...</p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-900">No resources found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMaterials.map((file, idx) => (
                  <motion.div 
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all group gap-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl bg-gray-900 text-white shrink-0`}>
                        {file.type === 'Video' ? <Film className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{file.size} • {file.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleOpenAsset(file)}
                        className="p-2 text-gray-400 hover:text-black hover:bg-white rounded-lg transition-all"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canManage && (
                        <button 
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => !uploading && setShowUploadModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">Upload Asset</h3>
                <button onClick={() => setShowUploadModal(false)} className="text-lg">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                  <select 
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    disabled={uploading}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-black text-sm font-bold"
                  >
                    <option value="Lecture Videos">Lecture Videos</option>
                    <option value="Syllabi & PDFs">Syllabi & PDFs</option>
                    <option value="Assignments sheets">Assignments sheets</option>
                  </select>
                </div>

                <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center bg-gray-50/50 hover:border-black/20 transition-all relative cursor-pointer">
                  <input type="file" onChange={handleFileChange} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <Folder className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-xs font-black text-gray-900 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <p className="text-xs font-bold text-gray-400">Click to browse or drag file</p>
                  )}
                </div>

                {uploading && (
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-4">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-black" />
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                   <Button variant="outline" onClick={() => setShowUploadModal(false)} className="flex-1">Cancel</Button>
                   <Button onClick={handleUploadSubmit} disabled={!selectedFile || uploading} className="flex-[2] bg-black text-white">Upload to Cloud</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {previewAsset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => { setPreviewAsset(null); setPreviewUrl(null); }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative w-full max-w-3xl bg-white rounded-3xl p-6 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Preview video</h3>
                  <p className="text-sm text-gray-500">{previewAsset.name}</p>
                </div>
                <button onClick={() => { setPreviewAsset(null); setPreviewUrl(null); }} className="text-lg">✕</button>
              </div>
              <div className="rounded-3xl overflow-hidden bg-black">
                <video controls className="w-full h-full bg-black">
                  <source src={previewUrl || previewAsset.download_url || previewAsset.downloadUrl} type={previewAsset.contentType || 'video/mp4'} />
                  Your browser does not support the video tag.
                </video>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
