import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BlogContent from "@/components/BlogContent";
import {
  Users,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  Edit,
  Trash2,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Eye,
  Send,
  Loader2,
  CalendarCheck,
  Star,
  Search,
  UserPlus,
  Bell,
  ListPlus,
  Inbox,
  Megaphone,
  BellRing,
  Share2,
  TrendingUp,
  ImagePlus
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import CalendarView from "../components/admin/CalendarView";
import OverviewTab from "../components/admin/OverviewTab";
import AssistantChat from "../components/admin/AssistantChat";
import CampaignBuilder from "../components/admin/CampaignBuilder";
import SequenceManager from "../components/admin/SequenceManager";
import SocialScheduler from "../components/admin/SocialScheduler";
import CommunityFeed from "../components/CommunityFeed";
import ResourceLibrary from "../components/ResourceLibrary";
import LandingPageBuilder from "../components/admin/LandingPageBuilder";
import ReferralManager from "../components/admin/ReferralManager";
import PromoCodeManager from "../components/admin/PromoCodeManager";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ReactMarkdown from 'react-markdown';
import { format, isSameDay, parseISO } from 'date-fns';
import ShareButtons from "@/components/ShareButtons";
import { createPageUrl } from "@/utils";

const STATUS_BADGE_STYLES = {
  active: 'bg-green-100 text-green-700',
  waitlisted: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-gray-100 text-gray-700',
  completed: 'bg-blue-100 text-blue-700',
};

const BADGE_CATALOG = [
  { key: 'rising_star', name: 'Rising Star', icon: '⭐', description: 'Showing wonderful progress' },
  { key: 'perfect_attendance', name: 'Perfect Attendance', icon: '🎯', description: "Didn't miss a class all term" },
  { key: 'pirouette_pro', name: 'Pirouette Pro', icon: '🩰', description: 'Mastered the pirouette' },
  { key: 'team_player', name: 'Team Player', icon: '🤝', description: 'Always encouraging classmates' },
  { key: 'most_improved', name: 'Most Improved', icon: '🌱', description: 'Incredible growth this term' },
  { key: 'confidence_star', name: 'Confidence Star', icon: '💪', description: 'Dancing with pride and confidence' },
];

function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantSeedPrompt, setAssistantSeedPrompt] = useState('');
  const [showBlogDialog, setShowBlogDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showNewsletterDialog, setShowNewsletterDialog] = useState(false);
  const [uploadingBlogImage, setUploadingBlogImage] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [horoscope, setHoroscope] = useState('');
  const [loadingHoroscope, setLoadingHoroscope] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    author: '',
    tags: [],
    featured_image: ''
  });
  const [newsletterForm, setNewsletterForm] = useState({
    subject: '',
    content: '',
    recipients: 'all'
  });
  const [tagInput, setTagInput] = useState('');

  // Schedule management
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classForm, setClassForm] = useState({
    class_name: '',
    day_of_week: 'monday',
    start_time: '',
    end_time: '',
    age_range: '',
    skill_level: 'all_levels',
    max_students: '',
    is_active: true
  });

  // Students & Parents directory
  const [studentSearch, setStudentSearch] = useState('');
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [badgeTargetDancer, setBadgeTargetDancer] = useState(null);
  const [selectedBadgeKey, setSelectedBadgeKey] = useState(BADGE_CATALOG[0].key);
  const [badgeNote, setBadgeNote] = useState('');

  // Registration -> Enrollment conversion
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertingRegistration, setConvertingRegistration] = useState(null);
  const [convertClassId, setConvertClassId] = useState('');

  // Messaging
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [broadcastForm, setBroadcastForm] = useState({
    segment: 'all',
    classId: '',
    skillLevel: 'beginner',
    channel: 'email',
    subject: '',
    body: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
        setBlogForm(prev => ({ ...prev, author: currentUser.full_name }));
      } catch (error) {
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => base44.entities.Registration.list('-created_date'),
    enabled: !!user,
  });

  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.list(),
    enabled: !!user,
  });

  const { data: pricing = [] } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => base44.entities.Pricing.list(),
    enabled: !!user,
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: () => base44.entities.BlogPost.list('-created_date'),
    enabled: !!user,
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_date'),
    enabled: !!user,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => base44.entities.Enrollment.list('-enrolled_date'),
    enabled: !!user,
  });

  const { data: dancers = [] } = useQuery({
    queryKey: ['dancers'],
    queryFn: () => base44.entities.DancerProfile.list(),
    enabled: !!user,
  });

  const { data: parentProfiles = [] } = useQuery({
    queryKey: ['parentProfiles'],
    queryFn: () => base44.entities.ParentProfile.list(),
    enabled: !!user,
  });

  const { data: dancerBadges = [] } = useQuery({
    queryKey: ['dancerBadges'],
    queryFn: () => base44.entities.DancerBadge.list(),
    enabled: !!user,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.Conversation.list('-last_message_at'),
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: threadMessages = [] } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => base44.entities.Message.filter({ conversation_id: activeConversationId }),
    enabled: !!user && !!activeConversationId,
    refetchInterval: 10000,
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: () => base44.entities.Broadcast.list('-created_date'),
    enabled: !!user,
  });

  // Get today's events
  const todayEvents = calendarEvents.filter(event => {
    const eventDate = new Date(event.start_date);
    return isSameDay(eventDate, new Date());
  });

  // Fetch horoscope on mount
  useEffect(() => {
    if (user) {
      fetchHoroscope();
    }
  }, [user]);

  const fetchHoroscope = async () => {
    setLoadingHoroscope(true);
    try {
      const today = format(new Date(), 'EEEE, MMMM d, yyyy');
      const prompt = `You are a warm, encouraging, and positive astrologer. Generate a daily horoscope for Virgo for ${today}. 
      
Make it:
- 2-3 sentences
- Relevant to running a small business (dance studio)
- Focus on creativity, organization, and working with children/families

Format: Just the horoscope text, no title or label.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      setHoroscope(result);
    } catch (error) {
      console.error('Error fetching horoscope:', error);
      setHoroscope('The stars are aligned in your favor today! Focus on what brings you joy. ✨');
    }
    setLoadingHoroscope(false);
  };

  const updateRegistrationMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Registration.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['registrations']);
      toast.success('Registration status updated');
    },
  });

  const createClassMutation = useMutation({
    mutationFn: (data) => base44.entities.ClassSchedule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['classSchedules']);
      setShowClassDialog(false);
      resetClassForm();
      toast.success('Class created');
    },
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClassSchedule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['classSchedules']);
      setShowClassDialog(false);
      resetClassForm();
      toast.success('Class updated');
    },
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id) => base44.entities.ClassSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['classSchedules']);
      toast.success('Class deleted');
    },
  });

  const promoteEnrollmentMutation = useMutation({
    mutationFn: async (enrollment) => {
      await base44.entities.Enrollment.update(enrollment.id, { status: 'active', waitlist_position: null });
      await base44.integrations.Core.SendEmail({
        from_name: "Sweetpeas Dance Studio",
        to: enrollment.parent_email,
        subject: `A spot opened up for ${enrollment.dancer_name}! 🌸`,
        body: `Great news! A spot has opened up in the class ${enrollment.dancer_name} was waitlisted for, and we've confirmed their enrollment. See you in class!`
      });
      return enrollment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollments']);
      toast.success('Promoted from waitlist and parent notified by email');
    },
    onError: () => toast.error('Failed to promote from waitlist'),
  });

  const convertRegistrationMutation = useMutation({
    mutationFn: async ({ registration, classScheduleId }) => {
      let parent = parentProfiles.find((p) => p.user_email === registration.parent_email);
      if (!parent) {
        parent = await base44.entities.ParentProfile.create({
          user_email: registration.parent_email,
          full_name: registration.parent_name,
          phone: registration.parent_phone || '',
          emergency_contact: registration.emergency_contact || '',
        });
      }

      const dancer = await base44.entities.DancerProfile.create({
        parent_email: registration.parent_email,
        name: registration.child_name,
        birthdate: registration.child_birthdate || undefined,
        notes: registration.special_notes || '',
      });

      const schedule = classSchedules.find((c) => c.id === classScheduleId);
      const activeCount = enrollments.filter((e) => e.class_schedule_id === classScheduleId && e.status === 'active').length;
      const isFull = schedule?.max_students && activeCount >= schedule.max_students;

      await base44.entities.Enrollment.create({
        dancer_id: dancer.id,
        dancer_name: dancer.name,
        parent_email: registration.parent_email,
        class_schedule_id: classScheduleId,
        status: isFull ? 'waitlisted' : 'active',
        enrolled_date: format(new Date(), 'yyyy-MM-dd'),
      });

      return { isFull };
    },
    onSuccess: ({ isFull }) => {
      queryClient.invalidateQueries(['enrollments']);
      queryClient.invalidateQueries(['dancers']);
      queryClient.invalidateQueries(['parentProfiles']);
      setShowConvertDialog(false);
      setConvertingRegistration(null);
      setConvertClassId('');
      toast.success(isFull ? 'Converted to enrollment — class is full, added to waitlist' : 'Converted to active enrollment');
    },
    onError: () => toast.error('Failed to convert registration'),
  });

  const resetClassForm = () => {
    setClassForm({
      class_name: '',
      day_of_week: 'monday',
      start_time: '',
      end_time: '',
      age_range: '',
      skill_level: 'all_levels',
      max_students: '',
      is_active: true
    });
    setSelectedClass(null);
  };

  const handleCreateClass = () => {
    resetClassForm();
    setShowClassDialog(true);
  };

  const handleEditClass = (schedule) => {
    setSelectedClass(schedule);
    setClassForm({
      class_name: schedule.class_name || '',
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      age_range: schedule.age_range || '',
      skill_level: schedule.skill_level || 'all_levels',
      max_students: schedule.max_students || '',
      is_active: schedule.is_active
    });
    setShowClassDialog(true);
  };

  const handleSaveClass = () => {
    if (!classForm.day_of_week || !classForm.start_time || !classForm.end_time) {
      toast.error('Please fill in day, start time, and end time');
      return;
    }
    const data = { ...classForm, max_students: classForm.max_students ? Number(classForm.max_students) : undefined };
    if (selectedClass) {
      updateClassMutation.mutate({ id: selectedClass.id, data });
    } else {
      createClassMutation.mutate(data);
    }
  };

  const openConvertDialog = (registration) => {
    setConvertingRegistration(registration);
    setConvertClassId('');
    setShowConvertDialog(true);
  };

  const openBadgeDialog = (dancer) => {
    setBadgeTargetDancer(dancer);
    setSelectedBadgeKey(BADGE_CATALOG[0].key);
    setBadgeNote('');
    setShowBadgeDialog(true);
  };

  const awardBadgeMutation = useMutation({
    mutationFn: () => {
      const badge = BADGE_CATALOG.find((b) => b.key === selectedBadgeKey);
      return base44.entities.DancerBadge.create({
        dancer_id: badgeTargetDancer.id,
        badge_key: badge.key,
        badge_name: badge.name,
        badge_icon: badge.icon,
        awarded_date: format(new Date(), 'yyyy-MM-dd'),
        awarded_by: user?.full_name || 'Admin',
        note: badgeNote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dancerBadges']);
      setShowBadgeDialog(false);
      toast.success(`Badge awarded to ${badgeTargetDancer.name}! 🎉`);
    },
  });

  const openConversationMutation = useMutation({
    mutationFn: (conversation) => base44.entities.Conversation.update(conversation.id, { unread_by_admin: false }),
    onSuccess: () => queryClient.invalidateQueries(['conversations']),
  });

  const selectConversation = (conversation) => {
    setActiveConversationId(conversation.id);
    setReplyText('');
    if (conversation.unread_by_admin) {
      openConversationMutation.mutate(conversation);
    }
  };

  const sendReplyMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Message.create({
        conversation_id: activeConversationId,
        sender_role: 'admin',
        sender_name: user?.full_name || 'Sweetpeas Dance Studio',
        body: replyText,
      });
      await base44.entities.Conversation.update(activeConversationId, {
        last_message_at: new Date().toISOString(),
        last_message_preview: replyText.slice(0, 140),
        unread_by_admin: false,
        unread_by_parent: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      queryClient.invalidateQueries(['conversations']);
      setReplyText('');
    },
    onError: () => toast.error('Failed to send reply'),
  });

  const closeConversationMutation = useMutation({
    mutationFn: (id) => base44.entities.Conversation.update(id, { status: 'closed' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['conversations']);
      toast.success('Conversation closed');
    },
  });

  const getBroadcastRecipients = () => {
    let matchedDancers = [];
    let label = '';

    if (broadcastForm.segment === 'all') {
      matchedDancers = dancers;
      label = 'All Families';
    } else if (broadcastForm.segment === 'class') {
      const schedule = classSchedules.find((c) => c.id === broadcastForm.classId);
      const activeParentEmails = new Set(
        enrollments.filter((e) => e.class_schedule_id === broadcastForm.classId && e.status === 'active').map((e) => e.parent_email)
      );
      matchedDancers = dancers.filter((d) => activeParentEmails.has(d.parent_email));
      label = schedule ? `${schedule.class_name || schedule.day_of_week} class` : 'Selected class';
    } else if (broadcastForm.segment === 'skill') {
      matchedDancers = dancers.filter((d) => d.skill_level === broadcastForm.skillLevel);
      label = `${broadcastForm.skillLevel} dancers`;
    } else if (broadcastForm.segment === 'waitlist') {
      const waitlistedEmails = new Set(enrollments.filter((e) => e.status === 'waitlisted').map((e) => e.parent_email));
      matchedDancers = dancers.filter((d) => waitlistedEmails.has(d.parent_email));
      label = 'Waitlisted families';
    }

    const unsubscribedEmails = new Set(parentProfiles.filter((p) => p.unsubscribed).map((p) => p.user_email));
    const uniqueEmails = [...new Set(matchedDancers.map((d) => d.parent_email))].filter((email) => !unsubscribedEmails.has(email));
    return { uniqueEmails, label };
  };

  const sendBroadcastMutation = useMutation({
    mutationFn: async () => {
      const { uniqueEmails, label } = getBroadcastRecipients();
      if (uniqueEmails.length === 0) {
        throw new Error('No recipients matched this segment');
      }

      let sentCount = 0;
      if (broadcastForm.channel === 'email') {
        await Promise.all(uniqueEmails.map((email) =>
          base44.integrations.Core.SendEmail({
            from_name: 'Sweetpeas Dance Studio',
            to: email,
            subject: broadcastForm.subject,
            body: broadcastForm.body,
          })
        ));
        sentCount = uniqueEmails.length;
      } else {
        const recipientsWithPhone = uniqueEmails
          .map((email) => parentProfiles.find((p) => p.user_email === email))
          .filter((p) => p?.phone);
        await Promise.all(recipientsWithPhone.map((p) =>
          base44.integrations.Core.SendSMS({ to: p.phone, body: broadcastForm.body })
        ));
        sentCount = recipientsWithPhone.length;
      }

      await base44.entities.Broadcast.create({
        type: broadcastForm.segment === 'all' ? 'broadcast' : 'segmented',
        channel: broadcastForm.channel,
        subject: broadcastForm.subject,
        body: broadcastForm.body,
        segment_label: label,
        recipient_count: sentCount,
        sent_by: user?.full_name || 'Admin',
      });

      return { sentCount, label };
    },
    onSuccess: ({ sentCount, label }) => {
      queryClient.invalidateQueries(['broadcasts']);
      setBroadcastForm({ segment: 'all', classId: '', skillLevel: 'beginner', channel: 'email', subject: '', body: '' });
      toast.success(`Sent to ${sentCount} recipient(s) — ${label}`);
    },
    onError: (err) => toast.error(err.message || 'Failed to send broadcast'),
  });

  const sendClassRemindersMutation = useMutation({
    mutationFn: async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const tomorrowDayName = format(tomorrow, 'EEEE').toLowerCase();
      const classesTomorrow = activeClassSchedules.filter((c) => c.day_of_week === tomorrowDayName);

      if (classesTomorrow.length === 0) {
        throw new Error(`No active classes scheduled for ${format(tomorrow, 'EEEE')}`);
      }

      let totalSent = 0;
      for (const schedule of classesTomorrow) {
        const activeForClass = enrollments.filter((e) => e.class_schedule_id === schedule.id && e.status === 'active');
        if (activeForClass.length === 0) continue;

        await Promise.all(activeForClass.map((e) =>
          base44.integrations.Core.SendEmail({
            from_name: 'Sweetpeas Dance Studio',
            to: e.parent_email,
            subject: `Reminder: ${e.dancer_name}'s class is tomorrow!`,
            body: `Hi there! Just a friendly reminder that ${e.dancer_name} has ${schedule.class_name || 'dance class'} tomorrow (${format(tomorrow, 'EEEE, MMMM d')}) from ${schedule.start_time} to ${schedule.end_time}. See you there! 🌸`,
          })
        ));
        totalSent += activeForClass.length;

        await base44.entities.Broadcast.create({
          type: 'reminder',
          channel: 'email',
          subject: `Class reminder: ${schedule.class_name || schedule.day_of_week}`,
          body: `Reminder sent to ${activeForClass.length} families for tomorrow's ${schedule.class_name || schedule.day_of_week} class.`,
          segment_label: schedule.class_name || `${schedule.day_of_week}s ${schedule.start_time}`,
          recipient_count: activeForClass.length,
          sent_by: user?.full_name || 'Admin',
        });
      }

      return totalSent;
    },
    onSuccess: (totalSent) => {
      queryClient.invalidateQueries(['broadcasts']);
      toast.success(`Sent ${totalSent} class reminder(s) for tomorrow`);
    },
    onError: (err) => toast.error(err.message || 'Failed to send reminders'),
  });

  const createBlogMutation = useMutation({
    mutationFn: (data) => base44.entities.BlogPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['blogPosts']);
      setShowBlogDialog(false);
      resetBlogForm();
      toast.success('Blog post created successfully');
    },
  });

  const updateBlogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BlogPost.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['blogPosts']);
      setShowBlogDialog(false);
      resetBlogForm();
      toast.success('Blog post updated successfully');
    },
  });

  const deleteBlogMutation = useMutation({
    mutationFn: (id) => base44.entities.BlogPost.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['blogPosts']);
      toast.success('Blog post deleted successfully');
    },
  });

  const resetBlogForm = () => {
    setBlogForm({
      title: '',
      content: '',
      excerpt: '',
      status: 'draft',
      author: user?.full_name || '',
      tags: [],
      featured_image: ''
    });
    setSelectedBlog(null);
    setTagInput('');
  };

  const handleCreateBlog = () => {
    setSelectedBlog(null);
    resetBlogForm();
    setShowBlogDialog(true);
  };

  const handleEditBlog = (blog) => {
    setSelectedBlog(blog);
    setBlogForm({
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt || '',
      status: blog.status,
      author: blog.author || user?.full_name,
      tags: blog.tags || [],
      featured_image: blog.featured_image || ''
    });
    setShowBlogDialog(true);
  };

  const handleSaveBlog = () => {
    if (!blogForm.title || !blogForm.content) {
      toast.error('Please fill in title and content');
      return;
    }

    const blogData = {
      ...blogForm,
      publish_date: blogForm.status === 'published' ? new Date().toISOString() : null,
      ai_generated: false
    };

    if (selectedBlog) {
      updateBlogMutation.mutate({ id: selectedBlog.id, data: blogData });
    } else {
      createBlogMutation.mutate(blogData);
    }
  };

  const handleGenerateBlog = async () => {
    setIsGenerating(true);
    try {
      const topics = [
        'Benefits of dance for preschoolers',
        'How to prepare your child for their first dance class',
        'The importance of creative movement in early childhood',
        'Building confidence through dance',
        'Fun dance activities to do at home with your preschooler',
        'Why preschoolers love creative dance (and the science behind it)',
        'Helping shy little ones feel brave in dance class',
        'What to expect in your child\'s first term of dance',
        'Simple ways dance builds gross motor skills ages 3-5',
        'How dance supports emotional regulation in young children',
        'Celebrating small wins: milestones in preschool dance',
        'Dance vs. other preschool activities: what makes it special',
      ];
      const topic = topics[Math.floor(Math.random() * topics.length)];
      const existingTitles = blogPosts.map(b => b.title).filter(Boolean);
      const prompt = `You are a professional content writer for Sweetpeas Dance Studio, a creative dance class for preschoolers ages 3-5.

Write an engaging, warm, and informative blog post specifically on this topic: "${topic}"

Take a fresh, unique angle — don't just list generic facts. Use a concrete story, a surprising insight, or a specific tip parents won't have heard before.${existingTitles.length ? `\n\nThese posts already exist, so write something genuinely different in title and content:\n${existingTitles.map(t => `- ${t}`).join('\n')}` : ''}

Format the body as clean, well-structured HTML for a professional blog layout:
- Start with a 2-3 sentence intro paragraph in a <p> that hooks the reader
- Use <h2> subheadings to break the post into clear sections
- Use short <p> paragraphs (2-4 sentences) and <ul><li> bullet lists for tips/steps
- Wrap emphasized terms in <strong>
- End with a warm closing <p> and an optional call to action
- Do NOT include a top-level <h1> (the title is rendered separately); do NOT wrap the whole response in <html> or <body>

The blog post should:
- Be 500-800 words
- Have a catchy, friendly title (different from the topic heading above)
- Include practical tips or advice for parents
- Be warm and encouraging in tone
- Include a brief excerpt/summary (2-3 sentences)
- Suggest 3-5 relevant tags

Format your response as JSON with this structure:
{
  "title": "Blog post title",
  "content": "Full blog post content in HTML format",
  "excerpt": "Brief 2-3 sentence summary",
  "tags": ["tag1", "tag2", "tag3"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            excerpt: { type: "string" },
            tags: { type: "array", items: { type: "string" } }
          }
        }
      });

      setBlogForm({
        title: result.title,
        content: result.content,
        excerpt: result.excerpt,
        status: 'draft',
        author: user?.full_name || '',
        tags: result.tags || [],
        featured_image: '',
        ai_generated: true
      });

      setSelectedBlog(null);
      setShowBlogDialog(true);
      toast.success('Blog post generated! Review and edit before publishing.');
    } catch (error) {
      console.error('Error generating blog:', error);
      toast.error('Failed to generate blog post. Please try again.');
    }
    setIsGenerating(false);
  };

  const handleGenerateNewsletter = async () => {
    setIsGenerating(true);
    try {
      const recentRegistrations = registrations.slice(0, 5);
      const prompt = `You are writing a newsletter for Sweetpeas Dance Studio, a creative dance class for preschoolers.

Create a warm, engaging newsletter for parents. Include:
- A friendly greeting
- Highlight of recent registrations or class activities (we have ${registrations.length} total students enrolled)
- Upcoming class schedule or important dates
- A helpful tip about dance or child development
- A warm closing encouraging parents to reach out with questions

Recent activity: ${recentRegistrations.length} new registrations this week

Keep it conversational, warm, and under 400 words. Format in markdown.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt
      });

      setNewsletterForm({
        subject: 'News from Sweetpeas Dance Studio 💃',
        content: result,
        recipients: 'all'
      });

      setShowNewsletterDialog(true);
      toast.success('Newsletter draft created! Review before sending.');
    } catch (error) {
      console.error('Error generating newsletter:', error);
      toast.error('Failed to generate newsletter. Please try again.');
    }
    setIsGenerating(false);
  };

  const handleSendNewsletter = async () => {
    if (!newsletterForm.subject || !newsletterForm.content) {
      toast.error('Please fill in subject and content');
      return;
    }

    try {
      let recipients = [];
      
      if (newsletterForm.recipients === 'all') {
        recipients = registrations.map(r => r.parent_email);
      } else if (newsletterForm.recipients === 'confirmed') {
        recipients = registrations.filter(r => r.status === 'confirmed').map(r => r.parent_email);
      } else if (newsletterForm.recipients === 'pending') {
        recipients = registrations.filter(r => r.status === 'pending').map(r => r.parent_email);
      }
      
      if (recipients.length === 0) {
        toast.error('No recipients found');
        return;
      }

      toast.info(`Sending newsletter to ${recipients.length} recipients...`);

      await Promise.all(recipients.map(email => 
        base44.integrations.Core.SendEmail({
          from_name: "Sweetpeas Dance Studio",
          to: email,
          subject: newsletterForm.subject,
          body: newsletterForm.content
        })
      ));

      await base44.entities.Broadcast.create({
        type: 'newsletter',
        channel: 'email',
        subject: newsletterForm.subject,
        body: newsletterForm.content,
        segment_label: newsletterForm.recipients === 'all' ? 'All Parents' : newsletterForm.recipients === 'confirmed' ? 'Confirmed Only' : 'Pending Only',
        recipient_count: recipients.length,
        sent_by: user?.full_name || 'Admin',
      });
      queryClient.invalidateQueries(['broadcasts']);

      toast.success(`Newsletter sent to ${recipients.length} recipients!`);
      setShowNewsletterDialog(false);
      setNewsletterForm({ subject: '', content: '', recipients: 'all' });
    } catch (error) {
      console.error('Error sending newsletter:', error);
      toast.error('Failed to send newsletter');
    }
  };

  const handleBlogImageUpload = async (file) => {
    if (!file) return;
    setUploadingBlogImage(true);
    try {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      setBlogForm((prev) => ({ ...prev, featured_image: uploaded?.file_url || '' }));
      toast.success('Image uploaded');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingBlogImage(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !blogForm.tags.includes(tagInput.trim())) {
      setBlogForm({ ...blogForm, tags: [...blogForm.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setBlogForm({ ...blogForm, tags: blogForm.tags.filter(t => t !== tag) });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;
  const publishedBlogs = blogPosts.filter(b => b.status === 'published').length;
  const draftBlogs = blogPosts.filter(b => b.status === 'draft').length;
  const activeEnrollmentCount = enrollments.filter(e => e.status === 'active').length;
  const waitlistedCount = enrollments.filter(e => e.status === 'waitlisted').length;
  const activeClassSchedules = classSchedules.filter(c => c.is_active);
  const unreadConversationCount = conversations.filter(c => c.unread_by_admin).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-rose-800 mb-2">
            Welcome back, Fiona! 👋
          </h1>
          <p className="text-gray-600">Manage your studio, registrations, and content all in one place.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Pending</p>
                  <p className="text-3xl font-bold text-blue-800">{pendingCount}</p>
                </div>
                <Clock className="w-10 h-10 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Confirmed</p>
                  <p className="text-3xl font-bold text-green-800">{confirmedCount}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Students</p>
                  <p className="text-3xl font-bold text-purple-800">{registrations.length}</p>
                </div>
                <Users className="w-10 h-10 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-rose-600 font-medium">Published Blogs</p>
                  <p className="text-3xl font-bold text-rose-800">{publishedBlogs}</p>
                </div>
                <FileText className="w-10 h-10 text-rose-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-rose-200 w-full justify-start overflow-x-auto flex-nowrap [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="today" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <CalendarCheck className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="registrations" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <Users className="w-4 h-4 mr-2" />
              Registrations
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <UserPlus className="w-4 h-4 mr-2" />
              Students & Parents
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <Inbox className="w-4 h-4 mr-2" />
              Messages
              {unreadConversationCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{unreadConversationCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <Mail className="w-4 h-4 mr-2" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <Share2 className="w-4 h-4 mr-2" />
              Social
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <Users className="w-4 h-4 mr-2" />
              Community
            </TabsTrigger>
            <TabsTrigger value="growth" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <TrendingUp className="w-4 h-4 mr-2" />
              Growth
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <DollarSign className="w-4 h-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-rose-100 flex-shrink-0">
              <FileText className="w-4 h-4 mr-2" />
              Content & Blogs
            </TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today">
            <OverviewTab
              todayEvents={todayEvents}
              loadingHoroscope={loadingHoroscope}
              horoscope={horoscope}
              onRefreshHoroscope={fetchHoroscope}
              pendingCount={pendingCount}
              confirmedCount={confirmedCount}
              activeEnrollmentCount={activeEnrollmentCount}
              waitlistedCount={waitlistedCount}
              unreadConversationCount={unreadConversationCount}
              activeClassSchedules={activeClassSchedules}
              enrollments={enrollments}
              onAskAI={(prompt) => { setAssistantSeedPrompt(prompt); setShowAssistant(true); }}
            />
          </TabsContent>

          {/* Registrations Tab */}
          <TabsContent value="registrations">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-rose-800">Student Registrations</CardTitle>
                <CardDescription>View and manage all student registrations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {registrations.map((reg) => (
                    <Card key={reg.id} className="border-rose-200/50">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-800">{reg.child_name}</h3>
                              <Badge
                                className={
                                  reg.status === 'confirmed'
                                    ? 'bg-green-100 text-green-700'
                                    : reg.status === 'pending'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-orange-100 text-orange-700'
                                }
                              >
                                {reg.status}
                              </Badge>
                            </div>
                            <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                              <p><span className="font-medium">Parent:</span> {reg.parent_name}</p>
                              <p><span className="font-medium">Age:</span> {reg.child_age} years</p>
                              <p><span className="font-medium">Email:</span> {reg.parent_email}</p>
                              <p><span className="font-medium">Phone:</span> {reg.parent_phone || 'N/A'}</p>
                              <p className="md:col-span-2"><span className="font-medium">Emergency:</span> {reg.emergency_contact || 'N/A'}</p>
                              {reg.special_notes && (
                                <p className="md:col-span-2"><span className="font-medium">Notes:</span> {reg.special_notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {reg.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => updateRegistrationMutation.mutate({ id: reg.id, status: 'confirmed' })}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Confirm
                              </Button>
                            )}
                            {reg.status === 'confirmed' && (
                              <Button
                                size="sm"
                                onClick={() => openConvertDialog(reg)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <ListPlus className="w-4 h-4 mr-1" />
                                Convert to Enrollment
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.location.href = `mailto:${reg.parent_email}`}
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              Email
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {registrations.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No registrations yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students & Parents Tab */}
          <TabsContent value="students">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-rose-800">Students & Parents Directory</CardTitle>
                <CardDescription>Search all enrolled families by dancer, parent name, or email</CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by dancer, parent, or email..."
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dancers
                    .filter((dancer) => {
                      const parent = parentProfiles.find((p) => p.user_email === dancer.parent_email);
                      const haystack = `${dancer.name} ${parent?.full_name || ''} ${dancer.parent_email}`.toLowerCase();
                      return haystack.includes(studentSearch.toLowerCase());
                    })
                    .map((dancer) => {
                      const parent = parentProfiles.find((p) => p.user_email === dancer.parent_email);
                      const dancerEnrollments = enrollments.filter((e) => e.dancer_id === dancer.id);
                      return (
                        <Card key={dancer.id} className="border-rose-200/50">
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-800">{dancer.name}</h3>
                                  {dancer.skill_level && (
                                    <Badge variant="outline" className="capitalize">{dancer.skill_level}</Badge>
                                  )}
                                  {parent?.unsubscribed && (
                                    <Badge className="bg-gray-200 text-gray-600">Unsubscribed from emails</Badge>
                                  )}
                                </div>
                                <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                                  <p><span className="font-medium">Parent:</span> {parent?.full_name || 'No profile yet'}</p>
                                  <p><span className="font-medium">Email:</span> {dancer.parent_email}</p>
                                  <p><span className="font-medium">Phone:</span> {parent?.phone || 'N/A'}</p>
                                  <p><span className="font-medium">Emergency:</span> {parent?.emergency_contact || 'N/A'}</p>
                                  {dancer.notes && (
                                    <p className="md:col-span-2"><span className="font-medium">Notes:</span> {dancer.notes}</p>
                                  )}
                                </div>
                                {dancerEnrollments.length > 0 && (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {dancerEnrollments.map((e) => {
                                      const schedule = classSchedules.find((c) => c.id === e.class_schedule_id);
                                      return (
                                        <Badge key={e.id} className={STATUS_BADGE_STYLES[e.status] || 'bg-gray-100 text-gray-700'}>
                                          {schedule ? `${schedule.class_name || schedule.day_of_week}` : 'Class'} · {e.status}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                                {dancerBadges.filter((b) => b.dancer_id === dancer.id).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {dancerBadges.filter((b) => b.dancer_id === dancer.id).map((b) => (
                                      <Badge key={b.id} variant="outline" className="border-purple-200 text-purple-700">
                                        {b.badge_icon} {b.badge_name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => openBadgeDialog(dancer)}>
                                  🏅 Award Badge
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.location.href = `mailto:${dancer.parent_email}`}
                                >
                                  <Mail className="w-4 h-4 mr-1" />
                                  Email
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  {dancers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No students enrolled yet</p>
                      <p className="text-sm mt-2">Convert a confirmed registration to get started</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Tabs defaultValue="inbox" className="space-y-4">
              <TabsList className="bg-white border border-rose-100">
                <TabsTrigger value="inbox">
                  <Inbox className="w-4 h-4 mr-2" />
                  Inbox
                  {unreadConversationCount > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white">{unreadConversationCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="broadcast">
                  <Megaphone className="w-4 h-4 mr-2" />
                  Broadcast
                </TabsTrigger>
                <TabsTrigger value="reminders">
                  <BellRing className="w-4 h-4 mr-2" />
                  Reminders
                </TabsTrigger>
                <TabsTrigger value="log">
                  <FileText className="w-4 h-4 mr-2" />
                  Sent Log
                </TabsTrigger>
              </TabsList>

              {/* Inbox */}
              <TabsContent value="inbox">
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-white/80 backdrop-blur-sm md:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-rose-800 text-base">Conversations</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y max-h-[500px] overflow-y-auto">
                        {conversations.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => selectConversation(c)}
                            className={`w-full text-left p-4 hover:bg-rose-50 transition-colors ${activeConversationId === c.id ? 'bg-rose-50' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-gray-800 truncate">{c.parent_name || c.parent_email}</p>
                              {c.unread_by_admin && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{c.last_message_preview}</p>
                          </button>
                        ))}
                        {conversations.length === 0 && (
                          <p className="p-6 text-center text-gray-500 text-sm">No conversations yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/80 backdrop-blur-sm md:col-span-2 flex flex-col">
                    {activeConversationId ? (
                      <>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="text-rose-800 text-base">
                            {conversations.find((c) => c.id === activeConversationId)?.parent_name ||
                              conversations.find((c) => c.id === activeConversationId)?.parent_email}
                          </CardTitle>
                          <Button size="sm" variant="outline" onClick={() => closeConversationMutation.mutate(activeConversationId)}>
                            Close Conversation
                          </Button>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-3">
                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                            {[...threadMessages]
                              .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                              .map((m) => (
                                <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                      m.sender_role === 'admin' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {m.body}
                                  </div>
                                </div>
                              ))}
                            {threadMessages.length === 0 && (
                              <p className="text-center text-gray-500 text-sm py-8">No messages in this conversation yet</p>
                            )}
                          </div>
                          <div className="flex gap-2 mt-auto">
                            <Textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type a reply..."
                              rows={2}
                            />
                            <Button
                              onClick={() => sendReplyMutation.mutate()}
                              disabled={!replyText.trim()}
                              className="bg-rose-600 hover:bg-rose-700"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </>
                    ) : (
                      <CardContent className="flex-1 flex items-center justify-center text-gray-500 py-20">
                        Select a conversation to view messages
                      </CardContent>
                    )}
                  </Card>
                </div>
              </TabsContent>

              {/* Broadcast */}
              <TabsContent value="broadcast">
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-rose-800">Broadcast & Segmented Messaging</CardTitle>
                    <CardDescription>Send an announcement to everyone, or target a specific class, skill level, or the waitlist</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Send To</Label>
                        <Select value={broadcastForm.segment} onValueChange={(value) => setBroadcastForm({ ...broadcastForm, segment: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Families</SelectItem>
                            <SelectItem value="class">Specific Class</SelectItem>
                            <SelectItem value="skill">Skill Level</SelectItem>
                            <SelectItem value="waitlist">Waitlisted Families</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Channel</Label>
                        <Select value={broadcastForm.channel} onValueChange={(value) => setBroadcastForm({ ...broadcastForm, channel: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {broadcastForm.segment === 'class' && (
                        <div className="md:col-span-2">
                          <Label>Class</Label>
                          <Select value={broadcastForm.classId} onValueChange={(value) => setBroadcastForm({ ...broadcastForm, classId: value })}>
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
                      {broadcastForm.segment === 'skill' && (
                        <div className="md:col-span-2">
                          <Label>Skill Level</Label>
                          <Select value={broadcastForm.skillLevel} onValueChange={(value) => setBroadcastForm({ ...broadcastForm, skillLevel: value })}>
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
                    {broadcastForm.channel === 'email' && (
                      <div>
                        <Label>Subject</Label>
                        <Input
                          value={broadcastForm.subject}
                          onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                          placeholder="e.g. Studio closed for public holiday"
                        />
                      </div>
                    )}
                    <div>
                      <Label>Message</Label>
                      <Textarea
                        value={broadcastForm.body}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                        rows={6}
                        placeholder="Write your message..."
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      {(() => {
                        const { uniqueEmails, label } = getBroadcastRecipients();
                        return `Will send to ${uniqueEmails.length} recipient(s) — ${label}`;
                      })()}
                    </p>
                    <Button
                      onClick={() => sendBroadcastMutation.mutate()}
                      disabled={
                        !broadcastForm.body ||
                        (broadcastForm.channel === 'email' && !broadcastForm.subject) ||
                        (broadcastForm.segment === 'class' && !broadcastForm.classId)
                      }
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reminders */}
              <TabsContent value="reminders">
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-rose-800">Class Reminders</CardTitle>
                    <CardDescription>Send an email reminder to every family with an active enrollment in tomorrow&apos;s classes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Tomorrow is <span className="font-medium">{format(new Date(Date.now() + 86400000), 'EEEE, MMMM d')}</span>.{' '}
                      {activeClassSchedules.filter((c) => c.day_of_week === format(new Date(Date.now() + 86400000), 'EEEE').toLowerCase()).length} active class(es) scheduled.
                    </p>
                    <Button onClick={() => sendClassRemindersMutation.mutate()} className="bg-rose-600 hover:bg-rose-700">
                      <BellRing className="w-4 h-4 mr-2" />
                      Send Tomorrow&apos;s Class Reminders
                    </Button>
                    <p className="text-xs text-gray-500">
                      Fee-due and recital rehearsal reminders will be available once billing and recital management are set up.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sent Log */}
              <TabsContent value="log">
                <Card className="bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-rose-800">Sent Message Log</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {broadcasts.map((b) => (
                        <div key={b.id} className="flex items-center justify-between p-3 border border-rose-100 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-800">{b.subject || b.segment_label}</p>
                            <p className="text-xs text-gray-500">
                              {b.segment_label} · {b.channel} · {b.recipient_count} recipient(s)
                              {b.created_date && ` · ${new Date(b.created_date).toLocaleString()}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">{b.type}</Badge>
                        </div>
                      ))}
                      {broadcasts.length === 0 && (
                        <p className="text-center text-gray-500 py-8 text-sm">Nothing sent yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Tabs defaultValue="build" className="space-y-4">
              <TabsList className="bg-white border border-rose-100">
                <TabsTrigger value="build">
                  <Mail className="w-4 h-4 mr-2" />
                  Build
                </TabsTrigger>
                <TabsTrigger value="sequences">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Sequences
                </TabsTrigger>
              </TabsList>
              <TabsContent value="build">
                <CampaignBuilder />
              </TabsContent>
              <TabsContent value="sequences">
                <SequenceManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social">
            <SocialScheduler />
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community">
            <Tabs defaultValue="feed" className="space-y-4">
              <TabsList className="bg-white border border-rose-100">
                <TabsTrigger value="feed">Community Feed</TabsTrigger>
                <TabsTrigger value="resources">Resource Library</TabsTrigger>
              </TabsList>
              <TabsContent value="feed">
                <CommunityFeed currentUserEmail={user?.email} currentUserName={user?.full_name || 'Sweetpeas Dance Studio'} isAdmin />
              </TabsContent>
              <TabsContent value="resources">
                <ResourceLibrary isAdmin />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Growth Tab */}
          <TabsContent value="growth">
            <Tabs defaultValue="landing-pages" className="space-y-4">
              <TabsList className="bg-white border border-rose-100">
                <TabsTrigger value="landing-pages">Landing Pages</TabsTrigger>
                <TabsTrigger value="referrals">Referrals</TabsTrigger>
                <TabsTrigger value="promo-codes">Promo Codes</TabsTrigger>
              </TabsList>
              <TabsContent value="landing-pages">
                <LandingPageBuilder />
              </TabsContent>
              <TabsContent value="referrals">
                <ReferralManager />
              </TabsContent>
              <TabsContent value="promo-codes">
                <PromoCodeManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <CalendarView />
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-rose-800">Class Schedule Management</CardTitle>
                  <CardDescription>Create, edit, and manage classes, capacity, and waitlists</CardDescription>
                </div>
                <Button onClick={handleCreateClass} className="bg-rose-600 hover:bg-rose-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classSchedules.map((schedule) => {
                    const classEnrollments = enrollments.filter((e) => e.class_schedule_id === schedule.id);
                    const activeCount = classEnrollments.filter((e) => e.status === 'active').length;
                    const waitlisted = classEnrollments.filter((e) => e.status === 'waitlisted');
                    const isFull = schedule.max_students && activeCount >= schedule.max_students;

                    return (
                      <Card key={schedule.id} className="border-rose-200/50">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-800">
                                {schedule.class_name || 'Untitled Class'} <span className="capitalize text-gray-500">· {schedule.day_of_week}s</span>
                              </p>
                              <p className="text-gray-600">{schedule.start_time} - {schedule.end_time}</p>
                              <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
                                {schedule.age_range && <span>Ages: {schedule.age_range}</span>}
                                {schedule.skill_level && <span className="capitalize">· {schedule.skill_level.replace('_', ' ')}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={isFull ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}>
                                {activeCount}{schedule.max_students ? `/${schedule.max_students}` : ''} enrolled
                              </Badge>
                              <Badge className={schedule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                {schedule.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              <Button size="sm" variant="outline" onClick={() => handleEditClass(schedule)}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  if (confirm('Delete this class? This cannot be undone.')) {
                                    deleteClassMutation.mutate(schedule.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {waitlisted.length > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                              <p className="text-sm font-medium text-orange-800 flex items-center gap-2">
                                <Bell className="w-4 h-4" /> Waitlist ({waitlisted.length})
                              </p>
                              {waitlisted.map((e) => (
                                <div key={e.id} className="flex items-center justify-between text-sm">
                                  <span>{e.dancer_name} <span className="text-gray-500">({e.parent_email})</span></span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-700 border-orange-300"
                                    onClick={() => promoteEnrollmentMutation.mutate(e)}
                                  >
                                    Promote & Notify
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {classSchedules.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No classes yet — add your first one!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-rose-800">Pricing Management</CardTitle>
                <CardDescription>Manage your pricing and session costs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pricing.map((price) => (
                    <Card key={price.id} className="border-rose-200/50">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold text-gray-800">{price.session_name}</h3>
                          <Badge className={price.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {price.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-2xl font-bold text-rose-600">${price.price}</p>
                            <p className="text-sm text-gray-600">per term</p>
                          </div>
                          {price.single_class_price && (
                            <div>
                              <p className="text-2xl font-bold text-rose-600">${price.single_class_price}</p>
                              <p className="text-sm text-gray-600">drop-in class</p>
                            </div>
                          )}
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Duration:</span> {price.duration}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Sessions:</span> {price.sessions_count} weeks
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <p className="text-sm text-gray-500 mt-4">
                    To add or edit pricing, go to Dashboard → Data → Pricing
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content & Blogs Tab */}
          <TabsContent value="content">
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200">
                  <CardContent className="p-6">
                    <FileText className="w-8 h-8 text-rose-600 mb-3" />
                    <h3 className="font-semibold text-gray-800 mb-2">Create Blog Post</h3>
                    <p className="text-sm text-gray-600 mb-4">Write a new blog post from scratch</p>
                    <Button onClick={handleCreateBlog} className="w-full bg-rose-600 hover:bg-rose-700">
                      <Plus className="w-4 h-4 mr-2" />
                      New Post
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-6">
                    <Sparkles className="w-8 h-8 text-purple-600 mb-3" />
                    <h3 className="font-semibold text-gray-800 mb-2">AI Blog Generator</h3>
                    <p className="text-sm text-gray-600 mb-4">Generate blog content with AI</p>
                    <Button 
                      onClick={handleGenerateBlog}
                      disabled={isGenerating}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate Blog
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardContent className="p-6">
                    <Mail className="w-8 h-8 text-blue-600 mb-3" />
                    <h3 className="font-semibold text-gray-800 mb-2">Create Newsletter</h3>
                    <p className="text-sm text-gray-600 mb-4">Draft and send newsletters to parents</p>
                    <Button 
                      onClick={handleGenerateNewsletter}
                      disabled={isGenerating}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          New Newsletter
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Blog Posts List */}
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-rose-800">Blog Posts</CardTitle>
                  <CardDescription>
                    {publishedBlogs} published • {draftBlogs} drafts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {blogPosts.map((blog) => (
                      <Card key={blog.id} className="border-rose-200/50">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-800">{blog.title}</h3>
                                <Badge
                                  className={
                                    blog.status === 'published'
                                      ? 'bg-green-100 text-green-700'
                                      : blog.status === 'draft'
                                      ? 'bg-gray-100 text-gray-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }
                                >
                                  {blog.status}
                                </Badge>
                                {blog.ai_generated && (
                                  <Badge className="bg-purple-100 text-purple-700">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI Generated
                                  </Badge>
                                )}
                              </div>
                              {blog.excerpt && (
                                <p className="text-sm text-gray-600 mb-2">{blog.excerpt}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {blog.tags?.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500">
                                By {blog.author} • {blog.created_date ? new Date(blog.created_date).toLocaleDateString() : 'No date'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedBlog(blog);
                                  setShowPreviewDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditBlog(blog)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this blog post?')) {
                                    deleteBlogMutation.mutate(blog.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {blogPosts.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-2">No blog posts yet</p>
                        <p className="text-sm">Create your first post or use AI to generate one!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Blog Dialog */}
        <Dialog open={showBlogDialog} onOpenChange={setShowBlogDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="blog-title">Title *</Label>
                <Input
                  id="blog-title"
                  value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  placeholder="Enter blog post title"
                />
              </div>
              <div>
                <Label htmlFor="blog-excerpt">Excerpt</Label>
                <Textarea
                  id="blog-excerpt"
                  value={blogForm.excerpt}
                  onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                  placeholder="Brief summary of the post"
                  rows={2}
                />
              </div>
              <div>
                <Label>Content *</Label>
                <ReactQuill
                  value={blogForm.content}
                  onChange={(content) => setBlogForm({ ...blogForm, content })}
                  className="bg-white"
                  theme="snow"
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="blog-author">Author</Label>
                  <Input
                    id="blog-author"
                    value={blogForm.author}
                    onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                    placeholder="Author name"
                  />
                </div>
                <div>
                  <Label htmlFor="blog-status">Status</Label>
                  <Select
                    value={blogForm.status}
                    onValueChange={(value) => setBlogForm({ ...blogForm, status: value })}
                  >
                    <SelectTrigger id="blog-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="blog-image">Featured Image</Label>
                {blogForm.featured_image ? (
                  <div className="relative rounded-lg overflow-hidden border border-rose-200">
                    <img src={blogForm.featured_image} alt="Featured preview" className="w-full h-48 object-cover" />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setBlogForm((prev) => ({ ...prev, featured_image: '' }))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-rose-200 rounded-lg p-6 cursor-pointer hover:bg-rose-50/50 transition-colors">
                    {uploadingBlogImage ? (
                      <>
                        <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                        <span className="text-sm text-gray-500">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="w-6 h-6 text-rose-400" />
                        <span className="text-sm text-gray-500">Click to upload a featured image</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBlogImageUpload(e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag and press Enter"
                  />
                  <Button type="button" onClick={addTag} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {blogForm.tags.map(tag => (
                    <Badge key={tag} className="bg-rose-100 text-rose-700">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-rose-900"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBlogDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBlog} className="bg-rose-600 hover:bg-rose-700">
                {selectedBlog ? 'Update Post' : 'Create Post'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview: {selectedBlog?.title}</DialogTitle>
            </DialogHeader>
            <div className="prose max-w-none">
              {selectedBlog?.featured_image && (
                <img 
                  src={selectedBlog.featured_image} 
                  alt={selectedBlog.title}
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
              )}
              <h1>{selectedBlog?.title}</h1>
              {selectedBlog?.excerpt && (
                <p className="text-lg text-gray-600 italic">{selectedBlog.excerpt}</p>
              )}
              <BlogContent content={selectedBlog?.content} />
              {selectedBlog?.tags && selectedBlog.tags.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {selectedBlog.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
              {selectedBlog?.status === 'published' && (
                <div className="mt-6 pt-4 border-t not-prose">
                  <p className="text-sm text-gray-500 mb-2">Share this post</p>
                  <ShareButtons
                    url={`${window.location.origin}${createPageUrl('Blog')}?post=${selectedBlog.id}`}
                    title={selectedBlog.title}
                    text={selectedBlog.excerpt || selectedBlog.title}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Newsletter Dialog */}
        <Dialog open={showNewsletterDialog} onOpenChange={setShowNewsletterDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Newsletter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newsletter-subject">Subject Line</Label>
                <Input
                  id="newsletter-subject"
                  value={newsletterForm.subject}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, subject: e.target.value })}
                  placeholder="Newsletter subject"
                />
              </div>
              <div>
                <Label htmlFor="newsletter-recipients">Recipients</Label>
                <Select
                  value={newsletterForm.recipients}
                  onValueChange={(value) => setNewsletterForm({ ...newsletterForm, recipients: value })}
                >
                  <SelectTrigger id="newsletter-recipients">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parents ({registrations.length})</SelectItem>
                    <SelectItem value="confirmed">Confirmed Only ({confirmedCount})</SelectItem>
                    <SelectItem value="pending">Pending Only ({pendingCount})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={newsletterForm.content}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, content: e.target.value })}
                  placeholder="Newsletter content"
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Preview:</h4>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{newsletterForm.content}</ReactMarkdown>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewsletterDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendNewsletter} 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newsletterForm.subject || !newsletterForm.content}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Newsletter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Class Dialog */}
        <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedClass ? 'Edit Class' : 'Add New Class'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="class-name">Class Name</Label>
                <Input
                  id="class-name"
                  value={classForm.class_name}
                  onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })}
                  placeholder="e.g., Tiny Twirlers"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="class-day">Day of Week</Label>
                  <Select value={classForm.day_of_week} onValueChange={(value) => setClassForm({ ...classForm, day_of_week: value })}>
                    <SelectTrigger id="class-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <SelectItem key={day} value={day} className="capitalize">{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class-skill">Skill Level</Label>
                  <Select value={classForm.skill_level} onValueChange={(value) => setClassForm({ ...classForm, skill_level: value })}>
                    <SelectTrigger id="class-skill">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_levels">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="class-start">Start Time</Label>
                  <Input
                    id="class-start"
                    value={classForm.start_time}
                    onChange={(e) => setClassForm({ ...classForm, start_time: e.target.value })}
                    placeholder="10:00 AM"
                  />
                </div>
                <div>
                  <Label htmlFor="class-end">End Time</Label>
                  <Input
                    id="class-end"
                    value={classForm.end_time}
                    onChange={(e) => setClassForm({ ...classForm, end_time: e.target.value })}
                    placeholder="10:45 AM"
                  />
                </div>
                <div>
                  <Label htmlFor="class-age">Age Range</Label>
                  <Input
                    id="class-age"
                    value={classForm.age_range}
                    onChange={(e) => setClassForm({ ...classForm, age_range: e.target.value })}
                    placeholder="e.g., 3-5 years"
                  />
                </div>
                <div>
                  <Label htmlFor="class-capacity">Capacity</Label>
                  <Input
                    id="class-capacity"
                    type="number"
                    min="1"
                    value={classForm.max_students}
                    onChange={(e) => setClassForm({ ...classForm, max_students: e.target.value })}
                    placeholder="e.g., 12"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="class-active"
                  type="checkbox"
                  checked={classForm.is_active}
                  onChange={(e) => setClassForm({ ...classForm, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="class-active">Class is active and open for enrollment</Label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              {selectedClass && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Delete this class? This cannot be undone.')) {
                      deleteClassMutation.mutate(selectedClass.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowClassDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveClass} className="bg-rose-600 hover:bg-rose-700">
                {selectedClass ? 'Update Class' : 'Create Class'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Convert Registration to Enrollment Dialog */}
        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert to Enrollment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                This creates a family profile and dancer profile for <span className="font-medium">{convertingRegistration?.child_name}</span>, then enrolls them in the class you choose below.
              </p>
              <div>
                <Label htmlFor="convert-class">Class</Label>
                <Select value={convertClassId} onValueChange={setConvertClassId}>
                  <SelectTrigger id="convert-class">
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {classSchedules.filter((c) => c.is_active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.class_name ? `${c.class_name} — ` : ''}{c.day_of_week}s {c.start_time}-{c.end_time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConvertDialog(false)}>Cancel</Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                disabled={!convertClassId}
                onClick={() => convertRegistrationMutation.mutate({ registration: convertingRegistration, classScheduleId: convertClassId })}
              >
                <ListPlus className="w-4 h-4 mr-2" />
                Convert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Award Badge Dialog */}
        <Dialog open={showBadgeDialog} onOpenChange={setShowBadgeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Award a Badge to {badgeTargetDancer?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Badge</Label>
                <Select value={selectedBadgeKey} onValueChange={setSelectedBadgeKey}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BADGE_CATALOG.map((b) => (
                      <SelectItem key={b.key} value={b.key}>
                        {b.icon} {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {BADGE_CATALOG.find((b) => b.key === selectedBadgeKey)?.description}
                </p>
              </div>
              <div>
                <Label>Note (optional)</Label>
                <Textarea value={badgeNote} onChange={(e) => setBadgeNote(e.target.value)} rows={2} placeholder="A personal note about why they earned this" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBadgeDialog(false)}>Cancel</Button>
              <Button className="bg-rose-600 hover:bg-rose-700" onClick={() => awardBadgeMutation.mutate()}>
                Award Badge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Assistant Button */}
        <Button
          onClick={() => setShowAssistant(true)}
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all z-40"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        {/* AI Assistant Chat */}
        <AssistantChat
          isOpen={showAssistant}
          onClose={() => setShowAssistant(false)}
          seedPrompt={assistantSeedPrompt}
          onSeedConsumed={() => setAssistantSeedPrompt('')}
        />
      </div>
    </div>
  );
}

export default Admin;