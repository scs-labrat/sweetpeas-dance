import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Ticket } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = () => ({ id: null, code: '', description: '', discount_type: 'percent', discount_value: 10, max_uses: '', valid_until: '', is_active: true });

export default function PromoCodeManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const { data: promoCodes = [] } = useQuery({ queryKey: ['promoCodes', 'all'], queryFn: () => base44.entities.PromoCode.list('-created_date') });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: form.code.toUpperCase(),
        description: form.description,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : undefined,
        valid_until: form.valid_until || undefined,
        is_active: form.is_active,
      };
      return form.id ? base44.entities.PromoCode.update(form.id, payload) : base44.entities.PromoCode.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['promoCodes']);
      setShowDialog(false);
      setForm(emptyForm());
      toast.success('Promo code saved');
    },
    onError: () => toast.error('Failed to save — code may already exist'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PromoCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['promoCodes']);
      toast.success('Promo code deleted');
    },
  });

  const openCreateDialog = () => {
    setForm(emptyForm());
    setShowDialog(true);
  };

  const openEditDialog = (promo) => {
    setForm({
      id: promo.id,
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      max_uses: promo.max_uses || '',
      valid_until: promo.valid_until || '',
      is_active: promo.is_active,
    });
    setShowDialog(true);
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-rose-800 flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Discount & Voucher Codes
          </CardTitle>
          <CardDescription>Early-bird, sibling discounts, and referral rewards</CardDescription>
        </div>
        <Button onClick={openCreateDialog} className="bg-rose-600 hover:bg-rose-700">
          <Plus className="w-4 h-4 mr-2" />
          New Code
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {promoCodes.map((promo) => (
            <div key={promo.id} className="flex items-center justify-between p-3 border border-rose-100 rounded-lg">
              <div>
                <p className="font-mono font-semibold text-gray-800">{promo.code}</p>
                <p className="text-xs text-gray-500">
                  {promo.description} · {promo.discount_type === 'percent' ? `${promo.discount_value}% off` : `$${promo.discount_value} off`}
                  {promo.max_uses ? ` · ${promo.used_count || 0}/${promo.max_uses} used` : ` · ${promo.used_count || 0} used`}
                  {promo.valid_until && ` · expires ${promo.valid_until}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {promo.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => openEditDialog(promo)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteMutation.mutate(promo.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {promoCodes.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No promo codes yet</p>}
        </div>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Promo Code' : 'New Promo Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EARLYBIRD10" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Early-bird term registration" />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(value) => setForm({ ...form, discount_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent Off</SelectItem>
                    <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{form.discount_type === 'percent' ? 'Percent (%)' : 'Amount ($)'}</Label>
                <Input type="number" min="0" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
              </div>
              <div>
                <Label>Max Uses (optional)</Label>
                <Input type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Unlimited" />
              </div>
              <div>
                <Label>Valid Until (optional)</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="promo-active"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="promo-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" disabled={!form.code || !form.discount_value} onClick={() => saveMutation.mutate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
