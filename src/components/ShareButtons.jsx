import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Link2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ShareButtons({ url, title = '', text = '' }) {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text || title);

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url: shareUrl });
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canNativeShare && (
        <Button size="sm" variant="outline" onClick={handleNativeShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="text-blue-700 border-blue-200 hover:bg-blue-50"
        onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'noopener,noreferrer')}
      >
        Facebook
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`, '_blank', 'noopener,noreferrer')}
      >
        X / Twitter
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-green-700 border-green-200 hover:bg-green-50"
        onClick={() => window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank', 'noopener,noreferrer')}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        WhatsApp
      </Button>
      <Button size="sm" variant="outline" onClick={handleCopyLink}>
        <Link2 className="w-4 h-4 mr-2" />
        Copy Link
      </Button>
    </div>
  );
}
