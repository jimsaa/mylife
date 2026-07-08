'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureReferralFromSearch, setReferralCookie } from '@/lib/affiliate/referral';

/** Captures ?ref= on landing — architecture for future attribution */
export function ReferralCapture() {
  const searchParams = useSearchParams();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const ref = captureReferralFromSearch(searchParams.toString());
    if (ref) {
      setReferralCookie(ref);
    }
    setDone(true);
  }, [searchParams, done]);

  return null;
}
