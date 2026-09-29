'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPixel, pixelConfigured, track } from '@/lib/meta-pixel';

/**
 * Boots the Meta Pixel and fires a PageView on every route change. Renders nothing.
 * No-op unless NEXT_PUBLIC_META_PIXEL_ID is set, so dev/preview stay clean.
 */
export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pixelConfigured()) return;
    initPixel();
    track('PageView');
  }, [pathname]);

  return null;
}
