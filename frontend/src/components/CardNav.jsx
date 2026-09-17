// React Bits CardNav, aangepast voor BEBO.
// Behouden uit het origineel: de gsap-timeline (hoogte uitklappen + kaarten
// gestaffeld inschuiven), de resize-afhandeling en de kaartstructuur.
// BEBO-aanpassingen:
// - echte <button> voor het menu (i.p.v. div role=button), aria-controls
// - hoogte wordt ook op desktop gemeten (zes dienstlinks passen niet in 260px)
// - Esc en klik buiten de navigatie sluiten; focus naar eerste link bij openen
// - logo links, [menu] [offerte] rechts; genummerde links met actieve staat
// - geen react-icons: inline pijl-SVG
// - prefers-reduced-motion: timeline zonder animatieduur
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './CardNav.css';

const Arrow = () => (
  <svg className="nav-card-link-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const BAR = 60;

const CardNav = ({
  logo,
  logoAlt = 'Logo',
  homeHref = '/',
  items,
  cta,
  phone,
  className = '',
  ease = 'power3.out'
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);
  const toggleRef = useRef(null);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 320;
    const contentEl = navEl.querySelector('.card-nav-content');
    if (!contentEl) return 320;
    const prev = {
      visibility: contentEl.style.visibility,
      pointerEvents: contentEl.style.pointerEvents,
      position: contentEl.style.position,
      height: contentEl.style.height
    };
    contentEl.style.visibility = 'visible';
    contentEl.style.pointerEvents = 'auto';
    contentEl.style.position = 'static';
    contentEl.style.height = 'auto';
    contentEl.offsetHeight; // eslint-disable-line no-unused-expressions
    const contentHeight = contentEl.scrollHeight;
    Object.assign(contentEl.style, prev);
    return BAR + contentHeight;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;
    const d = reduced ? 0 : 0.4;

    gsap.set(navEl, { height: BAR, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: reduced ? 0 : 40, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, { height: calculateHeight, duration: d, ease });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: d, ease, stagger: reduced ? 0 : 0.07 }, reduced ? 0 : '-=0.1');
    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;
    return () => {
      tl?.kill();
      tlRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;
      if (isExpanded) {
        gsap.set(navRef.current, { height: calculateHeight() });
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) tlRef.current = newTl;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  const open = useCallback(() => {
    const tl = tlRef.current;
    if (!tl) return;
    setIsHamburgerOpen(true);
    setIsExpanded(true);
    tl.eventCallback('onReverseComplete', null);
    tl.play(0);
    requestAnimationFrame(() => {
      const first = navRef.current?.querySelector('.nav-card-link');
      first?.focus({ preventScroll: true });
    });
  }, []);

  const close = useCallback((restoreFocus = true) => {
    const tl = tlRef.current;
    if (!tl) return;
    setIsHamburgerOpen(false);
    tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
    tl.reverse();
    if (reduced) setIsExpanded(false);
    if (restoreFocus) toggleRef.current?.focus({ preventScroll: true });
  }, [reduced]);

  const toggleMenu = () => (isHamburgerOpen ? close(false) : open());

  useEffect(() => {
    if (!isHamburgerOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(true); };
    const onDown = (e) => { if (navRef.current && !navRef.current.contains(e.target)) close(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [isHamburgerOpen, close]);

  const setCardRef = (i) => (el) => {
    if (el) cardsRef.current[i] = el;
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} aria-label="Hoofdmenu">
        <div className="card-nav-top">
          <a className="logo-container" href={homeHref}>
            <img src={logo} alt={logoAlt} className="logo" width="128" height="44" />
          </a>

          <div className="card-nav-actions">
            {phone && (
              <a className="card-nav-phone" href={phone.href}>
                <span className="card-nav-phone-dot" aria-hidden="true" />
                {phone.label}
              </a>
            )}
            <button
              ref={toggleRef}
              type="button"
              className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`}
              onClick={toggleMenu}
              aria-label={isExpanded ? 'Menu sluiten' : 'Menu openen'}
              aria-expanded={isHamburgerOpen}
              aria-controls="card-nav-content"
            >
              <span className="hamburger-lines" aria-hidden="true">
                <span className="hamburger-line" />
                <span className="hamburger-line" />
              </span>
              <span className="hamburger-text" aria-hidden="true">{isHamburgerOpen ? 'Sluit' : 'Menu'}</span>
            </button>
            {cta && (
              <a className={`card-nav-cta-button${cta.current ? ' is-current' : ''}`} href={cta.href} aria-current={cta.current ? 'page' : undefined}>
                {cta.label}
              </a>
            )}
          </div>
        </div>

        <div className="card-nav-content" id="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, idx) => (
            <div key={`${item.label}-${idx}`} className={`nav-card nav-card--${item.tone}`} ref={setCardRef(idx)}>
              <div className="nav-card-label">
                <span className="nav-card-num">{String(idx + 1).padStart(2, '0')}</span>
                {item.label}
              </div>
              <ul className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <li key={`${lnk.label}-${i}`}>
                    <a
                      className={`nav-card-link${lnk.current ? ' is-current' : ''}`}
                      href={lnk.href}
                      tabIndex={isExpanded ? 0 : -1}
                      aria-current={lnk.current ? 'page' : undefined}
                      {...(lnk.external ? { target: '_blank', rel: 'noopener' } : {})}
                    >
                      {lnk.index && <span className="nav-card-link-n">{lnk.index}</span>}
                      <span className="nav-card-link-t">{lnk.label}</span>
                      <Arrow />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
