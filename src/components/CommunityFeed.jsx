import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageSquare, Trash2, ImagePlus, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function CommunityFeed({ currentUserEmail, currentUserName, isAdmin = false }) {
  const queryClient = useQueryClient();
  const [composerText, setComposerText] = useState('');
  const [composerImageFile, setComposerImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [commentDrafts, setCommentDrafts] = useState({});

  const { data: posts = [] } = useQuery({
    queryKey: ['communityPosts'],
    queryFn: () => base44.entities.CommunityPost.list('-created_date'),
    refetchInterval: 20000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['communityComments'],
    queryFn: () => base44.entities.CommunityComment.list(),
    refetchInterval: 20000,
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      let image_url = '';
      if (composerImageFile) {
        setUploading(true);
        const uploaded = await base44.integrations.Core.UploadFile({ file: composerImageFile });
        image_url = uploaded?.file_url || '';
      }
      return base44.entities.CommunityPost.create({
        author_email: currentUserEmail,
        author_name: currentUserName,
        is_studio_post: isAdmin,
        content: composerText,
        image_url,
        liked_by: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['communityPosts']);
      setComposerText('');
      setComposerImageFile(null);
      setUploading(false);
      toast.success('Posted!');
    },
    onError: () => {
      setUploading(false);
      toast.error('Failed to post');
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: (post) => {
      const liked = post.liked_by || [];
      const nextLiked = liked.includes(currentUserEmail) ? liked.filter((e) => e !== currentUserEmail) : [...liked, currentUserEmail];
      return base44.entities.CommunityPost.update(post.id, { liked_by: nextLiked });
    },
    onSuccess: () => queryClient.invalidateQueries(['communityPosts']),
  });

  const deletePostMutation = useMutation({
    mutationFn: (post) => base44.entities.CommunityPost.delete(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['communityPosts']);
      toast.success('Post removed');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }) =>
      base44.entities.CommunityComment.create({ post_id: postId, author_email: currentUserEmail, author_name: currentUserName, content }),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries(['communityComments']);
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (comment) => base44.entities.CommunityComment.delete(comment.id),
    onSuccess: () => queryClient.invalidateQueries(['communityComments']),
  });

  const canModerate = (item) => isAdmin || item.author_email === currentUserEmail;

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-rose-800">Community Feed</CardTitle>
        <CardDescription>Share photos, encouragement, and milestones with the Sweetpeas community</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Composer */}
        <div className="space-y-2 border border-rose-100 rounded-lg p-4">
          <Textarea
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            placeholder={isAdmin ? "Share an update with the community..." : "Share a photo, some encouragement, or a milestone..."}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <ImagePlus className="w-4 h-4" />
              {composerImageFile ? composerImageFile.name : 'Add a photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setComposerImageFile(e.target.files?.[0] || null)}
              />
            </label>
            <Button
              onClick={() => createPostMutation.mutate()}
              disabled={!composerText.trim() || uploading}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Post
            </Button>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {posts.map((post) => {
            const postComments = comments.filter((c) => c.post_id === post.id);
            const liked = (post.liked_by || []).includes(currentUserEmail);
            return (
              <Card key={post.id} className="border-rose-200/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{post.author_name || post.author_email}</p>
                      {post.is_studio_post && <Badge className="bg-rose-100 text-rose-700">Studio</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {post.created_date ? formatDistanceToNow(new Date(post.created_date), { addSuffix: true }) : ''}
                      </span>
                      {canModerate(post) && (
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => deletePostMutation.mutate(post)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                  {post.image_url && <img src={post.image_url} alt="" className="w-full max-h-96 object-cover rounded-lg" />}
                  <div className="flex items-center gap-4 pt-1">
                    <button
                      onClick={() => toggleLikeMutation.mutate(post)}
                      className={`flex items-center gap-1 text-sm ${liked ? 'text-rose-600' : 'text-gray-500'} hover:text-rose-600 transition-colors`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? 'fill-rose-600' : ''}`} />
                      {(post.liked_by || []).length || ''}
                    </button>
                    <button
                      onClick={() => setOpenComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-rose-600 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {postComments.length || ''}
                    </button>
                  </div>

                  {openComments[post.id] && (
                    <div className="space-y-2 pt-2 border-t border-rose-100">
                      {postComments.map((comment) => (
                        <div key={comment.id} className="flex items-start justify-between bg-rose-50 rounded px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium text-gray-800">{comment.author_name || comment.author_email}: </span>
                            <span className="text-gray-700">{comment.content}</span>
                          </div>
                          {canModerate(comment) && (
                            <button onClick={() => deleteCommentMutation.mutate(comment)} className="text-gray-400 hover:text-red-600 ml-2">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          value={commentDrafts[post.id] || ''}
                          onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a comment..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && commentDrafts[post.id]?.trim()) {
                              addCommentMutation.mutate({ postId: post.id, content: commentDrafts[post.id] });
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!commentDrafts[post.id]?.trim()}
                          onClick={() => addCommentMutation.mutate({ postId: post.id, content: commentDrafts[post.id] })}
                        >
                          Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {posts.length === 0 && (
            <p className="text-center text-gray-500 py-8 text-sm">No posts yet — be the first to share something!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
