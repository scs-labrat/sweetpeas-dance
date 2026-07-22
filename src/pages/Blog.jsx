import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ShareButtons from '@/components/ShareButtons';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function Blog() {
  const [searchParams] = useSearchParams();
  const postId = searchParams.get('post');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['publishedBlogPosts'],
    queryFn: () => base44.entities.BlogPost.filter({ status: 'published' }),
  });

  const sortedPosts = [...posts].sort((a, b) => new Date(b.publish_date || b.created_date) - new Date(a.publish_date || a.created_date));
  const activePost = postId ? sortedPosts.find((p) => p.id === postId) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (activePost) {
    const postUrl = typeof window !== 'undefined' ? `${window.location.origin}${createPageUrl('Blog')}?post=${activePost.id}` : '';
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to={createPageUrl('Blog')} className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to all posts
          </Link>
          <Card className="bg-white/90 backdrop-blur-sm">
            <CardContent className="p-8 md:p-12">
              {activePost.featured_image && (
                <img src={activePost.featured_image} alt={activePost.title} className="w-full h-64 object-cover rounded-lg mb-6" />
              )}
              <div className="flex items-center gap-2 mb-3">
                {activePost.ai_generated && (
                  <Badge className="bg-purple-100 text-purple-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Assisted
                  </Badge>
                )}
                <span className="text-sm text-gray-500">
                  {new Date(activePost.publish_date || activePost.created_date).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-rose-800 mb-4">{activePost.title}</h1>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: activePost.content || '' }} />
              {activePost.tags && activePost.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {activePost.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="mt-8 pt-6 border-t border-rose-100">
                <p className="text-sm text-gray-500 mb-2">Share this post</p>
                <ShareButtons url={postUrl} title={activePost.title} text={activePost.excerpt || activePost.title} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-rose-800 mb-2">From the Studio</h1>
          <p className="text-gray-600">News, tips, and stories from Sweetpeas Dance Studio</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {sortedPosts.map((post) => (
            <Link key={post.id} to={`${createPageUrl('Blog')}?post=${post.id}`}>
              <Card className="h-full bg-white/90 backdrop-blur-sm hover:shadow-lg transition-shadow">
                {post.featured_image && (
                  <img src={post.featured_image} alt={post.title} className="w-full h-48 object-cover rounded-t-lg" />
                )}
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-rose-800 mb-2">{post.title}</h2>
                  {post.excerpt && <p className="text-gray-600 text-sm mb-3">{post.excerpt}</p>}
                  <p className="text-xs text-gray-400">
                    {new Date(post.publish_date || post.created_date).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {sortedPosts.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p>No posts published yet — check back soon!</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to={createPageUrl('Home')}>Back to Home</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
