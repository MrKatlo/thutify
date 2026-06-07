import { useEffect, useMemo, useState } from 'react';
import { FileText, Video, Link as LinkIcon, Download } from 'lucide-react';
import * as cfApi from '../../services/cfApi';
import { groupMaterialsByCategory, MATERIAL_CATEGORIES } from '../../lib/materialCategories';

interface CourseMaterialsPanelProps {
  institutionId: string;
  courseId: string;
}

function materialUrl(m: any) {
  return m.download_url || m.downloadUrl || '';
}

function MaterialIcon({ category }: { category: string }) {
  if (category === 'Videos') return <Video className="w-4 h-4" />;
  if (category === 'Links') return <LinkIcon className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

export function CourseMaterialsPanel({ institutionId, courseId }: CourseMaterialsPanelProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!institutionId || !courseId) return;
    (async () => {
      setLoading(true);
      try {
        const list = await cfApi.listMaterialsForCourse(institutionId, courseId);
        setMaterials(list || []);
      } catch (err) {
        console.error('Failed to load course materials', err);
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [institutionId, courseId]);

  const grouped = useMemo(() => groupMaterialsByCategory(materials), [materials]);
  const hasMaterials = materials.length > 0;

  if (loading) {
    return <div className="h-24 bg-gray-50 rounded-2xl animate-pulse" />;
  }

  if (!hasMaterials) {
    return (
      <p className="text-sm text-gray-500 py-4">No files or videos uploaded for this course yet.</p>
    );
  }

  return (
    <div className="space-y-5">
      {MATERIAL_CATEGORIES.map((cat) => {
        const items = grouped[cat.key];
        if (!items.length) return null;
        return (
          <div key={cat.key}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{cat.label}</h4>
            <div className="space-y-2">
              {items.map((m) => {
                const url = materialUrl(m);
                const isVideo = cat.key === 'Videos' && url;
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                        <MaterialIcon category={cat.key} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{m.title || m.name}</p>
                        {m.module_id || m.moduleId ? (
                          <p className="text-xs text-gray-400">Module linked</p>
                        ) : null}
                      </div>
                    </div>
                    {url ? (
                      isVideo ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-indigo-600 shrink-0"
                        >
                          Watch
                        </a>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => cfApi.incrementMaterialDownloads(institutionId, m.id).catch(() => null)}
                          className="text-xs font-bold text-indigo-600 flex items-center gap-1 shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" /> Open
                        </a>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
