import { Suspense } from 'react';
import { MarketingHeader } from '@/components/marketing/header';
import { HeroSection } from '@/components/marketing/hero';
import { ComparisonSection } from '@/components/marketing/comparison';
import { LearnSection } from '@/components/marketing/learn';
import { AudienceSection } from '@/components/marketing/audience';
import { TimelineSection } from '@/components/marketing/timeline';
import { TestimonialsSection } from '@/components/marketing/testimonials';
import { FaqSection } from '@/components/marketing/faq';
import { FinalCtaSection } from '@/components/marketing/final-cta';
import { MarketingFooter } from '@/components/marketing/footer';
import { ReferralCapture } from '@/components/affiliate/referral-capture';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <MarketingHeader />
      <main>
        <HeroSection />
        <ComparisonSection />
        <LearnSection />
        <AudienceSection />
        <TimelineSection />
        <TestimonialsSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
