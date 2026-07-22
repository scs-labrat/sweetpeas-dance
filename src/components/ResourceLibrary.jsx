import React, { useState } from 'react';
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
import { Plus, Edit, Trash2, Download, Video, Music, FileText, File, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_LABEL = {
  practice_video: 'Practice Videos',
  music_track: 'Music Tracks',
  recital_guide: 'Recital Guides',
  other: 'Other',
};

const CATEGORY_ICON = { practice_video: Video, music_track: Music, recital_guide: FileText, other: File };

const emptyForm = () => ({ id: null, title: '', description: '', category: 'other', file_url: '', thumbnail_url: '', is_active: true });

export default function ResourceLibrary({ isAdmin = false }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [uploading, setUploading] = useState(false);

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => (isAdmin ? base44.entities.ResourceItem.list('-created_date') : base44.entities.ResourceItem.filter({ is_active: true })),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      delete payload.id;
      return form.id ? base44.entities.ResourceItem.update(form.id, payload) : base44.entities.ResourceItem.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      setShowDialog(false);
      setForm(emptyForm());
      toast.success('Resource saved');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ResourceItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['resources']);
      toast.success('Resource deleted');
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      setForm((prev) => ({ ...prev, file_url: uploaded?.file_url || prev.file_url }));
      toast.success('File uploaded');
    } catch {
      toast.error('Upload failed — you can paste a URL instead');
    }
    setUploading(false);
  };

  const openCreateDialog = () => {
    setForm(emptyForm());
    setShowDialog(true);
  };

  const openEditDialog = (resource) => {
    setForm({
      id: resource.id,
      title: resource.title,
      description: resource.description || '',
      category: resource.category || 'other',
      file_url: resource.file_url,
      thumbnail_url: resource.thumbnail_url || '',
      is_active: resource.is_active,
    });
    setShowDialog(true);
  };

  const grouped = resources.reduce((acc, r) => {
    const key = r.category || 'other';
    acc[key] = acc[key] || [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-rose-800">Resource Library</CardTitle>
          <CardDescription>Practice videos, music tracks, and recital guides</CardDescription>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="bg-rose-600 hover:bg-rose-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Resource
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.keys(CATEGORY_LABEL).map((category) => {
          const items = grouped[category] || [];
          if (items.length === 0) return null;
          const Icon = CATEGORY_ICON[category];
          return (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {CATEGORY_LABEL[category]}
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border border-rose-100 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{item.title}</p>
                      {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
                      {isAdmin && !item.is_active && <Badge className="bg-gray-100 text-gray-600 mt-1">Hidden</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteMutation.mutate(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {resources.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No resources yet</p>}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice_video">Practice Video</SelectItem>
                  <SelectItem value="music_track">Music Track</SelectItem>
                  <SelectItem value="recital_guide">Recital Guide</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File</Label>
              <div className="flex items-center gap-2">
                <Input value={form.file_url} onChange={(e) => setForm({ ...form, file_url: e.target.value })} placeholder="https://... or upload below" />
              </div>
              <label className="flex items-center gap-2 text-sm text-rose-600 cursor-pointer mt-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Upload a file instead
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="resource-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="resource-active">Visible to members</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" disabled={!form.title || !form.file_url} onClick={() => saveMutation.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
