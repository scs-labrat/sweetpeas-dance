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
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import CalendarView from "../components/admin/CalendarView";
import AssistantChat from "../components/admin/AssistantChat";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ReactMarkdown from 'react-markdown';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showBlogDialog, setShowBlogDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showNewsletterDialog, setShowNewsletterDialog] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const updateRegistrationMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Registration.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['registrations']);
      toast.success('Registration status updated');
    },
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
      publish_date: blogForm.status === 'published' ? new Date().toISOString() : null
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
      const prompt = `You are a professional content writer for Sweetpeas Dance Studio, a creative dance class for preschoolers ages 3-5.

Write an engaging, warm, and informative blog post about one of these topics (choose the most relevant):
- Benefits of dance for preschoolers
- How to prepare your child for their first dance class
- The importance of creative movement in early childhood
- Building confidence through dance
- Fun dance activities to do at home with your preschooler

The blog post should:
- Be 500-800 words
- Have a catchy, friendly title
- Include practical tips or advice for parents
- Be warm and encouraging in tone
- Include a brief excerpt/summary (2-3 sentences)
- Suggest 3-5 relevant tags

Format your response as JSON with this structure:
{
  "title": "Blog post title",
  "content": "Full blog post content in markdown format",
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
        ...blogForm,
        title: result.title,
        content: result.content,
        excerpt: result.excerpt,
        tags: result.tags || [],
        status: 'draft'
      });

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
    try {
      const recipients = registrations.map(r => r.parent_email);
      
      if (recipients.length === 0) {
        toast.error('No recipients found');
        return;
      }

      // Send to all parents
      await Promise.all(recipients.map(email => 
        base44.integrations.Core.SendEmail({
          from_name: "Sweetpeas Dance Studio",
          to: email,
          subject: newsletterForm.subject,
          body: newsletterForm.content
        })
      ));

      toast.success(`Newsletter sent to ${recipients.length} recipients!`);
      setShowNewsletterDialog(false);
      setNewsletterForm({ subject: '', content: '', recipients: 'all' });
    } catch (error) {
      console.error('Error sending newsletter:', error);
      toast.error('Failed to send newsletter');
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
        <Tabs defaultValue="registrations" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm border border-rose-200">
            <TabsTrigger value="registrations" className="data-[state=active]:bg-rose-100">
              <Users className="w-4 h-4 mr-2" />
              Registrations
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-rose-100">
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-rose-100">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-rose-100">
              <DollarSign className="w-4 h-4 mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-rose-100">
              <FileText className="w-4 h-4 mr-2" />
              Content & Blogs
            </TabsTrigger>
          </TabsList>

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

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <CalendarView />
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-rose-800">Class Schedule Management</CardTitle>
                <CardDescription>Manage your class times and schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classSchedules.map((schedule) => (
                    <Card key={schedule.id} className="border-rose-200/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800 capitalize">{schedule.day_of_week}s</p>
                            <p className="text-gray-600">{schedule.start_time} - {schedule.end_time}</p>
                            {schedule.age_range && (
                              <p className="text-sm text-gray-500">Ages: {schedule.age_range}</p>
                            )}
                          </div>
                          <Badge className={schedule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {schedule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <p className="text-sm text-gray-500 mt-4">
                    To add or edit classes, go to Dashboard → Data → ClassSchedule
                  </p>
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
                <Label htmlFor="blog-image">Featured Image URL</Label>
                <Input
                  id="blog-image"
                  value={blogForm.featured_image}
                  onChange={(e) => setBlogForm({ ...blogForm, featured_image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
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
              <div dangerouslySetInnerHTML={{ __html: selectedBlog?.content || '' }} />
              {selectedBlog?.tags && selectedBlog.tags.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {selectedBlog.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
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

        {/* AI Assistant Button */}
        <Button
          onClick={() => setShowAssistant(true)}
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all z-40"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>

        {/* AI Assistant Chat */}
        <AssistantChat isOpen={showAssistant} onClose={() => setShowAssistant(false)} />
      </div>
    </div>
  );
}