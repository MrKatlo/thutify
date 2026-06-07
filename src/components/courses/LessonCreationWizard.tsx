import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Link2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Card';
import * as cfApi from '../../services/cfApi';
import { inferMaterialCategory } from '../../lib/materialCategories';
import type { Course, Module } from '../../types';

type ResourceType = 'Video' | 'PDF' | 'Document' | 'Image' | 'Slides' | 'Other';

type LessonResource = {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  source: 'link' | 'upload';
  materialId?: string;
};

interface LessonCreationWizardProps {
  module: Module;
  course: Course;
  institutionId?: string;
  onClose: () => void;
  onCreated: () => void;
}

function makeLocalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeResourceType(fileType: string, fileName?: string): ResourceType {
  const normalized = fileType.toLowerCase();
  if (normalized.includes('video')) return 'Video';
  if (normalized.includes('pdf')) return 'PDF';
  if (normalized.includes('image')) return 'Image';
  if (normalized.includes('presentation') || normalized.includes('slides')) return 'Slides';
  if (normalized.includes('text') || normalized.includes('word') || normalized.includes('document')) return 'Document';
  if (fileName && fileName.match(/\.pdf$/i)) return 'PDF';
  if (fileName && fileName.match(/\.(doc|docx|txt)$/i)) return 'Document';
  if (fileName && fileName.match(/\.(ppt|pptx)$/i)) return 'Slides';
  return 'Other';
}

function insertMarkdownAtCursor(
  currentValue: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string,
  defaultText: string,
) {
  const selectedText = currentValue.slice(selectionStart, selectionEnd) || defaultText;
  return (
    currentValue.slice(0, selectionStart) +
    `${prefix}${selectedText}${suffix}` +
    currentValue.slice(selectionEnd)
  );
}

export function LessonCreationWizard({
  module,
  course,
  institutionId,
  onClose,
  onCreated,
}: LessonCreationWizardProps) {
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<ResourceType>('PDF');
  const [fileTitle, setFileTitle] = useState('');
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isAddingLink, setIsAddingLink] = useState(false);

  const createdDate = useMemo(() => new Date().toLocaleDateString(), []);

  const resourcesMarkdown = useMemo(() => {
    if (!resources.length) return '';
    return `\n\n### Resources\n${resources
      .map((resource) => `- [${resource.title}](${resource.url}) ${resource.type === 'Other' ? '' : `(${resource.type})`}`)
      .join('\n')}`;
  }, [resources]);

  const hasStepOneReady = title.trim().length > 0;

  const applyFormatting = (format: 'bold' | 'italic' | 'heading' | 'link' | 'bullet' | 'number' | 'table') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;
    let nextContent = content;

    switch (format) {
      case 'bold':
        nextContent = insertMarkdownAtCursor(content, selectionStart, selectionEnd, '**', '**', 'Bold text');
        break;
      case 'italic':
        nextContent = insertMarkdownAtCursor(content, selectionStart, selectionEnd, '*', '*', 'Italic text');
        break;
      case 'heading':
        nextContent = insertMarkdownAtCursor(content, selectionStart, selectionEnd, '## ', '', 'Heading text');
        break;
      case 'link':
        nextContent = insertMarkdownAtCursor(content, selectionStart, selectionEnd, '[', '](https://example.com)', 'Link text');
        break;
      case 'bullet':
        nextContent = insertMarkdownAtCursor(content, selectionStart, selectionEnd, '- ', '', 'List item');
        break;
      case 'number':
        nextContent = insertMarkdownAtCursor(content, selectionStart, selectionEnd, '1. ', '', 'Numbered item');
        break;
      case 'table':
        nextContent = insertMarkdownAtCursor(
          content,
          selectionStart,
          selectionEnd,
          '\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Value 1 | Value 2 | Value 3 |\n',
          '',
          '',
        );
        break;
      default:
        break;
    }

    setContent(nextContent);
    textarea.focus();
  };

  const addLinkResource = async () => {
    const url = linkUrl.trim();
    const titleValue = linkTitle.trim();
    if (!titleValue || !url) {
      toast.warning('Enter a title and link URL.');
      return;
    }
    if (!institutionId) {
      toast.error('Institution access required.');
      return;
    }

    setIsAddingLink(true);
    try {
      const material = await cfApi.createMaterial(institutionId, {
        title: titleValue,
        name: titleValue,
        category: 'Links',
        type: 'Link',
        download_url: url,
        downloadUrl: url,
        course_id: course.id,
        module_id: module.id,
        visibility: 'course',
        description: `Lesson link for ${title || 'new lesson'}`,
      });

      setResources((current) => [
        ...current,
        {
          id: makeLocalId(),
          title: titleValue,
          url,
          type: linkType,
          source: 'link',
          materialId: material.id,
        },
      ]);
      setLinkTitle('');
      setLinkUrl('');
      setLinkType('PDF');
      toast.success('Link added to lesson and Materials.');
    } catch (error) {
      console.error('Link save failed:', error);
      toast.error('Could not save link to Materials.');
    } finally {
      setIsAddingLink(false);
    }
  };

  const removeResource = (resourceId: string) => {
    setResources((current) => current.filter((resource) => resource.id !== resourceId));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !institutionId) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadResult = await cfApi.uploadFileWithProgress(file, setUploadProgress);
      const fileType = normalizeResourceType(file.type, file.name);
      const category = inferMaterialCategory(file.name, file.type);
      const resourceTitleLabel = fileTitle.trim() || file.name;

      const material = await cfApi.createMaterial(institutionId, {
        name: file.name,
        title: resourceTitleLabel,
        type: fileType,
        file_type: uploadResult.contentType || file.type,
        file_size: uploadResult.size || file.size,
        download_url: uploadResult.url,
        downloadUrl: uploadResult.url,
        r2_key: uploadResult.key,
        category,
        description: `Lesson attachment for ${title || 'new lesson'}`,
        course_id: course.id,
        module_id: module.id,
        visibility: 'course',
      });

      setResources((current) => [
        ...current,
        {
          id: makeLocalId(),
          title: resourceTitleLabel,
          url: uploadResult.url,
          type: fileType === 'Other' && category === 'Videos' ? 'Video' : fileType,
          source: 'upload',
          materialId: material.id,
        },
      ]);
      setFileTitle('');
      toast.success('File uploaded — visible in Materials and this lesson.');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Unable to upload attachment.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setFileInputKey((current) => current + 1);
    }
  };

  const handleSaveLesson = async () => {
    if (!institutionId) {
      toast.error('Unable to save lesson without institution access.');
      return;
    }
    setIsSaving(true);

    try {
      const fullContent = `${summary.trim() ? `**Lesson Summary:** ${summary.trim()}\n\n` : ''}${content.trim()}${resourcesMarkdown}`.trim();
      const videoResource = resources.find((resource) => resource.type === 'Video');
      await cfApi.createLesson(institutionId, {
        module_id: module.id,
        course_id: course.id,
        title: title.trim(),
        content: fullContent,
        videoUrl: videoResource?.url,
        published: 1,
      });
      toast.success('Lesson created successfully!');
      onCreated();
      onClose();
    } catch (error) {
      console.error('Lesson save failed:', error);
      toast.error('Could not save lesson.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative flex max-h-[min(90vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
          <div className="shrink-0 border-b border-gray-100 px-6 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900">Create Lesson</h3>
                <p className="mt-1 text-sm text-gray-500">Step {step} of 3 — build a richer lesson experience.</p>
              </div>
              <button type="button" onClick={onClose} className="text-gray-500 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[240px_1fr]">
            <div className="hidden shrink-0 space-y-4 border-r border-gray-100 bg-gray-50 p-5 md:block">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Lesson details</p>
                <h4 className="mt-2 font-semibold text-gray-900">{course.title}</h4>
                <p className="text-sm text-gray-500">Module: {module.title}</p>
                <p className="text-sm text-gray-500">Created: {createdDate}</p>
              </div>
              <div className="space-y-2">
                {[
                  { n: 1, label: 'Lesson information' },
                  { n: 2, label: 'Rich lesson content' },
                  { n: 3, label: 'Resources & files' },
                ].map((item) => (
                  <div
                    key={item.n}
                    className={`rounded-2xl p-3 ${step === item.n ? 'border border-black bg-white' : 'border border-gray-200 bg-transparent'}`}
                  >
                    <p className="text-sm font-semibold text-gray-900">Step {item.n}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Lesson title</label>
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Enter a clear lesson title"
                        className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Lesson summary</label>
                      <textarea
                        value={summary}
                        onChange={(event) => setSummary(event.target.value)}
                        placeholder="A short overview students will see before they start."
                        className="mt-2 min-h-[100px] w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex flex-wrap gap-2">
                        {(['heading', 'bold', 'italic', 'bullet', 'number', 'link', 'table'] as const).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => applyFormatting(fmt)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold capitalize text-gray-700 hover:bg-gray-100"
                          >
                            {fmt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-900">Lesson content</label>
                      <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        placeholder="Create lesson content with headings, links, bullet lists, and rich notes."
                        className="mt-2 min-h-[200px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Add a web link or upload a file. Everything you add here also appears under{' '}
                      <span className="font-semibold text-gray-900">Courses → Materials</span>.
                    </p>

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-indigo-600" />
                        <p className="text-sm font-bold text-gray-900">Add a link here</p>
                      </div>
                      <p className="mb-3 text-xs text-gray-500">Paste a URL to a video, PDF, or external resource.</p>
                      <div className="space-y-3">
                        <input
                          value={linkTitle}
                          onChange={(event) => setLinkTitle(event.target.value)}
                          placeholder="Link title (e.g. Lecture slides)"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                        />
                        <input
                          value={linkUrl}
                          onChange={(event) => setLinkUrl(event.target.value)}
                          placeholder="https://example.com/resource"
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={linkType}
                            onChange={(event) => setLinkType(event.target.value as ResourceType)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                          >
                            <option value="Video">Video</option>
                            <option value="PDF">PDF</option>
                            <option value="Document">Document</option>
                            <option value="Image">Image</option>
                            <option value="Slides">Slides</option>
                            <option value="Other">Other</option>
                          </select>
                          <Button
                            type="button"
                            onClick={() => void addLinkResource()}
                            disabled={isAddingLink}
                            className="bg-indigo-600 text-white hover:bg-indigo-700"
                          >
                            {isAddingLink ? 'Saving…' : 'Add link'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <UploadCloud className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-bold text-gray-900">Upload a file here</p>
                      </div>
                      <p className="mb-3 text-xs text-gray-500">PDFs, videos, presentations, and documents up to 50MB.</p>
                      <input
                        value={fileTitle}
                        onChange={(event) => setFileTitle(event.target.value)}
                        placeholder="Display name (optional — defaults to filename)"
                        className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        key={fileInputKey}
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-300 bg-white px-4 py-6 text-center transition hover:border-emerald-500 hover:bg-emerald-50/50 disabled:opacity-60"
                      >
                        <UploadCloud className="h-8 w-8 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-900">
                          {isUploading ? 'Uploading…' : 'Click to choose a file'}
                        </span>
                        <span className="text-xs text-gray-500">or drag and drop into this area</span>
                      </button>
                      {isUploading && (
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-xs text-gray-500">
                            <span>Uploading</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Added resources ({resources.length})</p>
                      </div>
                      {resources.length === 0 ? (
                        <p className="py-4 text-center text-sm text-gray-500">No resources yet.</p>
                      ) : (
                        <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                          {resources.map((resource) => (
                            <div
                              key={resource.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-900">{resource.title}</p>
                                <p className="text-xs text-gray-500">
                                  {resource.type} · {resource.source === 'upload' ? 'File' : 'Link'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeResource(resource.id)}
                                className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                                aria-label="Remove resource"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4 sm:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div>
                    {step > 1 && (
                      <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>
                        <ArrowLeft className="h-4 w-4" /> Back
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-3 sm:justify-end">
                    {step < 3 ? (
                      <Button
                        type="button"
                        className="bg-black text-white"
                        onClick={() => setStep((current) => Math.min(3, current + 1))}
                        disabled={step === 1 && !hasStepOneReady}
                      >
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="button" className="bg-black text-white" onClick={handleSaveLesson} disabled={isSaving}>
                        {isSaving ? 'Saving lesson…' : 'Create lesson'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
