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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { renderBlocksToHtml, newBlockId, stripBlockIds } from '@/lib/blockRenderer';
import {
  Heading1,
  AlignLeft,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  GripVertical,
  Trash2,
  Edit,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';

const BLOCK_DEFS = {
  heading: { label: 'Heading', icon: Heading1, defaults: { type: 'heading', text: 'Headline goes here', alignment: 'center' } },
  paragraph: { label: 'Paragraph', icon: AlignLeft, defaults: { type: 'paragraph', text: 'Tell parents why this offer is worth taking...', alignment: 'center' } },
  image: { label: 'Image', icon: ImageIcon, defaults: { type: 'image', url: '', text: 'Image description', alignment: 'center' } },
  button: { label: 'Button', icon: MousePointerClick, defaults: { type: 'button', text: 'Learn More', url: '', alignment: 'center' } },
  divider: { label: 'Divider', icon: Minus, defaults: { type: 'divider' } },
};

const slugify = (text) =>
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const emptyForm = () => ({ id: null, slug: '', title: '', cta_text: 'Claim My Spot', promo_code: '', blocks: [], status: 'draft' });

export default function LandingPageBuilder() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const { data: pages = [] } = useQuery({ queryKey: ['landingPages'], queryFn: () => base44.entities.LandingPage.list('-created_date') });
  const { data: promoCodes = [] } = useQuery({ queryKey: ['promoCodes'], queryFn: () => base44.entities.PromoCode.filter({ is_active: true }) });

  const resetBuilder = () => {
    setForm(emptyForm());
    setSlugManuallyEdited(false);
  };

  const loadPage = (page) => {
    setForm({
      id: page.id,
      slug: page.slug,
      title: page.title,
      cta_text: page.cta_text || 'Claim My Spot',
      promo_code: page.promo_code || '',
      blocks: (page.blocks || []).map((b) => ({ ...b, id: newBlockId() })),
      status: page.status,
    });
    setSlugManuallyEdited(true);
  };

  const handleTitleChange = (title) => {
    setForm((prev) => ({ ...prev, title, slug: slugManuallyEdited ? prev.slug : slugify(title) }));
  };

  const addBlock = (type) => setForm((prev) => ({ ...prev, blocks: [...prev.blocks, { id: newBlockId(), ...BLOCK_DEFS[type].defaults }] }));
  const updateBlock = (id, changes) =>
    setForm((prev) => ({ ...prev, blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...changes } : b)) }));
  const removeBlock = (id) => setForm((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    setForm((prev) => {
      const blocks = [...prev.blocks];
      const [moved] = blocks.splice(result.source.index, 1);
      blocks.splice(result.destination.index, 0, moved);
      return { ...prev, blocks };
    });
  };

  const savePageMutation = useMutation({
    mutationFn: (status) => {
      const payload = {
        slug: form.slug,
        title: form.title,
        cta_text: form.cta_text,
        promo_code: form.promo_code || undefined,
        blocks: stripBlockIds(form.blocks),
        status,
      };
      return form.id ? base44.entities.LandingPage.update(form.id, payload) : base44.entities.LandingPage.create(payload);
    },
    onSuccess: (saved, status) => {
      queryClient.invalidateQueries(['landingPages']);
      setForm((prev) => ({ ...prev, id: saved.id }));
      toast.success(status === 'published' ? 'Page published!' : 'Draft saved');
    },
    onError: () => toast.error('Failed to save — is the slug already taken?'),
  });

  const deletePageMutation = useMutation({
    mutationFn: (id) => base44.entities.LandingPage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['landingPages']);
      toast.success('Page deleted');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.LandingPage.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['landingPages']),
  });

  const copyLink = (slug) => {
    const url = `${window.location.origin}/promo?page=${slug}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  };

  const previewHtml = renderBlocksToHtml(form.blocks);

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800">Landing Page Builder</CardTitle>
          <CardDescription>Create a targeted page for a free trial class, open day, or seasonal offer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Page Title</Label>
              <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Free Trial Class" />
            </div>
            <div>
              <Label>URL Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setForm({ ...form, slug: slugify(e.target.value) });
                }}
                placeholder="free-trial"
              />
              <p className="text-xs text-gray-500 mt-1">/promo?page={form.slug || '...'}</p>
            </div>
            <div>
              <Label>Button Text</Label>
              <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Auto-apply Promo Code (optional)</Label>
            <Select value={form.promo_code || 'none'} onValueChange={(value) => setForm({ ...form, promo_code: value === 'none' ? '' : value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {promoCodes.map((p) => (
                  <SelectItem key={p.id} value={p.code}>{p.code} — {p.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(BLOCK_DEFS).map(([type, def]) => {
              const Icon = def.icon;
              return (
                <Button key={type} size="sm" variant="outline" onClick={() => addBlock(type)}>
                  <Icon className="w-4 h-4 mr-1" />
                  {def.label}
                </Button>
              );
            })}
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="landing-blocks">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {form.blocks.map((block, index) => (
                    <Draggable key={block.id} draggableId={block.id} index={index}>
                      {(dragProvided) => (
                        <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} className="flex items-start gap-2 p-3 border border-rose-100 rounded-lg bg-white">
                          <div {...dragProvided.dragHandleProps} className="pt-2 text-gray-400 cursor-grab">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="capitalize">{block.type}</Badge>
                              {block.type !== 'divider' && (
                                <Select value={block.alignment || 'left'} onValueChange={(value) => updateBlock(block.id, { alignment: value })}>
                                  <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            {(block.type === 'heading' || block.type === 'paragraph') && (
                              <Textarea value={block.text || ''} onChange={(e) => updateBlock(block.id, { text: e.target.value })} rows={block.type === 'heading' ? 1 : 3} />
                            )}
                            {block.type === 'image' && (
                              <div className="grid md:grid-cols-2 gap-2">
                                <Input value={block.url || ''} onChange={(e) => updateBlock(block.id, { url: e.target.value })} placeholder="Image URL" />
                                <Input value={block.text || ''} onChange={(e) => updateBlock(block.id, { text: e.target.value })} placeholder="Alt text" />
                              </div>
                            )}
                            {block.type === 'button' && (
                              <div className="grid md:grid-cols-2 gap-2">
                                <Input value={block.text || ''} onChange={(e) => updateBlock(block.id, { text: e.target.value })} placeholder="Button text" />
                                <Input value={block.url || ''} onChange={(e) => updateBlock(block.id, { url: e.target.value })} placeholder="Link URL" />
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => removeBlock(block.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {form.blocks.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-8 border border-dashed border-rose-200 rounded-lg">
                      Add a block above to start building your page
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {form.blocks.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500">Preview</Label>
              <div className="border border-rose-100 rounded-lg p-6 bg-white" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => savePageMutation.mutate('published')}
              disabled={!form.title || !form.slug || form.blocks.length === 0}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              Publish
            </Button>
            <Button variant="outline" onClick={() => savePageMutation.mutate('draft')} disabled={!form.title || !form.slug}>
              Save as Draft
            </Button>
            {(form.id || form.blocks.length > 0) && (
              <Button variant="outline" onClick={resetBuilder}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800">Your Landing Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-3 border border-rose-100 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{page.title}</p>
                  <p className="text-xs text-gray-500">
                    /promo?page={page.slug} · {page.view_count || 0} views · {page.submission_count || 0} leads
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={page.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{page.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => copyLink(page.slug)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleStatusMutation.mutate({ id: page.id, status: page.status === 'published' ? 'draft' : 'published' })}
                  >
                    {page.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => loadPage(page)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={() => {
                      if (confirm('Delete this landing page?')) deletePageMutation.mutate(page.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {pages.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No landing pages yet</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
