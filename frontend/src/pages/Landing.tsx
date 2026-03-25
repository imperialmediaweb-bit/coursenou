import LandingNavbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import LogoBar from '../components/landing/LogoBar';
import HowItWorks from '../components/landing/HowItWorks';
import Features from '../components/landing/Features';
import DemoPreview from '../components/landing/DemoPreview';
import AIProviders from '../components/landing/AIProviders';
import Pricing from '../components/landing/Pricing';
import Testimonials from '../components/landing/Testimonials';
import FAQ from '../components/landing/FAQ';
import CTASection from '../components/landing/CTASection';
import LandingFooter from '../components/landing/LandingFooter';
import '../styles/globals.css';

export default function Landing() {
  return (
    <div className="noise-overlay bg-base min-h-screen font-sans text-prose">
      <LandingNavbar />
      <Hero />
      <LogoBar />
      <HowItWorks />
      <Features />
      <DemoPreview />
      <AIProviders />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
