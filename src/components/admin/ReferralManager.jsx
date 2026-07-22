import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Gift, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_STYLES = {
  pending: 'bg-blue-100 text-blue-700',
  converted: 'bg-purple-100 text-purple-700',
  rewarded: 'bg-green-100 text-green-700',
};

export default function ReferralManager() {
  const queryClient = useQueryClient();
  const [rewardTarget, setRewardTarget] = useState(null);
  const [rewardForm, setRewardForm] = useState({ code: '', discount_value: 10 });

  const { data: referrals = [] } = useQuery({ queryKey: ['referrals'], queryFn: () => base44.entities.Referral.list('-created_date') });
  const { data: registrations = [] } = useQuery({ queryKey: ['registrations'], queryFn: () => base44.entities.Registration.list() });

  const markConvertedMutation = useMutation({
    mutationFn: (referral) => base44.entities.Referral.update(referral.id, { status: 'converted' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['referrals']);
      toast.success('Marked as converted');
    },
  });

  const rewardMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.PromoCode.create({
        code: rewardForm.code,
        description: `Referral reward for ${rewardTarget.referrer_name || rewardTarget.referrer_email}`,
        discount_type: 'percent',
        discount_value: rewardForm.discount_value,
        max_uses: 1,
        is_active: true,
      });
      return base44.entities.Referral.update(rewardTarget.id, {
        status: 'rewarded',
        reward_note: `Promo code ${rewardForm.code} issued`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['referrals']);
      queryClient.invalidateQueries(['promoCodes']);
      setRewardTarget(null);
      toast.success('Reward code created and referral marked as rewarded');
    },
  });

  const openRewardDialog = (referral) => {
    setRewardTarget(referral);
    setRewardForm({ code: `THANKS-${referral.referrer_name?.split(' ')[0]?.toUpperCase() || 'REF'}-${Math.floor(Math.random() * 900 + 100)}`, discount_value: 10 });
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-rose-800 flex items-center gap-2">
          <Gift className="w-5 h-5" />
          Referral Program
        </CardTitle>
        <CardDescription>Families who referred a new family, tracked from their unique referral link</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {referrals.map((referral) => {
            const registration = registrations.find((r) => r.id === referral.registration_id);
            return (
              <div key={referral.id} className="flex items-center justify-between p-3 border border-rose-100 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">
                    {referral.referrer_name || referral.referrer_email} referred {referral.referred_name || 'a new family'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Code: {referral.referral_code}
                    {registration && ` · Registration status: ${registration.status}`}
                    {referral.reward_note && ` · ${referral.reward_note}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_STYLES[referral.status]}>{referral.status}</Badge>
                  {referral.status === 'pending' && (
                    <Button size="sm" variant="outline" onClick={() => markConvertedMutation.mutate(referral)}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Converted
                    </Button>
                  )}
                  {referral.status !== 'rewarded' && (
                    <Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={() => openRewardDialog(referral)}>
                      <Gift className="w-4 h-4 mr-1" />
                      Reward
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {referrals.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No referrals yet</p>}
        </div>
      </CardContent>

      <Dialog open={!!rewardTarget} onOpenChange={(open) => !open && setRewardTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reward {rewardTarget?.referrer_name || rewardTarget?.referrer_email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">This creates a one-time promo code for the referrer to use on their next registration or payment.</p>
            <div>
              <Label>Reward Code</Label>
              <Input value={rewardForm.code} onChange={(e) => setRewardForm({ ...rewardForm, code: e.target.value.toUpperCase() })} />
            </div>
            <div>
              <Label>Discount (%)</Label>
              <Input type="number" min="1" max="100" value={rewardForm.discount_value} onChange={(e) => setRewardForm({ ...rewardForm, discount_value: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardTarget(null)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" disabled={!rewardForm.code} onClick={() => rewardMutation.mutate()}>
              Create Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
