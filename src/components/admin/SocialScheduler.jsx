import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PLATFORM_COMPOSE_URL = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  tiktok: 'https://www.tiktok.com/upload',
};

const PLATFORM_LABEL = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' };

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  posted: 'bg-green-100 text-green-700',
};

const emptyPostForm = () => ({ id: null, platform: 'instagram', caption: '', media_url: '', scheduled_date: '' });

export default function SocialScheduler() {
  const queryClient = useQueryClient();
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [postForm, setPostForm] = useState(emptyPostForm());
  const [showMarkPostedDialog, setShowMarkPostedDialog] = useState(false);
  const [markPostedTarget, setMarkPostedTarget] = useState(null);
  const [markPostedForm, setMarkPostedForm] = useState({ post_url: '', show_on_wall: false });

  const { data: socialPosts = [] } = useQuery({ queryKey: ['socialPosts'], queryFn: () => base44.entities.SocialPost.list('-scheduled_date') });
  const { data: studioInfoList = [] } = useQuery({ queryKey: ['studioInfo'], queryFn: () => base44.entities.StudioInfo.list() });
  const studio = studioInfoList[0];

  const [linksForm, setLinksForm] = useState({ facebook_page_url: '', instagram_handle: '', tiktok_handle: '' });

  useEffect(() => {
    if (studio) {
      setLinksForm({
        facebook_page_url: studio.facebook_page_url || '',
        instagram_handle: studio.instagram_handle || '',
        tiktok_handle: studio.tiktok_handle || '',
      });
    }
  }, [studio]);

  const saveLinksMutation = useMutation({
    mutationFn: () => (studio ? base44.entities.StudioInfo.update(studio.id, linksForm) : base44.entities.StudioInfo.create(linksForm)),
    onSuccess: () => {
      queryClient.invalidateQueries(['studioInfo']);
      toast.success('Social links saved');
    },
  });

  const savePostMutation = useMutation({
    mutationFn: () => {
      const payload = {
        platform: postForm.platform,
        caption: postForm.caption,
        media_url: postForm.media_url,
        scheduled_date: postForm.scheduled_date || undefined,
        status: postForm.scheduled_date ? 'scheduled' : 'draft',
      };
      return postForm.id ? base44.entities.SocialPost.update(postForm.id, payload) : base44.entities.SocialPost.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['socialPosts']);
      setShowPostDialog(false);
      setPostForm(emptyPostForm());
      toast.success('Saved to content calendar');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id) => base44.entities.SocialPost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['socialPosts']);
      toast.success('Removed from calendar');
    },
  });

  const markPostedMutation = useMutation({
    mutationFn: () =>
      base44.entities.SocialPost.update(markPostedTarget.id, {
        status: 'posted',
        post_url: markPostedForm.post_url,
        show_on_wall: markPostedForm.show_on_wall,
        posted_date: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['socialPosts']);
      queryClient.invalidateQueries(['featuredSocialPosts']);
      setShowMarkPostedDialog(false);
      setMarkPostedTarget(null);
      toast.success('Marked as posted');
    },
  });

  const openCreateDialog = () => {
    setPostForm(emptyPostForm());
    setShowPostDialog(true);
  };

  const openEditDialog = (post) => {
    setPostForm({
      id: post.id,
      platform: post.platform,
      caption: post.caption,
      media_url: post.media_url || '',
      scheduled_date: post.scheduled_date || '',
    });
    setShowPostDialog(true);
  };

  const handleCopyAndOpen = async (post) => {
    try {
      await navigator.clipboard.writeText(post.caption);
      toast.success('Caption copied to clipboard');
    } catch {
      toast.info('Could not copy automatically — caption is shown below to copy manually');
    }
    window.open(PLATFORM_COMPOSE_URL[post.platform], '_blank', 'noopener,noreferrer');
  };

  const openMarkPostedDialog = (post) => {
    setMarkPostedTarget(post);
    setMarkPostedForm({ post_url: '', show_on_wall: false });
    setShowMarkPostedDialog(true);
  };

  const columns = ['draft', 'scheduled', 'posted'];

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800">Social Links</CardTitle>
          <CardDescription>Used for the live Facebook feed and share links across the site</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Facebook Page URL</Label>
              <Input
                value={linksForm.facebook_page_url}
                onChange={(e) => setLinksForm({ ...linksForm, facebook_page_url: e.target.value })}
                placeholder="https://www.facebook.com/yourpage"
              />
            </div>
            <div>
              <Label>Instagram Handle</Label>
              <Input
                value={linksForm.instagram_handle}
                onChange={(e) => setLinksForm({ ...linksForm, instagram_handle: e.target.value })}
                placeholder="sweetpeasdance"
              />
            </div>
            <div>
              <Label>TikTok Handle</Label>
              <Input
                value={linksForm.tiktok_handle}
                onChange={(e) => setLinksForm({ ...linksForm, tiktok_handle: e.target.value })}
                placeholder="sweetpeasdance"
              />
            </div>
          </div>
          <Button size="sm" onClick={() => saveLinksMutation.mutate()} className="bg-rose-600 hover:bg-rose-700">
            Save Links
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-rose-800">Content Calendar</CardTitle>
            <CardDescription>
              Plan posts here, then post them yourself on each platform (auto-publish needs a Meta/TikTok developer app — see notes).
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} className="bg-rose-600 hover:bg-rose-700">
            <Plus className="w-4 h-4 mr-2" />
            Plan a Post
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {columns.map((status) => (
              <div key={status} className="space-y-3">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{status}</p>
                {socialPosts.filter((p) => p.status === status).map((post) => (
                  <Card key={post.id} className="border-rose-200/50">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className={STATUS_STYLES[post.status]}>{PLATFORM_LABEL[post.platform]}</Badge>
                        {post.scheduled_date && (
                          <span className="text-xs text-gray-500">{format(new Date(post.scheduled_date), 'MMM d, h:mm a')}</span>
                        )}
                      </div>
                      {post.media_url && <img src={post.media_url} alt="" className="w-full h-24 object-cover rounded" />}
                      <p className="text-sm text-gray-700 line-clamp-3">{post.caption}</p>
                      {post.status === 'posted' && post.post_url && (
                        <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-600 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> View live post
                        </a>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {post.status !== 'posted' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleCopyAndOpen(post)}>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy & Open
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(post)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-green-700" onClick={() => openMarkPostedDialog(post)}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Mark Posted
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('Remove this post from the calendar?')) deletePostMutation.mutate(post.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {socialPosts.filter((p) => p.status === status).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">Nothing here</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Post Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{postForm.id ? 'Edit Post' : 'Plan a Post'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Platform</Label>
              <Select value={postForm.platform} onValueChange={(value) => setPostForm({ ...postForm, platform: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Caption</Label>
              <Textarea value={postForm.caption} onChange={(e) => setPostForm({ ...postForm, caption: e.target.value })} rows={4} />
            </div>
            <div>
              <Label>Photo/Video URL</Label>
              <Input value={postForm.media_url} onChange={(e) => setPostForm({ ...postForm, media_url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <Label>Scheduled For (leave blank to save as a draft)</Label>
              <Input
                type="datetime-local"
                value={postForm.scheduled_date}
                onChange={(e) => setPostForm({ ...postForm, scheduled_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPostDialog(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" disabled={!postForm.caption} onClick={() => savePostMutation.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Posted Dialog */}
      <Dialog open={showMarkPostedDialog} onOpenChange={setShowMarkPostedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Posted</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Paste the live link once you&apos;ve posted it, so we can feature it on the member portal&apos;s Social Wall.</p>
            <div>
              <Label>Live Post URL</Label>
              <Input
                value={markPostedForm.post_url}
                onChange={(e) => setMarkPostedForm({ ...markPostedForm, post_url: e.target.value })}
                placeholder="https://www.instagram.com/p/..."
              />
            </div>
            {(markPostedTarget?.platform === 'instagram' || markPostedTarget?.platform === 'tiktok') && (
              <div className="flex items-center gap-2">
                <input
                  id="show-on-wall"
                  type="checkbox"
                  checked={markPostedForm.show_on_wall}
                  onChange={(e) => setMarkPostedForm({ ...markPostedForm, show_on_wall: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="show-on-wall">Feature on the member portal&apos;s Social Wall</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkPostedDialog(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => markPostedMutation.mutate()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
