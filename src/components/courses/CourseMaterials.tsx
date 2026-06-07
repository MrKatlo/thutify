import { useEffect, useState, useMemo, FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button } from '../ui/Card';
import { BookOpen, Upload, FileText, Video, Link as LinkIcon } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import { useToast } from '../ui/Toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  MATERIAL_CATEGORIES,
  inferMaterialCategory,
  groupMaterialsByCategory,
} from '../../lib/materialCategories';

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  Videos: Video,
  PDFs: FileText,
  Presentations: FileText,
  Documents: FileText,
  Links: LinkIcon,
};

type Scope = 'general' | 'course';

export function CourseMaterials() {
  const { institutionId, canManageInstitution, isTeacher, profile } = useAuth();
  const toast = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [scope, setScope] = useState<Scope>('course');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(MATERIAL_CATEGORIES[0].key);
  const [file, setFile] = useState<File | null>(null);
  const [externalLink, setExternalLink] = useState('');
  const [title, setTitle] = useState('');
  const [materialToDelete, setMaterialToDelete] = useState<any | null>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  useEffect(() => {
    if (!institutionId) return;
    (async () => {
      try {
        let list = await cfApi.listCourses(institutionId);
        if (isTeacher && !canManageInstitution && profile?.uid) {
          list = (list || []).filter((c: any) => (c.teacher_id || c.teacherId) === profile.uid);
        }
        setCourses(list || []);
        if (list?.length) setSelectedCourseId(list[0].id);
      } catch (err) {
        console.error('Fetch courses failed:', err);
      }
    })();
  }, [institutionId]);

  useEffect(() => {
    if (!selectedCourseId || scope !== 'course') {
      setModules([]);
      setSelectedModuleId('');
      return;
    }
    (async () => {
      try {
        const list = await cfApi.listModules(selectedCourseId);
        setModules(list || []);
        setSelectedModuleId('');
      } catch (err) {
        console.error('Fetch modules failed:', err);
        setModules([]);
      }
    })();
  }, [selectedCourseId, scope]);

  const refreshMaterials = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      if (scope === 'course' && selectedCourseId) {
        const list = await cfApi.listMaterialsForCourse(institutionId, selectedCourseId);
        setMaterials(list || []);
      } else {
        const list = await cfApi.listMaterials(institutionId);
        setMaterials((list || []).filter((m: any) => !m.course_id && !m.courseId));
      }
    } catch (err) {
      console.error('Fetch materials failed:', err);
      toast.error('Could not load materials.');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMaterials();
  }, [institutionId, scope, selectedCourseId]);

  const visibleMaterials = useMemo(() => {
    if (scope === 'general') {
      return materials.filter((m) => !m.course_id && !m.courseId);
    }
    if (!selectedCourseId) return [];
    return materials.filter(
      (m) =>
        (m.course_id || m.courseId) === selectedCourseId ||
        (!m.course_id && !m.courseId),
    );
  }, [materials, scope, selectedCourseId]);

  const materialsByCategory = useMemo(
    () => groupMaterialsByCategory(visibleMaterials),
    [visibleMaterials],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      setSelectedCategory(inferMaterialCategory(f.name, f.type));
      if (!title) setTitle(f.name);
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId) return;
    if (scope === 'course' && !selectedCourseId) {
      toast.error('Pick a course first.');
      return;
    }
    if (!file && !externalLink) {
      toast.error('Add a file or link.');
      return;
    }

    setUploading(true);
    try {
      const MAX_BYTES = 50 * 1024 * 1024;
      if (file && file.size > MAX_BYTES) {
        toast.error('Max file size is 50MB.');
        return;
      }

      const category = externalLink && !file
        ? 'Links'
        : selectedCategory || inferMaterialCategory(file?.name, file?.type, Boolean(externalLink));

      const payload: Record<string, unknown> = {
        title: title || file?.name || externalLink || 'Resource',
        category,
        visibility: scope === 'general' ? 'institution' : 'course',
      };

      if (scope === 'course' && selectedCourseId) {
        payload.course_id = selectedCourseId;
        if (selectedModuleId) payload.module_id = selectedModuleId;
      }

      if (file) {
        const uploaded = await cfApi.uploadFile(file);
        payload.download_url = uploaded.url;
        payload.r2_key = uploaded.key;
        payload.file_type = uploaded.contentType;
        payload.file_size = uploaded.size;
      } else if (externalLink) {
        payload.download_url = externalLink;
        payload.type = 'Link';
      }

      await cfApi.createMaterial(institutionId, payload);
      setFile(null);
      setExternalLink('');
      setTitle('');
      toast.success('Uploaded.');
      await refreshMaterials();
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
      toast.success('Removed.');
      setMaterialToDelete(null);
      await refreshMaterials();
    } catch (err) {
      console.error('Delete failed', err);
      toast.error('Could not delete.');
    }
  };

  if (!canManageInstitution && !isTeacher) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        Open a course from Courses to view materials.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Materials</h1>
        <p className="text-sm text-gray-500 mt-1">Upload files and videos for a course or for everyone.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScope('course')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                scope === 'course' ? 'bg-black text-white border-black' : 'bg-white border-gray-200'
              }`}
            >
              Course
            </button>
            <button
              type="button"
              onClick={() => setScope('general')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                scope === 'general' ? 'bg-black text-white border-black' : 'bg-white border-gray-200'
              }`}
            >
              General
            </button>
            {scope === 'course' && (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {MATERIAL_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.key] || FileText;
              const count = materialsByCategory[cat.key]?.length || 0;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-2 ${
                    selectedCategory === cat.key ? 'bg-black text-white border-black' : 'bg-white border-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                  <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <Card className="p-4">
            <h3 className="font-bold text-sm mb-3">{selectedCategory}</h3>
            {loading ? (
              <div className="h-20 bg-gray-50 rounded-xl animate-pulse" />
            ) : (materialsByCategory[selectedCategory as keyof typeof materialsByCategory] || []).length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">Nothing here yet.</p>
            ) : (
              <div className="space-y-2">
                {(materialsByCategory[selectedCategory as keyof typeof materialsByCategory] || []).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{m.title || m.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {(m.course_id || m.courseId) ? selectedCourse?.title || 'Course' : 'General'}
                        {m.module_id || m.moduleId ? ' · module' : ''}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {(m.download_url || m.downloadUrl) && (
                        <a
                          href={m.download_url || m.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-indigo-600"
                        >
                          Open
                        </a>
                      )}
                      <button type="button" onClick={() => setMaterialToDelete(m)} className="text-xs text-red-500">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-4 h-fit space-y-3">
          <h3 className="font-bold text-sm">Upload</h3>
          <form onSubmit={handleUpload} className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm"
            />

            {scope === 'course' && modules.length > 0 && (
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-white"
              >
                <option value="">Whole course</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            )}

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm bg-white"
            >
              {MATERIAL_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>

            <input type="file" onChange={handleFileChange} className="w-full text-sm" />

            <input
              value={externalLink}
              onChange={(e) => {
                setExternalLink(e.target.value);
                if (e.target.value) setSelectedCategory('Links');
              }}
              placeholder="Or paste a link"
              className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm"
            />

            <Button type="submit" className="w-full bg-black text-white gap-2" disabled={uploading}>
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </form>
        </Card>
      </div>

      <AnimatePresence>
        {materialToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMaterialToDelete(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full"
            >
              <h3 className="font-bold">Delete this file?</h3>
              <p className="text-sm text-gray-500 mt-2">{materialToDelete.title || materialToDelete.name}</p>
              <div className="mt-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setMaterialToDelete(null)}>Cancel</Button>
                <Button className="bg-red-600 text-white" onClick={confirmDelete}>Delete</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CourseMaterials;
