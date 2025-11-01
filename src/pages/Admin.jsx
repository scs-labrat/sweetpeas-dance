import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const updateRegistrationMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Registration.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['registrations']);
      toast.success('Registration status updated');
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const confirmedCount = registrations.filter(r => r.status === 'confirmed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
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
                  <p className="text-sm text-rose-600 font-medium">Classes</p>
                  <p className="text-3xl font-bold text-rose-800">{classSchedules.length}</p>
                </div>
                <Calendar className="w-10 h-10 text-rose-400" />
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
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-rose-800 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Blog Posts
                  </CardTitle>
                  <CardDescription>Create and manage blog content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button className="w-full bg-rose-600 hover:bg-rose-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Blog Post
                    </Button>
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No blog posts yet</p>
                      <p className="text-xs mt-2">Coming soon: Full blog management system</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-rose-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Content Assistant
                  </CardTitle>
                  <CardDescription>Generate content with AI automation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Blog Post
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Create Newsletter
                    </Button>
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-xs">AI-powered content creation coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}