import { base44 } from './base44Client';


export const Query = base44.entities.Query;

// Public site content
export const StudioInfo = base44.entities.StudioInfo;
export const Pricing = base44.entities.Pricing;

// Scheduling
export const ClassSchedule = base44.entities.ClassSchedule;
export const CalendarEvent = base44.entities.CalendarEvent;

// Leads / enrollment
export const Registration = base44.entities.Registration;
export const ParentProfile = base44.entities.ParentProfile;
export const DancerProfile = base44.entities.DancerProfile;
export const Enrollment = base44.entities.Enrollment;

// Content
export const BlogPost = base44.entities.BlogPost;

// Communication
export const Conversation = base44.entities.Conversation;
export const Message = base44.entities.Message;
export const Broadcast = base44.entities.Broadcast;

// Email campaigns & sequences
export const EmailTemplate = base44.entities.EmailTemplate;
export const EmailCampaign = base44.entities.EmailCampaign;
export const EmailSequence = base44.entities.EmailSequence;
export const SequenceProgress = base44.entities.SequenceProgress;

// Social media
export const SocialPost = base44.entities.SocialPost;

// Member portal & community
export const DancerBadge = base44.entities.DancerBadge;
export const CommunityPost = base44.entities.CommunityPost;
export const CommunityComment = base44.entities.CommunityComment;
export const ResourceItem = base44.entities.ResourceItem;

// Growth & lead generation
export const LandingPage = base44.entities.LandingPage;
export const PromoCode = base44.entities.PromoCode;
export const Referral = base44.entities.Referral;


// auth sdk:
export const User = base44.auth;
