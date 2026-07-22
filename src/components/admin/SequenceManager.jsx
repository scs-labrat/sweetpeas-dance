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
import { Plus, Trash2, Edit, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const DAY_MS = 86400000;

const emptySequenceForm = () => ({
  id: null,
  name: '',
  trigger: 'new_enrollment',
  is_active: true,
  steps: [{ delay_days: 0, subject: '', body: '' }],
});

export default function SequenceManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptySequenceForm());

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false });
  const { data: sequences = [] } = useQuery({ queryKey: ['emailSequences'], queryFn: () => base44.entities.EmailSequence.list('-created_date') });
  const { data: progress = [] } = useQuery({ queryKey: ['sequenceProgress'], queryFn: () => base44.entities.SequenceProgress.list() });
  const { data: dancers = [] } = useQuery({ queryKey: ['dancers'], queryFn: () => base44.entities.DancerProfile.list() });
  const { data: enrollments = [] } = useQuery({ queryKey: ['enrollments'], queryFn: () => base44.entities.Enrollment.list() });
  const { data: parentProfiles = [] } = useQuery({ queryKey: ['parentProfiles'], queryFn: () => base44.entities.ParentProfile.list() });

  const getEligibleParents = (sequence) => {
    if (sequence.trigger === 'new_enrollment') {
      const earliestActiveByParent = {};
      enrollments
        .filter((e) => e.status === 'active')
        .forEach((e) => {
          if (!earliestActiveByParent[e.parent_email] || e.enrolled_date < earliestActiveByParent[e.parent_email]) {
            earliestActiveByParent[e.parent_email] = e.enrolled_date;
          }
        });
      return Object.entries(earliestActiveByParent).map(([parent_email, trigger_date]) => ({ parent_email, trigger_date }));
    }

    // inactivity: families with dancers but no currently active enrollment
    const allParentEmails = new Set(dancers.map((d) => d.parent_email));
    const parentsWithActive = new Set(enrollments.filter((e) => e.status === 'active').map((e) => e.parent_email));
    return [...allParentEmails]
      .filter((email) => !parentsWithActive.has(email))
      .map((parent_email) => {
        const theirEnrollments = enrollments.filter((e) => e.parent_email === parent_email);
        const mostRecent = theirEnrollments.reduce((max, e) => (!max || e.enrolled_date > max ? e.enrolled_date : max), null);
        return { parent_email, trigger_date: mostRecent };
      })
      .filter((p) => p.trigger_date);
  };

  const getDueSteps = (sequence) => {
    const unsubscribedEmails = new Set(parentProfiles.filter((p) => p.unsubscribed).map((p) => p.user_email));
    const eligible = getEligibleParents(sequence).filter((p) => !unsubscribedEmails.has(p.parent_email));
    const now = Date.now();

    return eligible
      .map(({ parent_email, trigger_date }) => {
        const existingProgress = progress.find((p) => p.sequence_id === sequence.id && p.parent_email === parent_email);
        const currentStep = existingProgress?.current_step || 0;
        if (currentStep >= (sequence.steps || []).length) return null;

        const step = sequence.steps[currentStep];
        const daysSinceTrigger = (now - new Date(trigger_date).getTime()) / DAY_MS;
        if (daysSinceTrigger < (step.delay_days || 0)) return null;

        return { parent_email, stepIndex: currentStep, step, progressId: existingProgress?.id || null };
      })
      .filter(Boolean);
  };

  const saveSequenceMutation = useMutation({
    mutationFn: () => {
      const payload = { name: form.name, trigger: form.trigger, is_active: form.is_active, steps: form.steps };
      return form.id ? base44.entities.EmailSequence.update(form.id, payload) : base44.entities.EmailSequence.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['emailSequences']);
      setShowDialog(false);
      setForm(emptySequenceForm());
      toast.success('Sequence saved');
    },
  });

  const deleteSequenceMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailSequence.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['emailSequences']);
      toast.success('Sequence deleted');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.EmailSequence.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries(['emailSequences']),
  });

  const sendDueStepsMutation = useMutation({
    mutationFn: async (sequence) => {
      const due = getDueSteps(sequence);
      if (due.length === 0) {
        throw new Error('Nothing is due to send right now');
      }

      await Promise.all(
        due.map((d) =>
          base44.integrations.Core.SendEmail({
            from_name: 'Sweetpeas Dance Studio',
            to: d.parent_email,
            subject: d.step.subject,
            body: d.step.body,
          })
        )
      );

      await Promise.all(
        due.map((d) =>
          d.progressId
            ? base44.entities.SequenceProgress.update(d.progressId, { current_step: d.stepIndex + 1, last_sent_date: new Date().toISOString() })
            : base44.entities.SequenceProgress.create({
                sequence_id: sequence.id,
                parent_email: d.parent_email,
                current_step: d.stepIndex + 1,
                last_sent_date: new Date().toISOString(),
              })
        )
      );

      await base44.entities.Broadcast.create({
        type: 'sequence',
        channel: 'email',
        subject: `${sequence.name} — step ${due[0].stepIndex + 1}`,
        segment_label: sequence.name,
        recipient_count: due.length,
        sent_by: user?.full_name || 'Admin',
      });

      return due.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(['sequenceProgress']);
      queryClient.invalidateQueries(['broadcasts']);
      toast.success(`Sent step to ${count} famil${count === 1 ? 'y' : 'ies'}`);
    },
    onError: (err) => toast.error(err.message || 'Failed to send sequence step'),
  });

  const openCreateDialog = () => {
    setForm(emptySequenceForm());
    setShowDialog(true);
  };

  const openEditDialog = (sequence) => {
    setForm({ id: sequence.id, name: sequence.name, trigger: sequence.trigger, is_active: sequence.is_active, steps: sequence.steps || [] });
    setShowDialog(true);
  };

  const addStep = () => setForm((prev) => ({ ...prev, steps: [...prev.steps, { delay_days: 0, subject: '', body: '' }] }));
  const updateStep = (index, changes) =>
    setForm((prev) => ({ ...prev, steps: prev.steps.map((s, i) => (i === index ? { ...s, ...changes } : s)) }));
  const removeStep = (index) => setForm((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));

  return (
    <div className="space-y-4">
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-rose-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Automated Sequences
            </CardTitle>
            <CardDescription>
              Welcome new families or re-engage lapsed ones with a drip of emails. Click &quot;Send Due Steps&quot; whenever you&apos;d like to run the next batch —
              this isn&apos;t on a timer, so check back regularly (or after new enrollments come in).
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog} className="bg-rose-600 hover:bg-rose-700">
            <Plus className="w-4 h-4 mr-2" />
            New Sequence
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sequences.map((sequence) => {
              const dueCount = getDueSteps(sequence).length;
              return (
                <Card key={sequence.id} className="border-rose-200/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{sequence.name}</p>
                        <p className="text-sm text-gray-500 capitalize">
                          Trigger: {sequence.trigger.replace('_', ' ')} · {(sequence.steps || []).length} step(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={sequence.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {sequence.is_active ? 'Active' : 'Paused'}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => toggleActiveMutation.mutate({ id: sequence.id, is_active: !sequence.is_active })}>
                          {sequence.is_active ? 'Pause' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(sequence)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('Delete this sequence?')) deleteSequenceMutation.mutate(sequence.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-rose-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{dueCount}</span> famil{dueCount === 1 ? 'y is' : 'ies are'} due for their next step
                      </p>
                      <Button
                        size="sm"
                        disabled={!sequence.is_active || dueCount === 0}
                        onClick={() => sendDueStepsMutation.mutate(sequence)}
                        className="bg-rose-600 hover:bg-rose-700"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send Due Steps
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {sequences.length === 0 && (
              <p className="text-center text-gray-500 py-8 text-sm">
                No sequences yet — create a Welcome Series or Re-engagement sequence to get started
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sequence Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Sequence' : 'New Sequence'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome Series" />
              </div>
              <div>
                <Label>Trigger</Label>
                <Select value={form.trigger} onValueChange={(value) => setForm({ ...form, trigger: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_enrollment">New Enrollment (welcome series)</SelectItem>
                    <SelectItem value="inactivity">Inactivity (re-engagement)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Steps</Label>
              {form.steps.map((step, index) => (
                <Card key={index} className="border-rose-200/50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-700">Step {index + 1}</p>
                      {form.steps.length > 1 && (
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => removeStep(index)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid md:grid-cols-[120px_1fr] gap-2">
                      <div>
                        <Label className="text-xs">Delay (days)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={step.delay_days}
                          onChange={(e) => updateStep(index, { delay_days: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Subject</Label>
                        <Input value={step.subject} onChange={(e) => updateStep(index, { subject: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Body</Label>
                      <Textarea value={step.body} onChange={(e) => updateStep(index, { body: e.target.value })} rows={3} />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button size="sm" variant="outline" onClick={addStep}>
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={!form.name || form.steps.some((s) => !s.subject)}
              onClick={() => saveSequenceMutation.mutate()}
            >
              Save Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
