import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as entities from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Plus, Heart, Clock, Sparkles, LogIn, Send, MessageCircle, Gift, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import SocialWall from "@/components/SocialWall";
import CommunityFeed from "@/components/CommunityFeed";
import ResourceLibrary from "@/components/ResourceLibrary";
import UpcomingEvents from "@/components/UpcomingEvents";

const DAY_LABELS = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  waitlisted: "bg-orange-100 text-orange-700",
  cancelled: "bg-gray-100 text-gray-700",
  completed: "bg-blue-100 text-blue-700",
};

export default function Family() {
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const queryClient = useQueryClient();

  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showDancerDialog, setShowDancerDialog] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "", address: "", emergency_contact: "", notes: "", unsubscribed: false });
  const [dancerForm, setDancerForm] = useState({ name: "", birthdate: "", skill_level: "beginner", notes: "" });
  const [messageText, setMessageText] = useState("");

  const parentEmail = user?.email;

  const { data: parentProfiles = [] } = useQuery({
    queryKey: ["parentProfile", parentEmail],
    queryFn: () => entities.ParentProfile.filter({ user_email: parentEmail }),
    enabled: !!parentEmail,
  });
  const parentProfile = parentProfiles[0] || null;

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals", parentEmail],
    queryFn: () => entities.Referral.filter({ referrer_email: parentEmail }),
    enabled: !!parentEmail,
  });

  useEffect(() => {
    if (parentProfile && !parentProfile.referral_code) {
      const base = (parentProfile.full_name || "FRIEND").split(" ")[0].toUpperCase().replace(/[^A-Z]/g, "") || "FRIEND";
      const code = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
      entities.ParentProfile.update(parentProfile.id, { referral_code: code }).then(() =>
        queryClient.invalidateQueries({ queryKey: ["parentProfile", parentEmail] })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentProfile?.id, parentProfile?.referral_code]);

  const { data: dancers = [] } = useQuery({
    queryKey: ["dancers", parentEmail],
    queryFn: () => entities.DancerProfile.filter({ parent_email: parentEmail }),
    enabled: !!parentEmail,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["enrollments", parentEmail],
    queryFn: () => entities.Enrollment.filter({ parent_email: parentEmail }),
    enabled: !!parentEmail,
  });

  const { data: classSchedules = [] } = useQuery({
    queryKey: ["classSchedules", "active"],
    queryFn: () => entities.ClassSchedule.filter({ is_active: true }),
    enabled: !!parentEmail,
  });

  const { data: dancerBadges = [] } = useQuery({
    queryKey: ["dancerBadges", parentEmail],
    queryFn: async () => {
      const badges = await entities.DancerBadge.list();
      const dancerIds = new Set(dancers.map((d) => d.id));
      return badges.filter((b) => dancerIds.has(b.dancer_id));
    },
    enabled: !!parentEmail && dancers.length > 0,
  });

  const { data: conversationList = [] } = useQuery({
    queryKey: ["conversation", parentEmail],
    queryFn: () => entities.Conversation.filter({ parent_email: parentEmail }),
    enabled: !!parentEmail,
    refetchInterval: 15000,
  });
  const conversation = conversationList[0] || null;

  const { data: messages = [] } = useQuery({
    queryKey: ["familyMessages", conversation?.id],
    queryFn: () => entities.Message.filter({ conversation_id: conversation.id }),
    enabled: !!conversation?.id,
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (conversation?.unread_by_parent) {
      entities.Conversation.update(conversation.id, { unread_by_parent: false }).then(() =>
        queryClient.invalidateQueries({ queryKey: ["conversation", parentEmail] })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, conversation?.unread_by_parent]);

  const sendMessageMutation = useMutation({
    mutationFn: async (body) => {
      let conversationId = conversation?.id;
      if (!conversationId) {
        const created = await entities.Conversation.create({
          parent_email: parentEmail,
          parent_name: parentProfile?.full_name || user?.full_name || parentEmail,
          subject: "Message from family portal",
          last_message_at: new Date().toISOString(),
          last_message_preview: body.slice(0, 140),
          unread_by_admin: true,
          unread_by_parent: false,
        });
        conversationId = created.id;
      } else {
        await entities.Conversation.update(conversationId, {
          last_message_at: new Date().toISOString(),
          last_message_preview: body.slice(0, 140),
          unread_by_admin: true,
        });
      }
      await entities.Message.create({
        conversation_id: conversationId,
        sender_role: "parent",
        sender_name: parentProfile?.full_name || user?.full_name || "Parent",
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", parentEmail] });
      queryClient.invalidateQueries({ queryKey: ["familyMessages", conversation?.id] });
      setMessageText("");
    },
    onError: () => toast.error("Failed to send message"),
  });

  const saveProfileMutation = useMutation({
    mutationFn: (data) =>
      parentProfile
        ? entities.ParentProfile.update(parentProfile.id, data)
        : entities.ParentProfile.create({ ...data, user_email: parentEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parentProfile", parentEmail] });
      setShowProfileDialog(false);
      toast.success("Family details saved");
    },
    onError: (err) => toast.error("Could not save family details: " + (err?.message || "Unknown error")),
  });

  const createDancerMutation = useMutation({
    mutationFn: (data) => entities.DancerProfile.create({ ...data, parent_email: parentEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dancers", parentEmail] });
      setShowDancerDialog(false);
      setDancerForm({ name: "", birthdate: "", skill_level: "beginner", notes: "" });
      toast.success("Dancer added");
    },
    onError: (err) => toast.error("Could not add dancer: " + (err?.message || "Unknown error")),
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ dancer, classScheduleId }) => {
      const schedule = classSchedules.find((c) => c.id === classScheduleId);
      const activeEnrollments = await entities.Enrollment.filter({
        class_schedule_id: classScheduleId,
        status: "active",
      });
      const isFull = schedule?.max_students && activeEnrollments.length >= schedule.max_students;
      return entities.Enrollment.create({
        dancer_id: dancer.id,
        dancer_name: dancer.name,
        parent_email: parentEmail,
        class_schedule_id: classScheduleId,
        status: isFull ? "waitlisted" : "active",
        enrolled_date: format(new Date(), "yyyy-MM-dd"),
      });
    },
    onSuccess: (enrollment) => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", parentEmail] });
      if (enrollment.status === "waitlisted") {
        toast.info("That class is full — added to the waitlist. We'll email you when a spot opens up!");
      } else {
        toast.success("Enrolled! See you in class.");
      }
    },
  });

  const openProfileDialog = () => {
    setProfileForm({
      full_name: parentProfile?.full_name || user?.full_name || "",
      phone: parentProfile?.phone || "",
      address: parentProfile?.address || "",
      emergency_contact: parentProfile?.emergency_contact || "",
      notes: parentProfile?.notes || "",
      unsubscribed: parentProfile?.unsubscribed || false,
    });
    setShowProfileDialog(true);
  };

  const formatSchedule = (schedule) =>
    schedule ? `${DAY_LABELS[schedule.day_of_week] || schedule.day_of_week} ${schedule.start_time} - ${schedule.end_time}` : "Unknown class";

  const copyReferralLink = () => {
    const link = `${window.location.origin}/?ref=${parentProfile.referral_code}`;
    navigator.clipboard.writeText(link).then(() => toast.success("Referral link copied!"));
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50 px-4">
        <Card className="max-w-md w-full text-center bg-white/90">
          <CardContent className="p-10">
            <Heart className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-rose-800 mb-2">Sign in to your Family Portal</h2>
            <p className="text-gray-600 mb-6">
              Manage your dancers, see class enrollments, and enroll into open classes.
            </p>
            <Button onClick={navigateToLogin} className="bg-rose-600 hover:bg-rose-700">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-rose-800">
              Welcome, {parentProfile?.full_name || user?.full_name || "there"}! 🌸
            </h1>
            <p className="text-gray-600">Manage your family&apos;s dancers and classes.</p>
          </div>
          <Button variant="outline" onClick={openProfileDialog} className="border-rose-300 text-rose-700">
            {parentProfile ? "Edit Family Details" : "Complete Your Family Profile"}
          </Button>
        </div>

        {!parentProfile && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4 text-amber-800 text-sm">
              Please complete your family profile so we have your contact and emergency details on file.
            </CardContent>
          </Card>
        )}

        {/* Dancers */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-rose-800 flex items-center gap-2">
                <Users className="w-5 h-5" /> Your Dancers
              </CardTitle>
              <CardDescription>Add each child you&apos;d like to enroll</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowDancerDialog(true)} className="bg-rose-600 hover:bg-rose-700">
              <Plus className="w-4 h-4 mr-1" /> Add Dancer
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {dancers.length === 0 && (
              <p className="text-gray-500 text-center py-6">No dancers added yet.</p>
            )}
            {dancers.map((dancer) => {
              const dancerEnrollments = enrollments.filter((e) => e.dancer_id === dancer.id);
              const earnedBadges = dancerBadges.filter((b) => b.dancer_id === dancer.id);
              return (
                <Card key={dancer.id} className="border-rose-200/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-800">{dancer.name}</h3>
                        {dancer.birthdate && (
                          <p className="text-sm text-gray-500">Born {dancer.birthdate}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize">{dancer.skill_level}</Badge>
                    </div>

                    {earnedBadges.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {earnedBadges.map((b) => (
                          <Badge key={b.id} variant="outline" className="border-purple-200 text-purple-700" title={b.note}>
                            {b.badge_icon} {b.badge_name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {dancer.achievements && dancer.achievements.length > 0 && (
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                        {dancer.achievements.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    )}

                    {dancerEnrollments.length > 0 && (
                      <div className="space-y-1">
                        {dancerEnrollments.map((e) => (
                          <div key={e.id} className="flex items-center justify-between text-sm bg-rose-50 rounded px-3 py-2">
                            <span className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-rose-400" />
                              {formatSchedule(classSchedules.find((c) => c.id === e.class_schedule_id))}
                            </span>
                            <Badge className={STATUS_STYLES[e.status]}>{e.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-gray-500">Enroll in a class</Label>
                      <Select onValueChange={(classScheduleId) => enrollMutation.mutate({ dancer, classScheduleId })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a class..." />
                        </SelectTrigger>
                        <SelectContent>
                          {classSchedules
                            .filter((c) => !dancerEnrollments.some((e) => e.class_schedule_id === c.id && e.status !== "cancelled"))
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {formatSchedule(c)} {c.age_range ? `(Ages ${c.age_range})` : ""}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

        <UpcomingEvents />

        {/* Refer a Friend */}
        {parentProfile?.referral_code && (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-rose-800 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Refer a Friend
              </CardTitle>
              <CardDescription>Share your link — when a friend registers, we&apos;ll send you a thank-you reward</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input readOnly value={`${window.location.origin}/?ref=${parentProfile.referral_code}`} className="font-mono text-sm" />
                <Button variant="outline" onClick={copyReferralLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              {referrals.length > 0 && (
                <div className="space-y-1 pt-2">
                  {referrals.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm bg-rose-50 rounded px-3 py-2">
                      <span>{r.referred_name || "A new family"}</span>
                      <Badge className={r.status === "rewarded" ? "bg-green-100 text-green-700" : r.status === "converted" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-rose-800 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Messages
            </CardTitle>
            <CardDescription>Chat with the studio — ask a quick question anytime</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {[...messages]
                .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                .map((m) => (
                  <div key={m.id} className={`flex ${m.sender_role === "parent" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        m.sender_role === "parent" ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              {messages.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">
                  No messages yet — say hello! We usually reply within a day.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                rows={2}
              />
              <Button
                onClick={() => sendMessageMutation.mutate(messageText)}
                disabled={!messageText.trim()}
                className="bg-rose-600 hover:bg-rose-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <SocialWall />

        <CommunityFeed
          currentUserEmail={parentEmail}
          currentUserName={parentProfile?.full_name || user?.full_name || parentEmail}
        />

        <ResourceLibrary />
      </div>

      {/* Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Family Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-name">Parent/Guardian Name</Label>
              <Input id="profile-name" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="profile-phone">Phone</Label>
              <Input id="profile-phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="profile-address">Address</Label>
              <Input id="profile-address" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="profile-emergency">Emergency Contact</Label>
              <Input id="profile-emergency" value={profileForm.emergency_contact} onChange={(e) => setProfileForm({ ...profileForm, emergency_contact: e.target.value })} placeholder="Name and phone number" />
            </div>
            <div>
              <Label htmlFor="profile-notes">Notes</Label>
              <Textarea id="profile-notes" value={profileForm.notes} onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="profile-unsubscribed"
                type="checkbox"
                checked={!profileForm.unsubscribed}
                onChange={(e) => setProfileForm({ ...profileForm, unsubscribed: !e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="profile-unsubscribed">Send me studio emails (announcements, newsletters, class reminders)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>Cancel</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => saveProfileMutation.mutate(profileForm)}
              disabled={!profileForm.full_name}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dancer Dialog */}
      <Dialog open={showDancerDialog} onOpenChange={setShowDancerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Dancer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dancer-name">Name</Label>
              <Input id="dancer-name" value={dancerForm.name} onChange={(e) => setDancerForm({ ...dancerForm, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="dancer-birthdate">Date of Birth</Label>
              <Input id="dancer-birthdate" type="date" value={dancerForm.birthdate} onChange={(e) => setDancerForm({ ...dancerForm, birthdate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="dancer-skill">Skill Level</Label>
              <Select value={dancerForm.skill_level} onValueChange={(value) => setDancerForm({ ...dancerForm, skill_level: value })}>
                <SelectTrigger id="dancer-skill">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dancer-notes">Notes (allergies, special needs, etc.)</Label>
              <Textarea id="dancer-notes" value={dancerForm.notes} onChange={(e) => setDancerForm({ ...dancerForm, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDancerDialog(false)}>Cancel</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => createDancerMutation.mutate(dancerForm)}
              disabled={!dancerForm.name}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Add Dancer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}