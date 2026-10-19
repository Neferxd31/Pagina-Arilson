// Returns an embeddable iframe URL for TikTok/Instagram links, or null when the link can only be opened
export function videoEmbedUrl(url: string): string | null {
  const tiktok = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
  if (tiktok) return `https://www.tiktok.com/embed/v2/${tiktok[1]}`;

  const instagram = url.match(/instagram\.com\/(?:reel|reels|p)\/([\w-]+)/);
  if (instagram) return `https://www.instagram.com/p/${instagram[1]}/embed`;

  return null;
}
