import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const loadScriptOnce = (src, id) => {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  document.body.appendChild(script);
};

const reloadScript = (src, id) => {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.async = true;
  document.body.appendChild(script);
};

function FacebookPageEmbed({ pageUrl }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('fb-root')) {
      const root = document.createElement('div');
      root.id = 'fb-root';
      document.body.insertBefore(root, document.body.firstChild);
    }
    loadScriptOnce('https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0', 'facebook-jssdk');

    let attempts = 0;
    const tryParse = () => {
      if (window.FB?.XFBML) {
        window.FB.XFBML.parse(containerRef.current);
      } else if (attempts < 10) {
        attempts += 1;
        setTimeout(tryParse, 500);
      }
    };
    tryParse();
  }, [pageUrl]);

  return (
    <div ref={containerRef}>
      <div
        className="fb-page"
        data-href={pageUrl}
        data-tabs="timeline"
        data-width="380"
        data-height="500"
        data-small-header="true"
        data-adapt-container-width="true"
        data-hide-cover="false"
        data-show-facepile="false"
      />
    </div>
  );
}

function InstagramEmbed({ postUrl }) {
  useEffect(() => {
    reloadScript('https://www.instagram.com/embed.js', 'instagram-embed-js');
  }, [postUrl]);

  return (
    <blockquote className="instagram-media" data-instgrm-captioned="" data-instgrm-permalink={postUrl} style={{ margin: 0 }}>
      <a href={postUrl} target="_blank" rel="noopener noreferrer">
        View this post on Instagram
      </a>
    </blockquote>
  );
}

function TikTokEmbed({ postUrl }) {
  useEffect(() => {
    reloadScript('https://www.tiktok.com/embed.js', 'tiktok-embed-js');
  }, [postUrl]);

  return (
    <blockquote className="tiktok-embed" cite={postUrl} style={{ margin: 0 }}>
      <a href={postUrl} target="_blank" rel="noopener noreferrer">
        View this video on TikTok
      </a>
    </blockquote>
  );
}

export default function SocialWall() {
  const { data: studioInfo = [] } = useQuery({
    queryKey: ['studioInfo'],
    queryFn: () => base44.entities.StudioInfo.list(),
  });
  const studio = studioInfo[0];

  const { data: featuredPosts = [] } = useQuery({
    queryKey: ['featuredSocialPosts'],
    queryFn: () => base44.entities.SocialPost.filter({ show_on_wall: true, status: 'posted' }),
  });

  const embeddablePosts = featuredPosts.filter((p) => p.post_url && (p.platform === 'instagram' || p.platform === 'tiktok'));

  const hasAnything = studio?.facebook_page_url || embeddablePosts.length > 0;

  if (!hasAnything) {
    return null;
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-rose-800">Social Wall</CardTitle>
        <CardDescription>What&apos;s happening on our Instagram, Facebook &amp; TikTok</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {studio?.facebook_page_url && <FacebookPageEmbed pageUrl={studio.facebook_page_url} />}
          {embeddablePosts.map((post) =>
            post.platform === 'instagram' ? (
              <InstagramEmbed key={post.id} postUrl={post.post_url} />
            ) : (
              <TikTokEmbed key={post.id} postUrl={post.post_url} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
