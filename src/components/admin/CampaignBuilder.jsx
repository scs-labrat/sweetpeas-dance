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
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Heading1,
  AlignLeft,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  GripVertical,
  Plus,
  Trash2,
  Send,
  Save,
  LayoutTemplate,
  Copy,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { renderBlocksToHtml, newBlockId, stripBlockIds } from '@/lib/blockRenderer';

const STARTER_TEMPLATES = [
  {
    key: 'class_update',
    title: 'Class Update',
    category: 'class_update',
    subject: "An update about your dancer's class",
    blocks: [
      { type: 'heading', text: 'Class Update', alignment: 'left' },
      { type: 'paragraph', text: "Hi there! We wanted to share an update about your dancer's class...", alignment: 'left' },
      { type: 'divider' },
      { type: 'paragraph', text: 'If you have any questions, just reply to this email — we\'re happy to help!', alignment: 'left' },
    ],
  },
  {
    key: 'event_invitation',
    title: 'Event Invitation',
    category: 'event_invitation',
    subject: "You're invited! 🌸",
    blocks: [
      { type: 'heading', text: "You're Invited!", alignment: 'center' },
      { type: 'paragraph', text: 'Join us for a special event at Sweetpeas Dance Studio.', alignment: 'center' },
      { type: 'button', text: 'Learn More', url: '', alignment: 'center' },
      { type: 'paragraph', text: 'We hope to see you and your little dancer there!', alignment: 'center' },
    ],
  },
  {
    key: 'term_announcement',
    title: 'Term Announcement',
    category: 'term_announcement',
    subject: 'New term starting soon!',
    blocks: [
      { type: 'heading', text: 'New Term Starting Soon', alignment: 'left' },
      { type: 'paragraph', text: 'Registrations are now open for our upcoming term. Secure your spot today!', alignment: 'left' },
      { type: 'button', text: 'Register Now', url: '', alignment: 'left' },
    ],
  },
];

const BLOCK_DEFS = {
  heading: { label: 'Heading', icon: Heading1, defaults: { type: 'heading', text: 'Heading text', alignment: 'left' } },
  paragraph: { label: 'Paragraph', icon: AlignLeft, defaults: { type: 'paragraph', text: 'Write your message here...', alignment: 'left' } },
  image: { label: 'Image', icon: ImageIcon, defaults: { type: 'image', url: '', text: 'Image description', alignment: 'center' } },
  button: { label: 'Button', icon: MousePointerClick, defaults: { type: 'button', text: 'Click Here', url: '', alignment: 'center' } },
  divider: { label: 'Divider', icon: Minus, defaults: { type: 'divider' } },
};

const emptyForm = () => ({ id: null, name: '', subject: '', blocks: [], segment: 'all', classId: '', skillLevel: 'beginner' });

export default function CampaignBuilder() {
  const queryClient = useQueryClient();
  const [campaignForm, setCampaignForm] = useState(emptyForm());
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [saveTemplateTitle, setSaveTemplateTitle] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false });
  const { data: classSchedules = [] } = useQuery({ queryKey: ['classSchedules'], queryFn: () => base44.entities.ClassSchedule.list() });
  const { data: dancers = [] } = useQuery({ queryKey: ['dancers'], queryFn: () => base44.entities.DancerProfile.list() });
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments'], queryFn: () => base44.entities.Enrollment.list() });
  const { data: parentProfiles = [] } = useQuery({ queryKey: ['parentProfiles'], queryFn: () => base44.entities.ParentProfile.list() });
  const { data: customTemplates = [] } = useQuery({ queryKey: ['emailTemplates'], queryFn: () => base44.entities.EmailTemplate.list('-created_date') });
  const { data: campaigns = [] } = useQuery({ queryKey: ['emailCampaigns'], queryFn: () => base44.entities.EmailCampaign.list('-created_date') });

  const resetBuilder = () => setCampaignForm(emptyForm());

  const loadTemplate = (template) => {
    setCampaignForm({
      id: null,
      name: template.title,
      subject: template.subject || '',
      blocks: (template.blocks || []).map((b) => ({ ...b, id: newBlockId() })),
      segment: 'all',
      classId: '',
      skillLevel: 'beginner',
    });
  };

  const loadCampaign = (campaign, asCopy = false) => {
    setCampaignForm({
      id: asCopy ? null : campaign.id,
      name: asCopy ? `${campaign.name} (Copy)` : campaign.name,
      subject: campaign.subject,
      blocks: (campaign.blocks || []).map((b) => ({ ...b, id: newBlockId() })),
      segment: campaign.segment || 'all',
      classId: campaign.class_schedule_id || '',
      skillLevel: campaign.skill_level || 'beginner',
    });
    toast.info(asCopy ? 'Loaded as a new copy — edit and send' : 'Loaded draft into builder');
  };

  const addBlock = (type) => {
    setCampaignForm((prev) => ({
      ...prev,
      blocks: [...prev.blocks, { id: newBlockId(), ...BLOCK_DEFS[type].defaults }],
    }));
  };

  const updateBlock = (id, changes) => {
    setCampaignForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...changes } : b)),
    }));
  };

  const removeBlock = (id) => {
    setCampaignForm((prev) => ({ ...prev, blocks: prev.blocks.filter((b) => b.id !== id) }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    setCampaignForm((prev) => {
      const blocks = [...prev.blocks];
      const [moved] = blocks.splice(result.source.index, 1);
      blocks.splice(result.destination.index, 0, moved);
      return { ...prev, blocks };
    });
  };

  const getRecipients = () => {
    let matchedDancers = [];
    let label = '';

    if (campaignForm.segment === 'all') {
      matchedDancers = dancers;
      label = 'All Families';
    } else if (campaignForm.segment === 'class') {
      const schedule = classSchedules.find((c) => c.id === campaignForm.classId);
      const activeParentEmails = new Set(
        enrollments.filter((e) => e.class_schedule_id === campaignForm.classId && e.status === 'active').map((e) => e.parent_email)
      );
      matchedDancers = dancers.filter((d) => activeParentEmails.has(d.parent_email));
      label = schedule ? `${schedule.class_name || schedule.day_of_week} class` : 'Selected class';
    } else if (campaignForm.segment === 'skill') {
      matchedDancers = dancers.filter((d) => d.skill_level === campaignForm.skillLevel);
      label = `${campaignForm.skillLevel} dancers`;
    } else if (campaignForm.segment === 'waitlist') {
      const waitlistedEmails = new Set(enrollments.filter((e) => e.status === 'waitlisted').map((e) => e.parent_email));
      matchedDancers = dancers.filter((d) => waitlistedEmails.has(d.parent_email));
      label = 'Waitlisted families';
    }

    const unsubscribedEmails = new Set(parentProfiles.filter((p) => p.unsubscribed).map((p) => p.user_email));
    const uniqueEmails = [...new Set(matchedDancers.map((d) => d.parent_email))].filter((email) => !unsubscribedEmails.has(email));
    return { uniqueEmails, label };
  };

  const buildPayload = (status) => ({
    name: campaignForm.name || campaignForm.subject || 'Untitled Draft',
    subject: campaignForm.subject,
    blocks: stripBlockIds(campaignForm.blocks),
    segment: campaignForm.segment,
    class_schedule_id: campaignForm.segment === 'class' ? campaignForm.classId : undefined,
    skill_level: campaignForm.segment === 'skill' ? campaignForm.skillLevel : undefined,
    status,
  });

  const saveDraftMutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload('draft');
      return campaignForm.id ? base44.entities.EmailCampaign.update(campaignForm.id, payload) : base44.entities.EmailCampaign.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries(['emailCampaigns']);
      setCampaignForm((prev) => ({ ...prev, id: saved.id }));
      toast.success('Draft saved');
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async () => {
      const { uniqueEmails, label } = getRecipients();
      if (uniqueEmails.length === 0) {
        throw new Error('No recipients matched this segment');
      }
      const html = renderBlocksToHtml(campaignForm.blocks);

      await Promise.all(
        uniqueEmails.map((email) =>
          base44.integrations.Core.SendEmail({
            from_name: 'Sweetpeas Dance Studio',
            to: email,
            subject: campaignForm.subject,
            body: html,
          })
        )
      );

      const payload = { ...buildPayload('sent'), sent_date: new Date().toISOString(), recipient_count: uniqueEmails.length };
      if (campaignForm.id) {
        await base44.entities.EmailCampaign.update(campaignForm.id, payload);
      } else {
        await base44.entities.EmailCampaign.create(payload);
      }

      await base44.entities.Broadcast.create({
        type: 'campaign',
        channel: 'email',
        subject: campaignForm.subject,
        body: html,
        segment_label: label,
        recipient_count: uniqueEmails.length,
        sent_by: user?.full_name || 'Admin',
      });

      return { count: uniqueEmails.length, label };
    },
    onSuccess: ({ count, label }) => {
      queryClient.invalidateQueries(['emailCampaigns']);
      queryClient.invalidateQueries(['broadcasts']);
      toast.success(`Campaign sent to ${count} recipient(s) — ${label}`);
      resetBuilder();
    },
    onError: (err) => toast.error(err.message || 'Failed to send campaign'),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: () =>
      base44.entities.EmailTemplate.create({
        title: saveTemplateTitle,
        category: 'custom',
        subject: campaignForm.subject,
        blocks: stripBlockIds(campaignForm.blocks),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['emailTemplates']);
      setShowSaveTemplateDialog(false);
      setSaveTemplateTitle('');
      toast.success('Template saved to your gallery');
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailCampaign.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['emailCampaigns']);
      toast.success('Draft deleted');
    },
  });

  const { uniqueEmails: previewRecipients, label: previewLabel } = getRecipients();
  const previewHtml = renderBlocksToHtml(campaignForm.blocks);

  return (
    <div className="space-y-6">
      {/* Template Gallery */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800 flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Templates
          </CardTitle>
          <CardDescription>Start from a template, or build from scratch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            <button
              onClick={resetBuilder}
              className="p-4 border-2 border-dashed border-rose-200 rounded-lg text-left hover:border-rose-400 transition-colors"
            >
              <Plus className="w-5 h-5 text-rose-400 mb-2" />
              <p className="font-medium text-gray-800">Blank Campaign</p>
              <p className="text-xs text-gray-500">Start from scratch</p>
            </button>
            {STARTER_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => loadTemplate(t)}
                className="p-4 border border-rose-200 rounded-lg text-left hover:border-rose-400 hover:bg-rose-50 transition-colors"
              >
                <p className="font-medium text-gray-800">{t.title}</p>
                <p className="text-xs text-gray-500 capitalize">{t.category.replace('_', ' ')}</p>
              </button>
            ))}
            {customTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => loadTemplate(t)}
                className="p-4 border border-purple-200 rounded-lg text-left hover:border-purple-400 hover:bg-purple-50 transition-colors"
              >
                <p className="font-medium text-gray-800">{t.title}</p>
                <p className="text-xs text-gray-500">Custom template</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Builder */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800">Campaign Builder</CardTitle>
          <CardDescription>Drag to reorder blocks, edit content inline, then send or save as a draft</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="Internal name, e.g. July Term Announcement" />
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input value={campaignForm.subject} onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })} placeholder="What parents will see in their inbox" />
            </div>
            <div>
              <Label>Send To</Label>
              <Select value={campaignForm.segment} onValueChange={(value) => setCampaignForm({ ...campaignForm, segment: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  <SelectItem value="class">Specific Class</SelectItem>
                  <SelectItem value="skill">Skill Level</SelectItem>
                  <SelectItem value="waitlist">Waitlisted Families</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {campaignForm.segment === 'class' && (
              <div>
                <Label>Class</Label>
                <Select value={campaignForm.classId} onValueChange={(value) => setCampaignForm({ ...campaignForm, classId: value })}>
                  <SelectTrigger><SelectValue placeholder="Choose a class..." /></SelectTrigger>
                  <SelectContent>
                    {classSchedules.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.class_name ? `${c.class_name} — ` : ''}{c.day_of_week}s {c.start_time}-{c.end_time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {campaignForm.segment === 'skill' && (
              <div>
                <Label>Skill Level</Label>
                <Select value={campaignForm.skillLevel} onValueChange={(value) => setCampaignForm({ ...campaignForm, skillLevel: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Block palette */}
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

          {/* Drag and drop block list */}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="blocks">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {campaignForm.blocks.map((block, index) => (
                    <Draggable key={block.id} draggableId={block.id} index={index}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className="flex items-start gap-2 p-3 border border-rose-100 rounded-lg bg-white"
                        >
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
                              <Textarea
                                value={block.text || ''}
                                onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                rows={block.type === 'heading' ? 1 : 3}
                              />
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
                  {campaignForm.blocks.length === 0 && (
                    <p className="text-center text-gray-500 text-sm py-8 border border-dashed border-rose-200 rounded-lg">
                      Add a block above or pick a template to get started
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Preview */}
          {campaignForm.blocks.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500">Preview</Label>
              <div className="border border-rose-100 rounded-lg p-6 bg-white" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}

          <p className="text-sm text-gray-500">
            Will send to {previewRecipients.length} recipient(s) — {previewLabel}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => sendCampaignMutation.mutate()}
              disabled={!campaignForm.subject || campaignForm.blocks.length === 0 || (campaignForm.segment === 'class' && !campaignForm.classId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Campaign
            </Button>
            <Button variant="outline" onClick={() => saveDraftMutation.mutate()} disabled={campaignForm.blocks.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(true)} disabled={campaignForm.blocks.length === 0}>
              <LayoutTemplate className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
            {(campaignForm.id || campaignForm.blocks.length > 0) && (
              <Button variant="outline" onClick={resetBuilder}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-rose-800">Campaign History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-rose-100 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.subject} · {c.status === 'sent' ? `sent to ${c.recipient_count} recipient(s)` : 'draft'}
                    {c.sent_date && ` · ${new Date(c.sent_date).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={c.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{c.status}</Badge>
                  {c.status === 'draft' && (
                    <Button size="sm" variant="outline" onClick={() => loadCampaign(c, false)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => loadCampaign(c, true)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  {c.status === 'draft' && (
                    <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteCampaignMutation.mutate(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {campaigns.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No campaigns yet</p>}
          </div>
        </CardContent>
      </Card>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="template-title">Template Name</Label>
            <Input id="template-title" value={saveTemplateTitle} onChange={(e) => setSaveTemplateTitle(e.target.value)} placeholder="e.g. Monthly Recap" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" disabled={!saveTemplateTitle} onClick={() => saveTemplateMutation.mutate()}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
