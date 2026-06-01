import { useMemo, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as cfApi from '../../services/cfApi';
import { Button } from '../ui/Card';
import { BookOpen, FileText, Clock3, ArrowLeft, Link2, User } from 'lucide-react';
import type { Course, Lesson } from '../../types';

interface LessonReaderProps {
  lesson: Lesson;
  course: Course;
  onBack: () => void;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownToHtml(content: string) {
  const cleaned = escapeHtml(content || '');
  const withLinks = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-indigo-600 hover:text-indigo-800 underline">$1</a>');
  const withBold = withLinks.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const withItalic = withBold.replace(/\*(.+?)\*/g, '<em>$1</em>');

  return withItalic
    .split(/\n{2,}/g)
    .map((block) => {
      const trimmed = block.trim();
      if (trimmed.startsWith('## ')) {
        return `<h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">${trimmed.slice(3)}</h3>`;
      }
      if (/^-\s+/m.test(trimmed)) {
        return `<ul class="list-disc list-inside space-y-2 text-sm text-gray-700">${trimmed
          .split(/\n+/)
          .map((line) => `<li>${line.replace(/^-\s+/, '')}</li>`)
          .join('')}</ul>`;
      }
      if (/^\d+\.\s+/m.test(trimmed)) {
        return `<ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">${trimmed
          .split(/\n+/)
          .map((line) => `<li>${line.replace(/^\d+\.\s+/, '')}</li>`)
          .join('')}</ol>`;
      }
      return `<p class="text-sm leading-7 text-gray-700">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('');
}

function extractResourceLinks(content: string) {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches: { label: string; url: string }[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    matches.push({ label: match[1], url: match[2] });
  }
  return matches;
}

export function LessonReader({ lesson, course, onBack }: LessonReaderProps) {
  const { institutionId } = useAuth();

  useEffect(() => {
    if (!institutionId || !lesson?.id) return;
    try {
      const key = `lesson_viewed:${lesson.id}`;
      const raw = sessionStorage.getItem(key);
      const now = Date.now();
      const debounceMs = 30 * 1000; // 30 seconds
      if (raw) {
        const prev = Number(raw || '0');
        if (!isNaN(prev) && now - prev < debounceMs) {
          return;
        }
      }
      sessionStorage.setItem(key, String(now));
      void cfApi.incrementLessonView(institutionId, lesson.id).catch(() => null);
    } catch (err) {
      void cfApi.incrementLessonView(institutionId, lesson.id).catch(() => null);
    }
  }, [institutionId, lesson?.id]);

  const lessonContent = lesson.content || '';
  const summaryMatch = lessonContent.match(/^\*\*Lesson Summary:\*\*\s*(.+?)(?:\n{2,}|$)/s);
  const lessonSummary = summaryMatch?.[1]?.trim() || '';
  const bodyContent = lessonSummary ? lessonContent.replace(summaryMatch?.[0] || '', '').trim() : lessonContent;
  const authorName = (course.teacherName || course.teacher_name || 'Instructor') as string;
  const createdAt = String(lesson.created_at || lesson.createdAt || '').slice(0, 10);
  const updatedAt = String(lesson.updated_at || lesson.updatedAt || '').slice(0, 10);
  const resources = useMemo(() => extractResourceLinks(bodyContent), [bodyContent]);
  const isVideoResource = Boolean(lesson.videoUrl && lesson.videoUrl.match(/\.(mp4|mov|webm)$/i));

  const htmlContent = useMemo(() => formatMarkdownToHtml(bodyContent), [bodyContent]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button variant="outline" onClick={onBack} className="gap-2 mb-3">
              <ArrowLeft className="w-4 h-4" /> Back to lessons
            </Button>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-gray-500 font-semibold">
                <span>Course</span>
                <span className="text-black">•</span>
                <span>{course.title}</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-gray-900">{lesson.title}</h1>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span>{authorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-gray-400" />
              <span>Created {createdAt || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-gray-400" />
              <span>Last updated {updatedAt || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <article className="space-y-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-gray-500 text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Lesson content</span>
            </div>
            {lessonSummary ? (
              <div className="rounded-3xl border border-gray-100 bg-slate-50 p-5 text-sm text-gray-700">
                <p className="text-xs uppercase tracking-[0.24em] text-gray-400 mb-2">Lesson summary</p>
                <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: formatMarkdownToHtml(lessonSummary) }} />
              </div>
            ) : null}
            {lesson.videoUrl ? (
              isVideoResource ? (
                <div className="rounded-3xl overflow-hidden border border-gray-100 bg-black">
                  <video controls src={lesson.videoUrl} className="w-full max-h-[420px] bg-black" />
                </div>
              ) : (
                <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="block rounded-3xl border border-gray-100 bg-slate-50 p-4 text-sm text-indigo-600 hover:bg-slate-100">
                  Open lesson resource
                </a>
              )
            ) : null}
            <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: htmlContent }} />
          </article>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 text-sm font-semibold text-gray-900">
                <FileText className="w-4 h-4" />
                Attached resources
              </div>
              {lesson.videoUrl ? (
                <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="block rounded-3xl border border-gray-100 bg-slate-50 px-4 py-3 text-sm text-indigo-600 hover:bg-slate-100 transition">
                  <div className="flex items-center justify-between gap-3">
                    <span>Lecture video</span>
                    <Link2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{lesson.videoUrl}</p>
                </a>
              ) : null}
              {resources.length === 0 && !lesson.videoUrl ? (
                <p className="text-sm text-gray-500">No resources attached to this lesson.</p>
              ) : null}
              {resources.length > 0 && (
                <div className="space-y-3">
                  {resources.map((resource, index) => (
                    <a key={index} href={resource.url} target="_blank" rel="noreferrer" className="block rounded-3xl border border-gray-100 bg-slate-50 px-4 py-3 text-sm text-indigo-600 hover:bg-slate-100 transition">
                      <div className="flex items-center justify-between gap-3">
                        <span>{resource.label}</span>
                        <Link2 className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">{resource.url}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
