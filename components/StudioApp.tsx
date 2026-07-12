'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  ExternalLink, 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle, 
  X,
  Compass,
  Sparkles,
  Award,
  Users
} from 'lucide-react';
import WebGLCanvas from './WebGLCanvas';

type PageType = 'home' | 'the-studio' | 'our-approach' | 'services' | 'awards' | 'clients';


interface StudioAppProps {
  initialSlug: string[];
}

export default function StudioApp({ initialSlug }: StudioAppProps) {
  const [activePage, setActivePage] = useState<PageType>('home');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev' | 'enter'>('enter');
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Hover state for center links on the landing menu
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Form states for luxury contact modal
  const [contactForm, setContactForm] = useState({ name: '', email: '', company: '', message: '' });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Parse path to set initial page
  useEffect(() => {
    let page: PageType = 'home';
    if (initialSlug && initialSlug.length > 0) {
      const slugVal = initialSlug[initialSlug.length - 1];
      if (['the-studio', 'our-approach', 'services', 'awards', 'clients'].includes(slugVal)) {
        page = slugVal as PageType;
      }
    } else {
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (['the-studio', 'our-approach', 'services', 'awards', 'clients'].includes(lastPart)) {
          page = lastPart as PageType;
        }
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivePage(page);
  }, [initialSlug]);

  // Handle browser back/forward buttons smoothly
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const parts = path.split('/').filter(Boolean);
      let page: PageType = 'home';
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (['the-studio', 'our-approach', 'services', 'awards', 'clients'].includes(lastPart)) {
          page = lastPart as PageType;
        }
      }
      setActivePage(page);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update URL path and page state smoothly
  const navigateTo = (page: PageType, direction: 'next' | 'prev' | 'enter' = 'enter') => {
    if (page === activePage && direction !== 'enter') {
      return;
    }

    setTransitionDirection(direction);
    setActivePage(page);
    setIsPageTransitioning(true);

    const path = page === 'home' ? '/' : page === 'the-studio' ? '/the-studio' : `/${page}`;
    window.history.pushState(null, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isPageTransitioning) return;

    const timeoutId = window.setTimeout(() => setIsPageTransitioning(false), 750);
    return () => window.clearTimeout(timeoutId);
  }, [isPageTransitioning]);

  const handleWheelNavigation = (event: React.WheelEvent<HTMLDivElement>) => {
    if (activePage === 'home' || isPageTransitioning) return;

    const delta = event.deltaY;
    if (Math.abs(delta) < 30) return;

    event.preventDefault();
    event.stopPropagation();

    if (delta > 0) {
      navigateTo(pageDetails[activePage as Exclude<PageType, 'home'>].nextPage, 'next');
    } else {
      navigateTo(pageDetails[activePage as Exclude<PageType, 'home'>].prevPage, 'prev');
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (activePage === 'home' || isPageTransitioning || touchStartY.current === null) return;

    const touchEndY = event.changedTouches[0]?.clientY ?? null;
    if (touchEndY === null) return;

    const deltaY = touchStartY.current - touchEndY;
    if (Math.abs(deltaY) < 70) return;

    if (deltaY > 0) {
      navigateTo(pageDetails[activePage as Exclude<PageType, 'home'>].nextPage, 'next');
    } else {
      navigateTo(pageDetails[activePage as Exclude<PageType, 'home'>].prevPage, 'prev');
    }

    touchStartY.current = null;
  };

  // Keyboard navigation for an extremely immersive experience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isContactOpen || isProjectsOpen) {
        if (e.key === 'Escape') {
          setIsContactOpen(false);
          setIsProjectsOpen(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (activePage !== 'home') {
          navigateTo('home', 'prev');
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        // Go to next subpage
        const pages: PageType[] = ['the-studio', 'our-approach', 'services', 'awards', 'clients'];
        const currentIdx = pages.indexOf(activePage);
        if (currentIdx === -1) {
          navigateTo('the-studio', 'next');
        } else {
          const nextIdx = (currentIdx + 1) % pages.length;
          navigateTo(pages[nextIdx], 'next');
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        // Go to prev subpage or back to menu
        const pages: PageType[] = ['the-studio', 'our-approach', 'services', 'awards', 'clients'];
        const currentIdx = pages.indexOf(activePage);
        if (currentIdx === -1) {
          navigateTo('home', 'prev');
        } else if (currentIdx === 0) {
          navigateTo('home', 'prev');
        } else {
          navigateTo(pages[currentIdx - 1], 'prev');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePage, isContactOpen, isProjectsOpen]);

  // Handle contact form submit
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email) return;
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setIsContactOpen(false);
      setContactForm({ name: '', email: '', company: '', message: '' });
    }, 2500);
  };

  // Navigation Links / Menu list
  const menuItems = [
    { id: 'the-studio', label: 'The Studio', count: '01' },
    { id: 'our-approach', label: 'Our approach', count: '02' },
    { id: 'services', label: 'Services', count: '03' },
    { id: 'awards', label: 'Awards', count: '04' },
    { id: 'clients', label: 'Clients', count: '05' },
  ];

  // Specific high-fidelity content for our subpages (Image 2 copy & matching structures)
  const pageDetails: Record<Exclude<PageType, 'home'>, { 
    title: string; 
    description: string; 
    nextPage: PageType;
    prevPage: PageType;
    detailsList: Array<{ title: string; desc: string; icon?: React.ReactNode }>;
  }> = {
    'the-studio': {
      title: 'The studio',
      description: 'For over 10 years, creating exceptional and unprecedented products and experiences has been our passion, driven by innovative thinking and highly precise execution.',
      nextPage: 'our-approach',
      prevPage: 'clients',
      detailsList: [
        { title: 'OUR FOUNDATION', desc: 'Established in Paris, we partner with world-renowned luxury houses to translate their heritage into physical-like digital sculptures.', icon: <Sparkles className="w-4 h-4 text-[#bf9b30]" /> },
        { title: 'EMOTION BY DESIGN', desc: 'We design interfaces with visual poetry, deliberate typography hierarchy, and strict pacing control.', icon: <Compass className="w-4 h-4 text-[#bf9b30]" /> }
      ]
    },
    'our-approach': {
      title: 'Our approach',
      description: 'We merge artistic design with clean front-end engineering. Our phased strategy balances bold concepts, refined art direction, and meticulous performance standards.',
      nextPage: 'services',
      prevPage: 'the-studio',
      detailsList: [
        { title: 'ART DIRECTION', desc: 'Formulating a unique visual signature. Designing custom luxury typography pairings and precise motion theories.', icon: <Sparkles className="w-4 h-4 text-[#bf9b30]" /> },
        { title: 'CREATIVE CODE', desc: 'Developing fluid, pixel-perfect layouts using React, modern springs, and responsive boundaries.', icon: <Compass className="w-4 h-4 text-[#bf9b30]" /> }
      ]
    },
    'services': {
      title: 'Services',
      description: 'From high-end art direction and branding to custom interactive development, our capabilities are focused on creating unforgettable digital spaces.',
      nextPage: 'awards',
      prevPage: 'our-approach',
      detailsList: [
        { title: 'UX & ART DIRECTION', desc: 'Bespoke branding and visual layout design focused on storytelling and emotional user journeys.', icon: <Compass className="w-4 h-4 text-[#bf9b30]" /> },
        { title: 'INTERACTIVE FRONTEND', desc: 'Ultra-fast, accessible development that scales seamlessly across device viewports.', icon: <Sparkles className="w-4 h-4 text-[#bf9b30]" /> }
      ]
    },
    'awards': {
      title: 'Awards',
      description: 'Our dedication to digital craft, premium typography, and fluid movement has been recognized globally with multiple Site of the Year and Agency of the Year honors.',
      nextPage: 'clients',
      prevPage: 'services',
      detailsList: [
        { title: 'AWWWARDS SOTY', desc: 'Winner of site of the year for groundbreaking aesthetic execution and layout fluidity.', icon: <Award className="w-4 h-4 text-[#bf9b30]" /> },
        { title: 'THE FWA & WEBBY', desc: 'Recognized by international academies for superior design quality and interactive standards.', icon: <Award className="w-4 h-4 text-[#bf9b30]" /> }
      ]
    },
    'clients': {
      title: 'Clients',
      description: 'We collaborate with prestigious luxury houses, visionary creators, and forward-thinking enterprises, translating their heritage into outstanding interactive monuments.',
      nextPage: 'the-studio',
      prevPage: 'awards',
      detailsList: [
        { title: 'LUXURY BRANDING', desc: 'Partnering with Hermès, Chanel, and Cartier to draft high-end promotional portals.', icon: <Users className="w-4 h-4 text-[#bf9b30]" /> },
        { title: 'CREATIVE ENTERPRISES', desc: 'Connecting state-of-the-art tech with traditional art showcases for a global audience.', icon: <Users className="w-4 h-4 text-[#bf9b30]" /> }
      ]
    },
  };

  // Luxury Project Showcase list
  const luxuryProjects = [
    { name: 'HERMÈS PARIS', sector: 'Paris / Luxury House', project: 'Bespoke Silk Showcase & Immersive Storytelling Platform', year: '2025' },
    { name: 'CHANEL', sector: 'Paris / Fashion & Perfume', project: 'High-end Product Launch Carousel & Interactive Visuals', year: '2024' },
    { name: 'CARTIER', sector: 'Geneva / High Jewelry', project: 'Heritage Collection Timeline & Interactive 3D Showcase', year: '2024' },
    { name: 'VALENTINO ACCENT', sector: 'Rome / Luxury Perfume', project: 'Scent-guided emotional digital gallery & artwork', year: '2025' }
  ];

  const subpageTransition = transitionDirection === 'prev'
    ? {
        initial: { opacity: 0, y: -28, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 28, scale: 0.985 },
      }
    : transitionDirection === 'next'
    ? {
        initial: { opacity: 0, y: 28, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -28, scale: 0.985 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  return (
    <div className="relative min-h-screen bg-black overflow-x-hidden selection:bg-[#bf9b30]/30 selection:text-white text-white select-none">
      
      {/* Persistent WebGL Context */}
      <WebGLCanvas activePage={activePage} hoveredIndex={hoveredIndex} />

      <AnimatePresence mode="wait">
        {/* LANDING PAGE / MENU VIEW (Image 1) */}
        {activePage === 'home' ? (
          <motion.div 
            key="menu-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="relative w-full h-screen max-h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-12 z-20 bg-transparent"
          >

            {/* TOP BAR */}
            <div className="relative w-full flex justify-between items-center z-10">
              {/* Minimal brand insignia */}
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => navigateTo('home')}

              >
                <div className="w-8 h-8 rounded-full border border-[#bf9b30]/40 flex items-center justify-center font-serif text-xs text-[#bf9b30] tracking-wider font-bold">X</div>
                <div className="flex flex-col text-left">
                  <span className="font-serif tracking-[0.3em] text-[10px] text-white/90 font-bold leading-none">AIFX</span>
                  <span className="font-mono text-[6px] text-[#bf9b30]/70 tracking-widest mt-0.5">ONECOOL</span>
                </div>
              </div>

              {/* Close Button (Image 1 top right) */}
              <button 
                onClick={() => navigateTo('the-studio', 'next')}
                className="flex items-center gap-2 group cursor-pointer transition-all duration-300"

              >
                <span className="font-mono text-[9px] tracking-[0.25em] text-white/60 group-hover:text-white uppercase transition-colors">Close</span>
                <div className="w-4 h-4 border border-white/20 group-hover:border-white/50 rounded flex items-center justify-center transition-colors">
                  <span className="font-serif text-[8px] leading-none text-white/60 group-hover:text-white">†</span>
                </div>
              </button>
            </div>

            {/* VERTICALLY STACKED CENTRED LINKS */}
            <div className="relative flex flex-col items-center justify-center my-auto py-12 z-10 text-center">
              <div className="flex flex-col space-y-3 sm:space-y-4 md:space-y-5 max-w-3xl">
                {menuItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 35 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="group"
                  >
                    <button
                      onClick={() => navigateTo(item.id as PageType, 'next')}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className={`font-serif text-lg sm:text-2xl md:text-3xl lg:text-[2.2rem] font-light tracking-[0.25em] hover:tracking-[0.38em] uppercase transition-all duration-700 cursor-pointer flex items-center justify-center gap-3 sm:gap-4 mx-auto py-2 outline-none ${
                        hoveredIndex === null
                          ? 'text-white/70'
                          : hoveredIndex === idx
                          ? 'text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.18)] scale-[1.01]'
                          : 'text-white/20 scale-[0.99]'
                      }`}
                    >
                      <span className="font-mono text-[8px] sm:text-[9px] text-[#bf9b30]/50 group-hover:text-[#bf9b30] tracking-widest leading-none transition-colors duration-500 relative -top-0.5">
                        {item.count}
                      </span>
                      <span className="text-white/10 text-[9px] sm:text-[10px] select-none transition-opacity duration-500 group-hover:opacity-40">—</span>
                      <span>{item.label}</span>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* BOTTOM HUD SECTION */}
            <div className="relative w-full flex justify-between items-end z-10">
              
              {/* See all projects (Bottom Left) */}
              <button 
                onClick={() => setIsProjectsOpen(true)}
                className="relative pb-1 group font-mono text-[9px] tracking-[0.25em] text-white/55 hover:text-white transition-colors uppercase cursor-pointer flex items-center gap-1"

              >
                <span>See all projects</span>
                <span className="inline-block transform group-hover:translate-x-0.5 transition-transform">↖</span>
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white/20 scale-x-100 group-hover:scale-x-0 origin-right transition-transform duration-300 ease-out" />
              </button>

              {/* Contact us (Bottom Center - Image 1) */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
                <button 
                  onClick={() => setIsContactOpen(true)}
                  className="relative pb-2 group font-serif text-xs tracking-[0.1em] text-white/60 hover:text-white transition-colors cursor-pointer"

                >
                  <span>Contact us</span>
                  <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white/20 scale-x-100 group-hover:scale-x-0 origin-right transition-transform duration-300 ease-out" />
                </button>
              </div>

              {/* Circular minimalist spinning outline ring (Bottom Right - Image 1) */}
              <div className="flex items-center gap-3">
                <span className="font-mono text-[7px] text-white/20 tracking-widest uppercase hidden md:inline">EST. 2026</span>
                <div className="w-5 h-5 border border-white/10 border-t-[#bf9b30] rounded-full animate-spin" />
              </div>

            </div>

          </motion.div>
        ) : (
          
          /* SUBPAGE DETAIL VIEW (Image 2) */
          <motion.div 
            key={activePage}
            initial={subpageTransition.initial}
            animate={subpageTransition.animate}
            exit={subpageTransition.exit}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full h-screen max-h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-12 z-20 bg-transparent"
            onWheel={handleWheelNavigation}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* BACK BUTTON (Top Center - Image 2) */}
            <div className="relative w-full flex justify-between items-center z-10">
              {/* Minimal brand logo back link */}
              <div 
                className="flex items-center gap-2 cursor-pointer opacity-40 hover:opacity-100 transition-opacity"
                onClick={() => navigateTo('home', 'prev')}

              >
                <div className="w-6 h-6 rounded-full border border-white/30 flex items-center justify-center font-serif text-[10px] text-white">G</div>
              </div>

              {/* Back center button */}
              <div className="absolute left-1/2 -translate-x-1/2">
                <button 
                  onClick={() => navigateTo('home', 'prev')}
                  className="relative pb-0.5 group font-mono text-[9px] tracking-[0.25em] uppercase text-white/50 hover:text-white transition-colors cursor-pointer"

                >
                  <span>Back</span>
                  <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white/20 scale-x-100 group-hover:scale-x-0 origin-right transition-transform duration-300 ease-out" />
                </button>
              </div>

              {/* Menu indicator in right */}
              <button 
                onClick={() => setIsProjectsOpen(true)}
                className="font-mono text-[9px] tracking-[0.25em] uppercase text-white/30 hover:text-white transition-colors"

              >
                PROJECTS
              </button>
            </div>

            {/* CENTRAL VIEWPORT SPACER FOR THE PERSISTENT WEBGL ROMAN NUMERAL */}
            <div className="relative flex flex-col items-center justify-center my-auto z-10 py-6 pointer-events-none">
              <div className="h-[40vh] sm:h-[48vh] max-h-[420px] aspect-square" />
            </div>

            {/* TYPOGRAPHIC DESCRIPTION & CONTROLS BLOCK (Image 2) */}
            <div className="relative w-full grid grid-cols-1 md:grid-cols-12 items-end gap-6 sm:gap-10 z-10 pb-2">
              
              {/* Bottom-Left Column: Title & Paragraph (Image 2 layout) */}
              <div className="md:col-span-7 flex flex-col text-left space-y-3 max-w-sm sm:max-w-2xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePage}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="font-mono text-[8px] sm:text-[9px] text-[#bf9b30] tracking-[0.3em] uppercase block mb-1">
                      CHAPTER 0{menuItems.findIndex(i => i.id === activePage) + 1}
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl md:text-[2.4vw] font-light tracking-[0.05em] uppercase text-white mb-2 leading-none">
                      {pageDetails[activePage as Exclude<PageType, 'home'>].title}
                    </h2>
                    <p className="font-serif text-xs sm:text-sm md:text-[1.05vw] text-white/50 leading-relaxed font-light tracking-wide max-w-lg">
                      {pageDetails[activePage as Exclude<PageType, 'home'>].description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* PAGINATION: PREV & NEXT BUTTONS (Bottom Center - Image 2) */}
              <div className="md:col-span-3 flex justify-start md:justify-center py-4 md:py-0">
                <div className="flex items-center gap-6 sm:gap-8 font-mono text-[9px] tracking-[0.25em] uppercase text-white/40 select-none">
                  <button 
                    onClick={() => navigateTo(pageDetails[activePage as Exclude<PageType, 'home'>].prevPage, 'prev')}
                    className="group hover:text-white transition-colors cursor-pointer relative pb-1 flex items-center gap-1.5"
                  >
                    <span className="inline-block transform group-hover:-translate-x-0.5 transition-transform duration-300">←</span>
                    <span>Prev</span>
                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white/10 scale-x-100 group-hover:scale-x-0 origin-right transition-transform duration-300 ease-out" />
                  </button>
                  <span className="text-[#bf9b30]/35 font-light">|</span>
                  <button 
                    onClick={() => navigateTo(pageDetails[activePage as Exclude<PageType, 'home'>].nextPage, 'next')}
                    className="group hover:text-white transition-colors cursor-pointer relative pb-1 flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <span className="inline-block transform group-hover:translate-x-0.5 transition-transform duration-300">→</span>
                    <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white/10 scale-x-100 group-hover:scale-x-0 origin-right transition-transform duration-300 ease-out" />
                  </button>
                </div>
              </div>

              {/* Spinner indicator (Bottom Right) */}
              <div className="md:col-span-2 flex justify-end items-center gap-4">
                <span className="font-mono text-[7px] text-white/20 tracking-[0.2em] hidden sm:inline">
                  LUNE / ST.
                </span>
                <div className="w-5 h-5 border border-white/10 border-t-[#bf9b30] rounded-full animate-spin" />
              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN CONTACT OVERLAY (Luxury modal form) */}
      <AnimatePresence>
        {isContactOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 w-full h-screen bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 sm:p-6"
            id="contact-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-[#070707] border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden text-left"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setIsContactOpen(false);
                  setFormSubmitted(false);
                }}
                className="absolute top-6 right-6 w-8 h-8 border border-white/10 hover:border-[#bf9b30]/40 rounded-full flex items-center justify-center text-white hover:text-[#bf9b30] transition-colors duration-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="font-mono text-[8px] text-[#bf9b30] tracking-widest uppercase">LET&apos;S COLLABORATE</span>
                  <h3 className="font-serif text-2xl font-bold text-white tracking-wide">CONNECT WITH US</h3>
                </div>

                {formSubmitted ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-10 flex flex-col items-center justify-center text-center space-y-3"
                  >
                    <CheckCircle className="w-12 h-12 text-[#bf9b30] animate-pulse" />
                    <h4 className="font-serif text-lg font-semibold text-white tracking-wide">TRANSMISSION RECEIVED</h4>
                    <p className="font-sans text-xs text-white/50 leading-relaxed max-w-xs">
                      Your brief has been compiled and routed directly to our lead producers in Paris. We will connect with you shortly.
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-mono text-[8px] text-white/40 tracking-wider block">YOUR NAME *</label>
                        <input 
                          type="text" 
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          className="w-full bg-white/5 border border-white/5 focus:border-[#bf9b30] rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none transition-colors"
                          placeholder="Dilshan Arukatti"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-mono text-[8px] text-white/40 tracking-wider block">YOUR EMAIL *</label>
                        <input 
                          type="email" 
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          className="w-full bg-white/5 border border-white/5 focus:border-[#bf9b30] rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none transition-colors"
                          placeholder="client@luxurybrand.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[8px] text-white/40 tracking-wider block">COMPANY / AGENCY</label>
                      <input 
                        type="text" 
                        value={contactForm.company}
                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 focus:border-[#bf9b30] rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none transition-colors"
                        placeholder="Hermès Paris"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-mono text-[8px] text-white/40 tracking-wider block">PROJECT BRIEF *</label>
                      <textarea 
                        required
                        rows={3}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        className="w-full bg-white/5 border border-white/5 focus:border-[#bf9b30] rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/20 outline-none transition-colors resize-none"
                        placeholder="Share your goals, timeline, and requested creative scope..."
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-3 bg-[#bf9b30] hover:bg-[#a68222] text-black font-serif text-xs font-bold tracking-widest rounded-lg cursor-pointer transition-colors duration-300 mt-4"
                    >
                      SEND BRIEF
                      <Send className="w-3 h-3" />
                    </button>

                  </form>
                )}

                {/* Sub contact markers */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/5 text-center text-[9px]">
                  <div className="space-y-0.5">
                    <Mail className="w-3 h-3 text-[#bf9b30]/60 mx-auto" />
                    <span className="font-mono text-white/40 block">onecoolaifxdev@gmail.com</span>
                  </div>
                  <div className="space-y-0.5">
                    <Phone className="w-3 h-3 text-[#bf9b30]/60 mx-auto" />
                    <span className="font-mono text-white/40 block">+81 90 1234 5678</span>
                  </div>
                  <div className="space-y-0.5">
                    <MapPin className="w-3 h-3 text-[#bf9b30]/60 mx-auto" />
                    <span className="font-mono text-white/40 block">Kyoto, Japan</span>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN PROJECTS SHOWCASE DRAWER */}
      <AnimatePresence>
        {isProjectsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 w-full h-screen bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 sm:p-6"
            id="projects-overlay"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl bg-[#070707] border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden text-left"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsProjectsOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 border border-white/10 hover:border-[#bf9b30]/40 rounded-full flex items-center justify-center text-white hover:text-[#bf9b30] transition-colors duration-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="font-mono text-[8px] text-[#bf9b30] tracking-widest uppercase">CREATIVE ARCHIVE</span>
                  <h3 className="font-serif text-2xl font-bold text-white tracking-wide">SELECTED WORKS</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1">
                  {luxuryProjects.map((proj, idx) => (
                    <div 
                      key={idx}
                      className="p-5 rounded-xl border border-white/5 bg-white/5 hover:border-[#bf9b30]/30 hover:bg-[#bf9b30]/5 transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[9px] font-mono">
                          <span className="text-[#bf9b30] tracking-wider uppercase">{proj.sector}</span>
                          <span className="text-white/30">{proj.year}</span>
                        </div>
                        <h4 className="font-serif text-lg font-normal text-white/90 group-hover:text-white transition-colors">{proj.name}</h4>
                        <p className="font-sans text-[11px] text-white/50 leading-relaxed">{proj.project}</p>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4 text-[9px] font-mono text-white/35 group-hover:text-[#bf9b30]/80 transition-colors">
                        <span>LAUNCH ARCHIVE</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-white/40">
                  <span className="font-mono">AIFX CRAFT</span>
                  <button 
                    onClick={() => {
                      setIsProjectsOpen(false);
                      setIsContactOpen(true);
                    }}
                    className="font-serif text-white hover:text-[#bf9b30] underline underline-offset-4 transition-colors"
                  >
                    Discuss your project
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
