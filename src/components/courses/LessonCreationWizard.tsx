import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Bold, Italic, UploadCloud, X, Trash2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Card';
import * as cfApi from '../../services/cfApi';
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
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('PDF');
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

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

  const addResource = () => {
    const url = resourceUrl.trim();
    const titleValue = resourceTitle.trim();
    if (!titleValue || !url) {
      toast.warning('Resource title and URL are required.');
      return;
    }
    setResources((current) => [
      ...current,
      {
        id: makeLocalId(),
        title: titleValue,
        url,
        type: resourceType,
        source: 'link',
      },
    ]);
    setResourceTitle('');
    setResourceUrl('');
    setResourceType('PDF');
  };

  const removeResource = (resourceId: string) => {
    setResources((current) => current.filter((resource) => resource.id !== resourceId));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !institutionId) return;
    setIsUploading(true);

    try {
      const uploadResult = await cfApi.uploadFile(file);
      const fileType = normalizeResourceType(file.type, file.name);
      const material = await cfApi.createMaterial(institutionId, {
        name: file.name,
        title: file.name,
        type: fileType,
        file_type: file.type,
        file_size: file.size,
        downloadUrl: uploadResult.url,
        download_url: uploadResult.url,
        category: 'Lesson Resource',
        description: `Lesson attachment for ${title || 'new lesson'}`,
      });

      setResources((current) => [
        ...current,
        {
          id: makeLocalId(),
          title: file.name,
          url: uploadResult.url,
          type: fileType,
          source: 'upload',
          materialId: material.id,
        },
      ]);
      toast.success('Attachment uploaded and added to resources.');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Unable to upload attachment.');
    } finally {
      setIsUploading(false);
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
          className="relative w-full max-w-3xl bg-white rounded-3xl p-8 shadow-2xl overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-2xl font-black text-gray-900">Create Lesson</h3>
              <p className="text-sm text-gray-500 mt-1">Step {step} of 3 — build a richer lesson experience.</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-black">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-[280px_1fr]">
            <div className="space-y-4 rounded-3xl border border-gray-100 bg-gray-50 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Lesson details</p>
                <h4 className="font-semibold text-gray-900 mt-2">{course.title}</h4>
                <p className="text-sm text-gray-500">Module: {module.title}</p>
                <p className="text-sm text-gray-500">Created: {createdDate}</p>
              </div>
              <div className="space-y-3">
                <div className={`rounded-2xl p-4 ${step === 1 ? 'bg-white border border-black' : 'bg-transparent border border-gray-200'}`}>
                  <p className="text-sm font-semibold text-gray-900">Step 1</p>
                  <p className="text-xs text-gray-500 mt-1">Lesson information</p>
                </div>
                <div className={`rounded-2xl p-4 ${step === 2 ? 'bg-white border border-black' : 'bg-transparent border border-gray-200'}`}>
                  <p className="text-sm font-semibold text-gray-900">Step 2</p>
                  <p className="text-xs text-gray-500 mt-1">Rich lesson content</p>
                </div>
                <div className={`rounded-2xl p-4 ${step === 3 ? 'bg-white border border-black' : 'bg-transparent border border-gray-200'}`}>
                  <p className="text-sm font-semibold text-gray-900">Step 3</p>
                  <p className="text-xs text-gray-500 mt-1">Resources and attachments</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-900">Lesson title</label>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Enter a clear lesson title"
                      className="w-full mt-2 rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-900">Lesson summary</label>
                    <textarea
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      placeholder="A short overview students will see before they start."
                      className="w-full mt-2 min-h-[120px] rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => applyFormatting('heading')} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">Heading</button>
                      <button type="button" onClick={() => applyFormatting('bold')} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">Bold</button>
                      <button type="button" onClick={() => applyFormatting('italic')} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">Italic</button>
                      <button type="button" onClick={() => applyFormatting('bullet')} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">Bullet</button>
                      <button type="button" onClick={() => applyFormatting('number')} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">Numbered</button>
                      <button type="button" onClick={() => applyFormatting('link')} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">Link</button>
                      <button type="button" onClick={() => applyFormatting('table')} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">Table</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-900">Lesson content</label>
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Create lesson content with headings, links, bullet lists, and rich notes."
                      className="w-full mt-2 min-h-[260px] rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                      <UploadCloud className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Add resources</p>
                        <p className="text-xs text-gray-500">Include links or upload attachments for students.</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input
                        value={resourceTitle}
                        onChange={(event) => setResourceTitle(event.target.value)}
                        placeholder="Resource title"
                        className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                      />
                      <input
                        value={resourceUrl}
                        onChange={(event) => setResourceUrl(event.target.value)}
                        placeholder="Resource URL"
                        className="w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <select
                        value={resourceType}
                        onChange={(event) => setResourceType(event.target.value as ResourceType)}
                        className="w-full sm:w-48 rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
                      >
                        <option value="Video">Video</option>
                        <option value="PDF">PDF</option>
                        <option value="Document">Document</option>
                        <option value="Image">Image</option>
                        <option value="Slides">Slides</option>
                        <option value="Other">Other</option>
                      </select>
                      <div className="flex gap-3">
                        <Button type="button" onClick={addResource} className="bg-black text-white">Add link</Button>
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                          {isUploading ? 'Uploading…' : 'Upload Attachment'}
                        </Button>
                      </div>
                    </div>
                    <input
                      key={fileInputKey}
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  <div className="space-y-3 rounded-3xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Resource preview</p>
                        <p className="text-xs text-gray-500">Students will see these links inside the lesson content after creation.</p>
                      </div>
                      <span className="rounded-full bg-black px-3 py-1 text-xs font-semibold text-white">{resources.length} added</span>
                    </div>

                    {resources.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-5 text-sm text-gray-500 text-center">
                        No resources added yet. Add a link or upload a file to attach resources to the lesson.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {resources.map((resource) => (
                          <div key={resource.id} className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{resource.title}</p>
                              <p className="text-sm text-gray-500">{resource.type} • {resource.source === 'upload' ? 'Uploaded file' : 'Link'}</p>
                              <a href={resource.url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:text-indigo-800 underline break-all">{resource.url}</a>
                            </div>
                            <Button type="button" variant="ghost" onClick={() => removeResource(resource.id)} className="text-red-600 hover:text-red-800">
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div className="flex gap-3">
                  {step > 1 && (
                    <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}>
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  {step < 3 ? (
                    <Button type="button" className="bg-black text-white" onClick={() => setStep((current) => Math.min(3, current + 1))} disabled={step === 1 && !hasStepOneReady}>
                      Continue
                      <ArrowRight className="w-4 h-4" />
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
