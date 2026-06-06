import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from './ui/Toast';
import { Card, Button } from './ui/Card';
import { LayoutTemplate, MessageSquare, Image as ImageIcon, Plus, Trash, Edit, Upload } from 'lucide-react';
import * as cfApi from '../services/cfApi';
import type { CmsPage, CmsFaq, CmsBanner } from '../services/cfApi';

const VIEW_META: Record<string, { title: string; description: string; icon: typeof LayoutTemplate }> = {
  pages: { title: 'CMS Pages', description: 'Manage static website pages for your institution portal.', icon: LayoutTemplate },
  faqs: { title: 'FAQs', description: 'Frequently asked questions shown to students and visitors.', icon: MessageSquare },
  banners: { title: 'Banners', description: 'Hero banners and promotional images (stored in R2).', icon: ImageIcon },
};

interface ContentManagementProps {
  initialView?: string;
}

export function ContentManagement({ initialView = 'pages' }: ContentManagementProps) {
  const { institutionId } = useAuth();
  const toast = useToast();
  const view = (initialView in VIEW_META ? initialView : 'pages') as keyof typeof VIEW_META;
  const meta = VIEW_META[view];

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [faqs, setFaqs] = useState<CmsFaq[]>([]);
  const [banners, setBanners] = useState<CmsBanner[]>([]);
  const [uploading, setUploading] = useState(false);

  const [pageForm, setPageForm] = useState({ title: '', slug: '', body: '', published: false });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '' });
  const [bannerForm, setBannerForm] = useState({ title: '', body: '', linkUrl: '', imageR2Key: '', active: true });
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  useEffect(() => {
    if (institutionId) fetchData();
  }, [institutionId, view]);

  const fetchData = async () => {
    if (!institutionId) return;
    setLoading(true);
    try {
      if (view === 'pages') setPages(await cfApi.listCmsPages(institutionId));
      if (view === 'faqs') setFaqs(await cfApi.listCmsFaqs(institutionId));
      if (view === 'banners') setBanners(await cfApi.listCmsBanners(institutionId));
    } catch (err) {
      console.error('CMS fetch failed:', err);
      toast.error('Could not load CMS content.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId || !pageForm.title) return;
    try {
      if (editingPageId) {
        await cfApi.updateCmsPage(institutionId, editingPageId, pageForm);
        toast.success('Page updated.');
      } else {
        await cfApi.createCmsPage(institutionId, pageForm);
        toast.success('Page created.');
      }
      setPageForm({ title: '', slug: '', body: '', published: false });
      setEditingPageId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Could not save page.');
    }
  };

  const handleFaqSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId || !faqForm.question || !faqForm.answer) return;
    try {
      await cfApi.createCmsFaq(institutionId, faqForm);
      setFaqForm({ question: '', answer: '' });
      toast.success('FAQ added.');
      fetchData();
    } catch (err) {
      toast.error('Could not save FAQ.');
    }
  };

  const handleBannerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!institutionId || !bannerForm.title) return;
    try {
      await cfApi.createCmsBanner(institutionId, {
        title: bannerForm.title,
        body: bannerForm.body,
        linkUrl: bannerForm.linkUrl,
        imageR2Key: bannerForm.imageR2Key || undefined,
        active: bannerForm.active,
      });
      setBannerForm({ title: '', body: '', linkUrl: '', imageR2Key: '', active: true });
      toast.success('Banner created.');
      fetchData();
    } catch (err) {
      toast.error('Could not save banner.');
    }
  };

  const handleBannerImage = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await cfApi.uploadFile(file, `banners/${Date.now()}-${file.name}`);
      setBannerForm((prev) => ({ ...prev, imageR2Key: uploaded.key }));
      toast.success('Image uploaded to R2.');
    } catch (err) {
      toast.error('Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const Icon = meta.icon;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 rounded-2xl">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{meta.title}</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">{meta.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title={`All ${meta.title}`}>
            {loading ? (
              <div className="h-48 bg-gray-50 rounded-2xl animate-pulse mt-4" />
            ) : view === 'pages' ? (
              <div className="space-y-3 mt-4">
                {pages.length === 0 && <p className="text-sm text-gray-500">No pages yet.</p>}
                {pages.map((page) => (
                  <div key={page.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                    <div>
                      <p className="font-bold text-sm">{page.title}</p>
                      <p className="text-xs text-gray-400">/{page.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${page.published ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {page.published ? 'Published' : 'Draft'}
                      </span>
                      <button onClick={() => { setEditingPageId(page.id); setPageForm({ title: page.title, slug: page.slug, body: page.body || '', published: !!page.published }); }} className="text-gray-400 hover:text-black"><Edit className="w-4 h-4" /></button>
                      <button onClick={async () => { await cfApi.deleteCmsPage(institutionId!, page.id); fetchData(); }} className="text-gray-400 hover:text-red-600"><Trash className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : view === 'faqs' ? (
              <div className="space-y-3 mt-4">
                {faqs.length === 0 && <p className="text-sm text-gray-500">No FAQs yet.</p>}
                {faqs.map((faq) => (
                  <div key={faq.id} className="p-4 border border-gray-100 rounded-xl">
                    <p className="font-bold text-sm">{faq.question}</p>
                    <p className="text-xs text-gray-500 mt-2">{faq.answer}</p>
                    <button onClick={async () => { await cfApi.deleteCmsFaq(institutionId!, faq.id); fetchData(); }} className="text-xs text-red-500 mt-2">Delete</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {banners.length === 0 && <p className="text-sm text-gray-500">No banners yet.</p>}
                {banners.map((banner) => (
                  <div key={banner.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl">
                    {banner.imageUrl && <img src={banner.imageUrl} alt="" className="w-20 h-14 object-cover rounded-lg" />}
                    <div className="flex-1">
                      <p className="font-bold text-sm">{banner.title}</p>
                      <p className="text-xs text-gray-500">{banner.body}</p>
                    </div>
                    <button onClick={async () => { await cfApi.deleteCmsBanner(institutionId!, banner.id); fetchData(); }} className="text-gray-400 hover:text-red-600"><Trash className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title={view === 'pages' && editingPageId ? 'Edit Page' : `Add ${meta.title.slice(0, -1)}`}>
            {view === 'pages' && (
              <form onSubmit={handlePageSubmit} className="space-y-3 mt-4">
                <input value={pageForm.title} onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm" required />
                <input value={pageForm.slug} onChange={(e) => setPageForm({ ...pageForm, slug: e.target.value })} placeholder="slug (optional)" className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm" />
                <textarea value={pageForm.body} onChange={(e) => setPageForm({ ...pageForm, body: e.target.value })} placeholder="Body content" rows={4} className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pageForm.published} onChange={(e) => setPageForm({ ...pageForm, published: e.target.checked })} />
                  Published
                </label>
                <Button type="submit" className="w-full bg-black text-white gap-2"><Plus className="w-4 h-4" /> {editingPageId ? 'Update' : 'Create'} Page</Button>
              </form>
            )}
            {view === 'faqs' && (
              <form onSubmit={handleFaqSubmit} className="space-y-3 mt-4">
                <input value={faqForm.question} onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })} placeholder="Question" className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm" required />
                <textarea value={faqForm.answer} onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })} placeholder="Answer" rows={4} className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm" required />
                <Button type="submit" className="w-full bg-black text-white gap-2"><Plus className="w-4 h-4" /> Add FAQ</Button>
              </form>
            )}
            {view === 'banners' && (
              <form onSubmit={handleBannerSubmit} className="space-y-3 mt-4">
                <input value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm" required />
                <textarea value={bannerForm.body} onChange={(e) => setBannerForm({ ...bannerForm, body: e.target.value })} placeholder="Body text" rows={2} className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm" />
                <input value={bannerForm.linkUrl} onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })} placeholder="Link URL" className="w-full px-3 py-2 border border-gray-100 rounded-xl text-sm" />
                <label className="block">
                  <span className="text-xs font-bold text-gray-400 uppercase">Banner Image (R2)</span>
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBannerImage(f); }} className="w-full mt-1 text-sm" />
                </label>
                {bannerForm.imageR2Key && <p className="text-[10px] text-green-600 truncate">Uploaded: {bannerForm.imageR2Key}</p>}
                <Button type="submit" disabled={uploading} className="w-full bg-black text-white gap-2">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Create Banner'}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
