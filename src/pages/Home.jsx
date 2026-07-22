
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, Heart, Music, Star, Phone, Mail, MapPin, Clock, Calendar, Users, Send, CheckCircle, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const FloatingFlower = ({ delay = 0, left, top, size = "w-8 h-8" }) => (
  <motion.div
    className={`absolute ${left} ${top} ${size} opacity-20`}
    animate={{
      y: [0, -20, 0],
      rotate: [0, 10, 0],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  >
    <svg viewBox="0 0 24 24" fill="currentColor" className="text-rose-400">
      <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.5.7 2.8 1.8 3.7C8.2 11.3 7 12.6 7 14.5c0 2.5 2 4.5 4.5 4.5 1.2 0 2.3-.5 3.1-1.3.8.8 1.9 1.3 3.1 1.3 2.5 0 4.5-2 4.5-4.5 0-1.9-1.2-3.2-2.3-4.3 1.1-.9 1.8-2.2 1.8-3.7C21.5 4 19.5 2 17 2c-1.5 0-2.8.7-3.7 1.8C12.3 2.7 11 2 9.5 2h2.5zm0 0" />
    </svg>
  </motion.div>
);

const BenefitCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
  >
    <Card className="bg-white/80 backdrop-blur-sm border-rose-200/50 hover:border-rose-300 transition-all duration-300 hover:shadow-lg hover:shadow-rose-200/30 group">
      <CardContent className="p-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-300 to-pink-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-rose-800 mb-2">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
);

export default function Home() {
  const [formData, setFormData] = useState({
    parent_name: "",
    parent_email: "",
    parent_phone: "",
    child_name: "",
    child_age: "",
    child_birthdate: "",
    preferred_class_time: "",
    emergency_contact: "",
    special_notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  // Fetch data from entities
  const { data: classSchedules = [] } = useQuery({
    queryKey: ['classSchedules'],
    queryFn: () => base44.entities.ClassSchedule.filter({ is_active: true }),
    initialData: [],
  });

  const { data: pricing = [] } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => base44.entities.Pricing.filter({ is_active: true }),
    initialData: [],
  });

  const { data: studioInfo = [] } = useQuery({
    queryKey: ['studioInfo'],
    queryFn: () => base44.entities.StudioInfo.list(),
    initialData: [],
  });

  const { data: activePromoCodes = [] } = useQuery({
    queryKey: ['promoCodes', 'active'],
    queryFn: () => base44.entities.PromoCode.filter({ is_active: true }),
    initialData: [],
  });

  const studio = studioInfo[0] || {
    studio_name: 'Sweetpeas Dance Studio',
    address_line1: '123 Blossom Lane',
    address_line2: 'Your City, ST 12345',
    description: 'Bright, welcoming studio with sprung floors and age-appropriate equipment',
    phone: '(555) 123-4567',
    email: 'hello@sweetpeas.dance',
    hours: [
      { day: 'Tuesday', hours: '9:30 AM - 11:00 AM' },
      { day: 'Thursday', hours: '9:30 AM - 11:00 AM' },
      { day: 'Saturday', hours: '9:00 AM - 10:30 AM' },
    ]
  };
  const mainPricing = pricing[0] || {
    price: 220,
    duration: '60-minute classes',
    sessions_count: 12,
    included_items: ['All materials included'],
    single_class_price: 25,
    session_name: '12-Week Term'
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyPromo = () => {
    const today = new Date().toISOString().slice(0, 10);
    const match = activePromoCodes.find((p) => p.code.toUpperCase() === promoCodeInput.trim().toUpperCase());
    if (!match) {
      toast.error("That promo code wasn't found");
      return;
    }
    if (match.valid_until && match.valid_until < today) {
      toast.error('That promo code has expired');
      return;
    }
    if (match.max_uses && (match.used_count || 0) >= match.max_uses) {
      toast.error('That promo code has reached its usage limit');
      return;
    }
    setAppliedPromo(match);
    toast.success(`Code applied: ${match.discount_type === 'percent' ? `${match.discount_value}% off` : `$${match.discount_value} off`}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const registrationData = {
        ...formData,
        child_age: parseInt(formData.child_age),
        source: referralCode ? 'referral' : 'website',
        referral_code: referralCode || undefined,
        promo_code_used: appliedPromo?.code || undefined,
      };

      const registration = await base44.entities.Registration.create(registrationData);

      if (referralCode) {
        const referrers = await base44.entities.ParentProfile.filter({ referral_code: referralCode });
        if (referrers[0]) {
          await base44.entities.Referral.create({
            referral_code: referralCode,
            referrer_email: referrers[0].user_email,
            referrer_name: referrers[0].full_name,
            referred_name: formData.child_name,
            registration_id: registration.id,
            status: 'pending',
          });
        }
      }

      if (appliedPromo) {
        await base44.entities.PromoCode.update(appliedPromo.id, { used_count: (appliedPromo.used_count || 0) + 1 });
      }

      const selectedClass = classSchedules.find(s => s.id === formData.preferred_class_time);
      const classTimeFormatted = selectedClass ? formatClassTime(selectedClass) : 'Not selected or invalid class ID';
      
      await base44.integrations.Core.SendEmail({
        from_name: "Sweetpeas Dance Registration",
        to: "fionaslewis@gmail.com",
        subject: `New Registration: ${formData.child_name}`,
        body: `
New dance class registration received!

PARENT INFORMATION:
Name: ${formData.parent_name}
Email: ${formData.parent_email}
Phone: ${formData.parent_phone || 'Not provided'}

CHILD INFORMATION:
Name: ${formData.child_name}
Age: ${formData.child_age}
Date of Birth: ${formData.child_birthdate || 'Not provided'}

CLASS SELECTION:
Preferred Time: ${classTimeFormatted}

ADDITIONAL INFORMATION:
Emergency Contact: ${formData.emergency_contact || 'Not provided'}
Special Notes: ${formData.special_notes || 'None'}

Registration Date: ${new Date().toLocaleString()}
        `
      });
      
      setSubmitted(true);
      toast.success("Registration submitted successfully! We'll contact you soon.");
      
      setFormData({
        parent_name: "",
        parent_email: "",
        parent_phone: "",
        child_name: "",
        child_age: "",
        child_birthdate: "",
        preferred_class_time: "",
        emergency_contact: "",
        special_notes: ""
      });
      setPromoCodeInput('');
      setAppliedPromo(null);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Something went wrong. Please try again.");
    }

    setIsSubmitting(false);
  };

  const formatClassTime = (schedule) => {
    const dayMap = {
      tuesday: 'Tuesday',
      thursday: 'Thursday',
      saturday: 'Saturday',
      monday: 'Monday',
      wednesday: 'Wednesday',
      friday: 'Friday',
      sunday: 'Sunday'
    };
    return `${dayMap[schedule.day_of_week.toLowerCase()]} ${schedule.start_time} - ${schedule.end_time}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-pink-50">
      {/* Hero Section */}
      <motion.section 
        style={{ opacity, scale }}
        className="relative min-h-screen flex items-center justify-center overflow-hidden px-4"
      >
        {/* Decorative floating flowers */}
        <FloatingFlower delay={0} left="left-[10%]" top="top-[15%]" />
        <FloatingFlower delay={1} left="right-[15%]" top="top-[25%]" size="w-6 h-6" />
        <FloatingFlower delay={0.5} left="left-[20%]" top="top-[60%]" size="w-10 h-10" />
        <FloatingFlower delay={1.5} left="right-[10%]" top="top-[70%]" />
        <FloatingFlower delay={0.8} left="left-[85%]" top="top-[40%]" size="w-7 h-7" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            {/* Beautiful decorative heading with flowers */}
            <div className="relative inline-block">
              <div className="text-7xl md:text-9xl font-bold bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500 bg-clip-text text-transparent mb-4">
                Sweetpeas
              </div>
              <div className="flex items-center justify-center gap-2 text-2xl md:text-3xl text-rose-600 font-light">
                <span className="text-3xl">🌸</span>
                <span>Creative Dance Class</span>
                <span className="text-3xl">🌸</span>
              </div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl md:text-5xl font-light text-rose-800 mb-6 leading-relaxed"
          >
            Where Little Dancers <br className="hidden md:block" />
            <span className="font-bold text-rose-500">Bloom & Twirl</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
          >
            A magical creative movement class for preschoolers ages 3-5, 
            where imagination meets dance in a nurturing, joyful environment
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              onClick={() => document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Register Your Little Dancer
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12 animate-bounce"
          >
            <div className="w-6 h-10 border-2 border-rose-300 rounded-full mx-auto flex items-start justify-center p-2">
              <motion.div 
                className="w-1.5 h-1.5 bg-rose-400 rounded-full"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* About Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-light text-rose-800 mb-4">
              About <span className="font-bold text-rose-500">Sweetpeas</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-rose-300 to-pink-400 mx-auto rounded-full" />
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                Sweetpeas Creative Dance Class is a whimsical journey into the world of movement, 
                music, and imagination designed especially for preschoolers. Our gentle approach 
                combines ballet basics, creative movement, and imaginative play to help little ones 
                discover the joy of dance.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                In our nurturing studio, every child is encouraged to express themselves freely, 
                build confidence, and develop coordination through age-appropriate activities that 
                feel like play but build foundational dance skills.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-rose-200">
                  <Heart className="w-5 h-5 text-rose-400" />
                  <span className="text-gray-700">Ages 3-5</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-rose-200">
                  <Users className="w-5 h-5 text-rose-400" />
                  <span className="text-gray-700">Small Classes</span>
                </div>
                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-rose-200">
                  <Star className="w-5 h-5 text-rose-400" />
                  <span className="text-gray-700">Creative Focus</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-rose-200/30 to-pink-200/30 rounded-3xl p-8 backdrop-blur-sm border border-rose-200/50">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-rose-300 to-pink-400 rounded-full opacity-20 blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-gradient-to-br from-pink-300 to-rose-400 rounded-full opacity-20 blur-2xl" />
                <Music className="w-full h-64 text-rose-300/40" strokeWidth={0.5} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-light text-rose-800 mb-4">
              What Your Child Will <span className="font-bold text-rose-500">Learn</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-rose-300 to-pink-400 mx-auto rounded-full" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <BenefitCard
              icon={Sparkles}
              title="Creative Expression"
              description="Children explore movement through imaginative play, storytelling, and music, developing their unique artistic voice."
              delay={0.1}
            />
            <BenefitCard
              icon={Heart}
              title="Confidence Building"
              description="In a supportive, positive environment, little dancers gain self-assurance and learn to celebrate their achievements."
              delay={0.2}
            />
            <BenefitCard
              icon={Music}
              title="Rhythm & Coordination"
              description="Through fun activities and games, children develop body awareness, balance, and an understanding of music and rhythm."
              delay={0.3}
            />
            <BenefitCard
              icon={Users}
              title="Social Skills"
              description="Dancing with peers teaches sharing, taking turns, and working together in a joyful group setting."
              delay={0.4}
            />
            <BenefitCard
              icon={Star}
              title="Ballet Foundations"
              description="Gentle introduction to basic ballet positions, terminology, and movement patterns appropriate for young learners."
              delay={0.5}
            />
            <BenefitCard
              icon={Sparkles}
              title="Joy of Movement"
              description="Most importantly, children discover that moving their bodies is fun, building a lifelong love of dance and activity."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Class Details Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-light text-rose-800 mb-4">
              Class <span className="font-bold text-rose-500">Details</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-rose-300 to-pink-400 mx-auto rounded-full" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-white to-rose-50/50 border-rose-200/50 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-300 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-rose-800 mb-4">Regular Schedule</h3>
                  <div className="space-y-3 text-left">
                    {classSchedules.length > 0 ? (
                      classSchedules.map((schedule) => (
                        <div key={schedule.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-rose-400 rounded-full mt-2" />
                          <div>
                            <p className="font-medium text-gray-800 capitalize">{schedule.day_of_week}s</p>
                            <p className="text-gray-600">{schedule.start_time} - {schedule.end_time}</p>
                            {schedule.age_range && (
                              <p className="text-xs text-gray-500">Ages {schedule.age_range}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center">Schedule coming soon</p>
                    )}
                    
                    {/* Introductory Classes Section */}
                    <div className="mt-6 pt-6 border-t border-rose-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Introductory classes term 4 2025</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-rose-400 rounded-full mt-2" />
                          <div>
                            <p className="font-medium text-gray-800">Tuesday</p>
                            <p className="text-gray-600">10:00 AM - 11:00 AM</p>
                            <p className="text-xs text-gray-500">Ages 3 - 5</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-rose-400 rounded-full mt-2" />
                          <div>
                            <p className="font-medium text-gray-800">Thursday</p>
                            <p className="text-gray-600">3:30 PM - 4:30 PM</p>
                            <p className="text-xs text-gray-500">Ages 5 - 7</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-white to-rose-50/50 border-rose-200/50 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-300 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-rose-800 mb-6">Pricing</h3>
                  
                  <div className="bg-rose-100/50 rounded-lg p-6 space-y-4">
                    <div className="pb-4 text-center">
                      <p className="text-2xl font-bold text-rose-700">${mainPricing.price} per term</p>
                      <p className="text-sm text-gray-600 mt-3 leading-relaxed text-left">
                        Payment plans for term, semester and yearly tuition are available. Simply select the payment option in your cart.
                      </p>
                    </div>
                    
                    <div className="text-left space-y-2 pb-4">
                      <p className="text-gray-700">
                        <span className="font-medium">Class Duration:</span> {mainPricing.duration || '60min'}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">{mainPricing.sessions_count || 12} weeks per term</span>
                      </p>
                    </div>
                    
                    <div className="border-t border-rose-200 pt-4 text-center">
                      <p className="text-lg font-semibold text-rose-700">${mainPricing.single_class_price}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        for a single drop-in class<br />
                        <span className="text-xs">(only available in weeks 1 to 3)</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-white to-rose-50/50 border-rose-200/50 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-300 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-rose-800 mb-4">Location</h3>
                  <p className="text-gray-700 mb-2">{studio.studio_name}</p>
                  <p className="text-gray-600 mb-6">
                    {studio.address_line1}<br />
                    {studio.address_line2}
                  </p>
                  <div className="bg-rose-100/50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      {studio.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Registration Section */}
      <section id="register" className="py-20 px-4 bg-gradient-to-br from-rose-100/50 to-pink-100/50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-light text-rose-800 mb-4">
              Register Your <span className="font-bold text-rose-500">Little Dancer</span>
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-rose-300 to-pink-400 mx-auto rounded-full mb-6" />
            <p className="text-gray-600 text-lg">Join our next session and watch your child bloom!</p>
          </motion.div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-12 text-center shadow-xl"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-3xl font-semibold text-gray-800 mb-4">Thank You!</h3>
              <p className="text-lg text-gray-600 mb-6">
                We've received your registration. We'll contact you soon to confirm your spot!
              </p>
              <Button
                onClick={() => setSubmitted(false)}
                variant="outline"
                className="border-rose-300 text-rose-600 hover:bg-rose-50"
              >
                Register Another Child
              </Button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="bg-white/80 backdrop-blur-sm shadow-2xl border-rose-200/50">
                <CardContent className="p-8 md:p-12">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Parent Information */}
                    <div>
                      <h3 className="text-xl font-semibold text-rose-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                          <span className="text-rose-600 text-sm">1</span>
                        </div>
                        Parent Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="parent-name">Parent/Guardian Name *</Label>
                          <Input
                            id="parent-name"
                            value={formData.parent_name}
                            onChange={(e) => handleInputChange('parent_name', e.target.value)}
                            required
                            className="border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="parent-email">Email Address *</Label>
                          <Input
                            id="parent-email"
                            type="email"
                            value={formData.parent_email}
                            onChange={(e) => handleInputChange('parent_email', e.target.value)}
                            required
                            className="border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="parent-phone">Phone Number</Label>
                          <Input
                            id="parent-phone"
                            type="tel"
                            value={formData.parent_phone}
                            onChange={(e) => handleInputChange('parent_phone', e.target.value)}
                            className="border-rose-200 focus:border-rose-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Child Information */}
                    <div>
                      <h3 className="text-xl font-semibold text-rose-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                          <span className="text-rose-600 text-sm">2</span>
                        </div>
                        Child Information
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="child-name">Child's Name *</Label>
                          <Input
                            id="child-name"
                            value={formData.child_name}
                            onChange={(e) => handleInputChange('child_name', e.target.value)}
                            required
                            className="border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="child-age">Age *</Label>
                          <Input
                            id="child-age"
                            type="number"
                            min="3"
                            max="5"
                            value={formData.child_age}
                            onChange={(e) => handleInputChange('child_age', e.target.value)}
                            required
                            className="border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="child-birthdate">Date of Birth</Label>
                          <Input
                            id="child-birthdate"
                            type="date"
                            value={formData.child_birthdate}
                            onChange={(e) => handleInputChange('child_birthdate', e.target.value)}
                            className="border-rose-200 focus:border-rose-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Class Selection */}
                    <div>
                      <h3 className="text-xl font-semibold text-rose-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                          <span className="text-rose-600 text-sm">3</span>
                        </div>
                        Class Selection
                      </h3>
                      <div>
                        <Label htmlFor="preferred-class-time">Preferred Class Time *</Label>
                        <Select
                          value={formData.preferred_class_time}
                          onValueChange={(value) => handleInputChange('preferred_class_time', value)}
                        >
                          <SelectTrigger id="preferred-class-time" className="border-rose-200 focus:border-rose-400">
                            <SelectValue placeholder="Select a class time" />
                          </SelectTrigger>
                          <SelectContent>
                            {classSchedules.map((schedule) => (
                              <SelectItem key={schedule.id} value={schedule.id}>
                                {formatClassTime(schedule)}
                              </SelectItem>
                            ))}
                            {classSchedules.length === 0 && (
                                <SelectItem value="no_classes" disabled>No classes available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div>
                      <h3 className="text-xl font-semibold text-rose-800 mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center">
                          <span className="text-rose-600 text-sm">4</span>
                        </div>
                        Additional Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="emergency-contact">Emergency Contact</Label>
                          <Input
                            id="emergency-contact"
                            value={formData.emergency_contact}
                            onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
                            placeholder="Name and phone number"
                            className="border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="special-notes">Special Notes or Needs</Label>
                          <Textarea
                            id="special-notes"
                            value={formData.special_notes}
                            onChange={(e) => handleInputChange('special_notes', e.target.value)}
                            placeholder="Any allergies, special needs, or information we should know..."
                            rows={4}
                            className="border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        <div>
                          <Label htmlFor="promo-code">Promo Code</Label>
                          <div className="flex gap-2">
                            <Input
                              id="promo-code"
                              value={promoCodeInput}
                              onChange={(e) => setPromoCodeInput(e.target.value)}
                              placeholder="Have a code? Enter it here"
                              className="border-rose-200 focus:border-rose-400"
                              disabled={!!appliedPromo}
                            />
                            <Button type="button" variant="outline" onClick={handleApplyPromo} disabled={!promoCodeInput.trim() || !!appliedPromo}>
                              Apply
                            </Button>
                          </div>
                          {appliedPromo && (
                            <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {appliedPromo.code} applied — {appliedPromo.discount_type === 'percent' ? `${appliedPromo.discount_value}% off` : `$${appliedPromo.discount_value} off`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-5 h-5" />
                          Submit Registration
                        </span>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-rose-900 to-pink-800 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-light mb-6">Get in <span className="font-bold">Touch</span></h2>
              <p className="text-rose-100 mb-8 leading-relaxed">
                Have questions? We'd love to hear from you! Contact us to learn more about 
                our classes, schedule a visit, or chat about your child's dance journey.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rose-200">Call us</p>
                    <p className="text-lg">{studio.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rose-200">Email us</p>
                    <p className="text-lg">{studio.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-rose-200">Visit us</p>
                    <p className="text-lg">
                      {studio.address_line1}<br />
                      {studio.address_line2}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-semibold mb-2">Studio Hours</h3>
                  <p className="text-rose-200">We're open during class times and by appointment</p>
                </div>
                <div className="space-y-4">
                  {studio.hours && studio.hours.length > 0 ? (
                    studio.hours.map((hour, idx) => (
                      <div key={idx} className="flex justify-between items-center py-3 border-b border-white/10 last:border-b-0">
                        <span>{hour.day}</span>
                        <span className="text-rose-200">{hour.hours}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex justify-between items-center py-3 border-b border-white/10">
                        <span>Tuesday</span>
                        <span className="text-rose-200">9:30 AM - 11:00 AM</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-white/10">
                        <span>Thursday</span>
                        <span className="text-rose-200">9:30 AM - 11:00 AM</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span>Saturday</span>
                        <span className="text-rose-200">9:00 AM - 10:30 AM</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16 pt-8 border-t border-white/20"
          >
            <p className="text-rose-200 text-sm">
              © 2024 Sweetpeas Creative Dance Class. All rights reserved.
            </p>
            <p className="text-rose-300 text-xs mt-2">
              sweetpeas.dance
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
