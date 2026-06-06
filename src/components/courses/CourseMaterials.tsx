import { useEffect, useState, useMemo, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../ui/Card';
import { BookOpen, Upload, FileText, File, Video, Link as LinkIcon } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import { useToast } from '../ui/Toast';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  { key: 'PDFs', label: 'PDFs', icon: FileText },
  { key: 'Presentations', label: 'Presentations', icon: File },
  { key: 'Documents', label: 'Documents', icon: FileText },
  { key: 'Videos', label: 'Videos', icon: Video },
  { key: 'Links', label: 'External Links', icon: LinkIcon },
];

export function CourseMaterials() {
  const { profile, institutionId } = useAuth();
  const toast = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [externalLink, setExternalLink] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].key);
  const [materialToDelete, setMaterialToDelete] = useState<any | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchCourses();
  }, [institutionId]);

  useEffect(() => {
    setPage(1);
  }, [selectedCourse, selectedCategory]);

  useEffect(() => {
    if (!institutionId) return;
    if (selectedCourse) {
      fetchMaterialsForCourse(selectedCourse.id);
    } else {
      fetchMaterials();
    }
  }, [institutionId, selectedCourse]);

  const fetchCourses = async () => {
    if (!institutionId) return;
    setLoadingCourses(true);
    try {
      const list = await cfApi.listCourses(institutionId);
      setCourses(list);
      if (!selectedCourse && list.length > 0) {
        setSelectedCourse(list[0]);
      }
    } catch (err) {
      console.error('Fetch courses failed:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const fetchMaterials = async () => {
    if (!institutionId) return;
    setLoadingMaterials(true);
    try {
      const list = await cfApi.listMaterials(institutionId);
      setMaterials(list || []);
    } catch (err) {
      console.error('Fetch materials failed:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchMaterialsForCourse = async (courseId: string) => {
    if (!institutionId) return;
    setLoadingMaterials(true);
    try {
      const list = await cfApi.listMaterialsForCourse(institutionId, courseId);
      setMaterials(list || []);
    } catch (err) {
      console.error('Fetch materials failed:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const materialsForSelectedCourse = useMemo(() => {
    if (!selectedCourse) return [];
    return materials.filter(m => (m.course_id || m.courseId) === selectedCourse.id || m.courseId === selectedCourse.id || m.course_id === selectedCourse.id);
  }, [materials, selectedCourse]);

  const materialsByCategory = useMemo(() => {
    const list = materialsForSelectedCourse;
    const map: Record<string, any[]> = {};
    CATEGORIES.forEach(c => (map[c.key] = []));
    list.forEach((m: any) => {
      const cat = m.category || (m.type === 'Video' ? 'Videos' : 'Documents');
      if (map[cat]) map[cat].push(m);
      else map['Documents'].push(m);
    });
    return map;
  }, [materialsForSelectedCourse]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId || !selectedCourse) return;
    setUploading(true);
    try {
      // Client-side validation
      const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
      const allowedExtensions = ['pdf','ppt','pptx','doc','docx','mp4','mov','zip','jpg','jpeg','png','txt'];
      if (file) {
        if (file.size > MAX_BYTES) {
          toast.error('File is too large. Max 50MB allowed.');
          setUploading(false);
          return;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedExtensions.includes(ext)) {
          toast.error('Unsupported file type.');
          setUploading(false);
          return;
        }
      }

      let payload: any = { title: file?.name || externalLink || 'External Resource', category: selectedCategory, course_id: selectedCourse.id };

      if (file) {
        const uploaded = await cfApi.uploadFile(file);
        payload.download_url = uploaded.url;
        payload.file_type = uploaded.contentType;
        payload.file_size = uploaded.size;
      } else if (externalLink) {
        payload.download_url = externalLink;
        payload.type = 'Link';
      }

      await cfApi.createMaterial(institutionId, payload);
      setFile(null);
      setExternalLink('');
      toast.success('Material uploaded successfully.');
      if (selectedCourse) {
        fetchMaterialsForCourse(selectedCourse.id);
      } else {
        fetchMaterials();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!institutionId || !materialToDelete) return;
    try {
      await cfApi.deleteMaterial(institutionId, materialToDelete.id);
      toast.success('Material deleted');
      if (selectedCourse) {
        fetchMaterialsForCourse(selectedCourse.id);
      } else {
        fetchMaterials();
      }
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Could not delete material');
    } finally {
      setMaterialToDelete(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">Course Materials</h1>
          <p className="text-sm text-gray-500">Select a course to view and manage its materials.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <Card className="space-y-4 p-4">
            <h3 className="text-sm font-bold">Courses</h3>
            {loadingCourses ? (
              <div className="space-y-2">
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
                <div className="h-8 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : (
              <div className="space-y-2">
                {courses.map(c => (
                  <button key={c.id} onClick={() => setSelectedCourse(c)} className={`w-full text-left p-2 rounded ${selectedCourse?.id === c.id ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <div className="text-sm font-bold truncate">{c.title}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </aside>

        <main className="lg:col-span-3 space-y-6">
          {!selectedCourse ? (
            <Card className="p-8 text-center">
              <h3 className="text-lg font-bold">Select a course</h3>
              <p className="text-sm text-gray-500 mt-2">Choose a course from the list to view and manage its materials.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedCourse.title}</h2>
                  <p className="text-sm text-gray-500">Manage uploaded files and external resources for this course.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => (selectedCourse ? fetchMaterialsForCourse(selectedCourse.id) : fetchMaterials())} className="gap-2">
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const count = materialsByCategory[cat.key]?.length || 0;
                  return (
                    <button key={cat.key} onClick={() => setSelectedCategory(cat.key)} className={`px-3 py-2 rounded-lg border ${selectedCategory === cat.key ? 'bg-black text-white' : 'bg-white'}`}>
                      <div className="flex items-center gap-2 text-sm">
                        <Icon className="w-4 h-4" />
                        <span>{cat.label} <span className="text-gray-400">({count})</span></span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Card className="p-4">
                    <h3 className="text-sm font-bold mb-3">{selectedCategory}</h3>
                    {loadingMaterials ? (
                      <div className="space-y-2">
                        <div className="h-8 bg-gray-100 rounded animate-pulse" />
                        <div className="h-8 bg-gray-100 rounded animate-pulse" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const list = (materialsByCategory[selectedCategory] || []);
                          const total = list.length;
                          const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
                          const start = (page - 1) * PAGE_SIZE;
                          const pageItems = list.slice(start, start + PAGE_SIZE);
                          return (
                            <>
                              {pageItems.map((m: any) => (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded border border-gray-50">
                                  <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-gray-400" />
                                    <div className="text-sm">
                                      <div className="font-bold truncate">{m.title || m.name}</div>
                                      <div className="text-xs text-gray-400 truncate">{m.download_url || m.downloadUrl}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <a href={m.download_url || m.downloadUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600">Open</a>
                                    <button onClick={() => setMaterialToDelete(m)} className="text-xs text-red-500">Delete</button>
                                  </div>
                                </div>
                              ))}
                              {total === 0 && <p className="text-sm text-gray-500">No materials in this category.</p>}

                              {pageCount > 1 && (
                                <div className="mt-4 flex items-center justify-center gap-2">
                                  <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Prev</Button>
                                  <div className="text-sm text-gray-600">Page {page} / {pageCount}</div>
                                  <Button variant="outline" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page === pageCount}>Next</Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </Card>
                </div>

                <div>
                  <Card className="p-4">
                    <h3 className="text-sm font-bold mb-3">Upload Material</h3>
                    <form onSubmit={handleUpload} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-gray-400">Category</label>
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded">
                          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-400">File</label>
                        <input type="file" onChange={handleFileChange} className="w-full" />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-400">External Link</label>
                        <input value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded" />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1 bg-black text-white" disabled={uploading}>
                          <Upload className="w-4 h-4" /> Upload
                        </Button>
                        <Button variant="outline" onClick={() => { setFile(null); setExternalLink(''); }} className="flex-1">Clear</Button>
                      </div>
                    </form>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <AnimatePresence>
        {materialToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMaterialToDelete(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="rounded-3xl bg-rose-50 p-3">
                  <svg className="w-5 h-5 text-rose-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-gray-900">Delete material</h3>
                  <p className="text-sm text-gray-600">Are you sure you want to delete “{materialToDelete?.title || materialToDelete?.name}”? This action cannot be undone.</p>
                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setMaterialToDelete(null)}>Cancel</Button>
                    <Button className="bg-red-600 text-white" onClick={confirmDelete}>Delete</Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CourseMaterials;
