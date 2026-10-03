import { Property } from '../types/property';

export interface ShareResult {
  success: boolean;
  method: 'web-share' | 'clipboard' | 'cancelled' | 'failed';
  message: string;
}

/**
 * Shares a property listing using the native Web Share API
 * with direct link generation (?property=<id>) and graceful clipboard fallback.
 */
export async function sharePropertyListing(property: Property): Promise<ShareResult> {
  // Construct direct link to this specific property listing
  const url = new URL(window.location.href);
  url.searchParams.set('property', property.id);
  const shareUrl = url.toString();

  const formattedPrice =
    property.type === 'rent'
      ? `₹${property.price.toLocaleString()}/mo`
      : property.price >= 10000000
        ? `₹${(property.price / 10000000).toFixed(2)} Cr`
        : `₹${(property.price / 100000).toFixed(1)} Lakhs`;

  const shareTitle = `${property.title} | Ha la Ri Shillong`;
  const shareText = `Check out this ${property.bhk === 0 ? 'Studio' : `${property.bhk} BHK`} property in ${property.locality}, Shillong (${formattedPrice}) on Ha la Ri!`;

  const shareData: ShareData = {
    title: shareTitle,
    text: shareText,
    url: shareUrl,
  };

  // Try Native Web Share API first
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return {
          success: true,
          method: 'web-share',
          message: 'Listing shared successfully!',
        };
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          method: 'cancelled',
          message: 'Share cancelled',
        };
      }
      console.warn('Native Web Share failed, falling back to clipboard:', err);
    }
  }

  // Fallback to Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(shareUrl);
      return {
        success: true,
        method: 'clipboard',
        message: 'Direct listing link copied to clipboard!',
      };
    } catch (err) {
      console.warn('Clipboard writeText failed:', err);
    }
  }

  // ExecCommand fallback
  try {
    const input = document.createElement('textarea');
    input.value = shareUrl;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.focus();
    input.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(input);
    if (successful) {
      return {
        success: true,
        method: 'clipboard',
        message: 'Direct listing link copied to clipboard!',
      };
    }
  } catch (e) {
    console.warn('execCommand copy fallback failed:', e);
  }

  return {
    success: false,
    method: 'failed',
    message: 'Could not share listing. Please copy the URL from your browser.',
  };
}
