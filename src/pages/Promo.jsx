import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { renderBlocksToHtml } from '@/lib/blockRenderer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function Promo() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('page');
  const viewCounted = useRef(false);

  const [formData, setFormData] = useState({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    child_name: '',
    child_age: '',
    preferred_class_time: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['landingPage', slug],
    queryFn: () => base44.entities.LandingPage.filter({ slug, status: 'published' }),
    enabled: !!slug,
  });
  const page = pages[0];

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules', 'active'],
    queryFn: () => base44.entities.ClassSchedule.filter({ is_active: true }),
  });

  useEffect(() => {
    if (page && !viewCounted.current) {
      viewCounted.current = true;
      base44.entities.LandingPage.update(page.id, { view_count: (page.view_count || 0) + 1 });
    }
  }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await base44.entities.Registration.create({
        ...formData,
        child_age: parseInt(formData.child_age, 10),
        source: `landing_page:${slug}`,
        promo_code_used: page?.promo_code || undefined,
      });

      await base44.entities.LandingPage.update(page.id, { submission_count: (page.submission_count || 0) + 1 });

      await base44.integrations.Core.SendEmail({
        from_name: 'Sweetpeas Dance Registration',
        to: 'fionaslewis@gmail.com',
        subject: `New Lead from "${page.title}": ${formData.child_name}`,
        body: `New lead captured from the "${page.title}" landing page!\n\nPARENT: ${formData.parent_name} (${formData.parent_email}, ${formData.parent_phone || 'no phone'})\nCHILD: ${formData.child_name}, age ${formData.child_age}\n${page.promo_code ? `PROMO CODE APPLIED: ${page.promo_code}\n` : ''}Submitted: ${new Date().toLocaleString()}`,
      });

      setSubmitted(true);
      toast.success("You're on the list! We'll be in touch soon.");
    } catch (error) {
      console.error('Landing page submission error:', error);
      toast.error('Something went wrong. Please try again.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 px-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-10">
            <p className="text-gray-600">This offer isn&apos;t available right now — check back soon!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12" dangerouslySetInnerHTML={{ __html: renderBlocksToHtml(page.blocks) }} />

        <Card className="shadow-xl border-rose-200/50">
          <CardContent className="p-8 md:p-12">
            {submitted ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">You&apos;re on the list!</h3>
                <p className="text-gray-600">We&apos;ve received your details and will be in touch soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parent-name">Parent/Guardian Name *</Label>
                    <Input id="parent-name" required value={formData.parent_name} onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="parent-email">Email *</Label>
                    <Input id="parent-email" type="email" required value={formData.parent_email} onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="parent-phone">Phone</Label>
                    <Input id="parent-phone" type="tel" value={formData.parent_phone} onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="child-name">Child&apos;s Name *</Label>
                    <Input id="child-name" required value={formData.child_name} onChange={(e) => setFormData({ ...formData, child_name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="child-age">Child&apos;s Age *</Label>
                    <Input id="child-age" type="number" min="1" required value={formData.child_age} onChange={(e) => setFormData({ ...formData, child_age: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="preferred-class">Preferred Class Time *</Label>
                    <Select value={formData.preferred_class_time} onValueChange={(value) => setFormData({ ...formData, preferred_class_time: value })}>
                      <SelectTrigger id="preferred-class"><SelectValue placeholder="Select a time" /></SelectTrigger>
                      <SelectContent>
                        {classSchedules.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.day_of_week}s {c.start_time}-{c.end_time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {page.promo_code && (
                  <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                    Promo code <span className="font-semibold">{page.promo_code}</span> will be applied automatically.
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.preferred_class_time}
                  className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white py-6 text-lg rounded-full"
                >
                  {isSubmitting ? 'Submitting...' : (
                    <span className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      {page.cta_text || 'Claim My Spot'}
                    </span>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
