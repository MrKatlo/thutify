import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as cfApi from '../services/cfApi';
import { Card } from './ui/Card';

// Sub-components
import { DiscussionList } from './discussions/DiscussionList';
import { DiscussionThread } from './discussions/DiscussionThread';

export function Discussions() {
  const { profile, institutionId } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [profile, institutionId]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchDiscussions();
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedDiscussion) {
      fetchPosts();
    }
  }, [selectedDiscussion]);

  const fetchCourses = async () => {
    if (!institutionId) return;
    try {
      const list = await cfApi.listCourses(institutionId);
      setCourses(list);
      if (list.length > 0) {
        setSelectedCourseId(list[0].id);
      }
    } catch (err) {
      console.error("Fetch courses failed:", err);
    }
  };

  const fetchDiscussions = async () => {
    if (!institutionId || !selectedCourseId) return;
    setLoading(true);
    try {
      const list = await cfApi.listDiscussions(institutionId, selectedCourseId);
      setDiscussions(list);
    } catch (err) {
      console.error("Fetch discussions failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!institutionId || !selectedDiscussion) return;
    setPostsLoading(true);
    try {
      const list = await cfApi.listDiscussionPosts(institutionId, selectedDiscussion.id);
      setPosts(list);
    } catch (err) {
      console.error("Fetch posts failed:", err);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleCreateDiscussion = async (title: string) => {
    if (!institutionId || !selectedCourseId) return;
    try {
      await cfApi.createDiscussion(institutionId, selectedCourseId, title);
      fetchDiscussions();
    } catch (err) {
      console.error("Create discussion failed:", err);
    }
  };

  const handleCreatePost = async (content: string) => {
    if (!institutionId || !selectedDiscussion) return;
    try {
      await cfApi.createDiscussionPost(institutionId, selectedDiscussion.id, content);
      fetchPosts();
    } catch (err) {
      console.error("Create post failed:", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!institutionId || !selectedDiscussion) return;
    if (!confirm("Delete this post?")) return;
    try {
      await cfApi.deleteDiscussionPost(institutionId, selectedDiscussion.id, postId);
      fetchPosts();
    } catch (err) {
      console.error("Delete post failed:", err);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Collaboration Hub</h1>
        <p className="text-gray-500 mt-1 font-medium text-sm">Join the conversation with peers and instructors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card title="Course Filter">
            <div className="space-y-2 mt-4">
              {courses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCourseId(c.id); setSelectedDiscussion(null); }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedCourseId === c.id ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <p className="font-bold text-xs text-gray-900">{c.course_name || c.title}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {selectedDiscussion ? (
            <DiscussionThread 
              discussion={selectedDiscussion}
              posts={posts}
              onBack={() => setSelectedDiscussion(null)}
              onReply={handleCreatePost}
              onDeletePost={handleDeletePost}
              currentUserId={profile?.uid || ''}
              isTeacher={profile?.role === 'teacher' || profile?.role === 'admin' || profile?.role === 'owner'}
            />
          ) : (
            <DiscussionList 
              discussions={discussions}
              onCreate={handleCreateDiscussion}
              onSelect={setSelectedDiscussion}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
