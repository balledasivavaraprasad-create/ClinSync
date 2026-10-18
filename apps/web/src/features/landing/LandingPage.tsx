import React, { useEffect, useRef } from 'react';
import './landing.css';
import { initLandingInteractions } from './landingInteractions';
import { useTheme } from '../../lib/theme';

export interface LandingPageProps {
  onLaunchApp: (tab?: 'kiosk' | 'ledger' | 'appointments' | 'doctor' | 'showroom' | 'mock-api' | 'visual-qa') => void;
  onOpenLogin?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchApp, onOpenLogin }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toggleTheme, isDark } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    const cleanup = initLandingInteractions(containerRef.current, {
      onLaunchApp,
    });
    return cleanup;
  }, [onLaunchApp]);

  return (
    <div className="clinsync-landing-root" ref={containerRef}>
      {/* ambient colour field */}
      <div className="ambient" aria-hidden="true">
        <span className="ambient__orb ambient__orb--a"></span>
        <span className="ambient__orb ambient__orb--b"></span>
        <span className="ambient__orb ambient__orb--c"></span>
      </div>

      {/* ============ PRELOADER ============ */}
      <div className="preloader" id="preloader">
        <div className="preloader__inner">
          <div className="preloader__mark">
            <svg viewBox="0 0 120 120" fill="none">
              <circle className="pl-ring" cx="60" cy="60" r="46" strokeWidth="1.5" />
              <circle className="pl-ring pl-ring--2" cx="60" cy="60" r="34" strokeWidth="1.5" />
              <circle className="pl-core" cx="60" cy="60" r="6" />
            </svg>
          </div>
          <div className="preloader__word">ClinSync</div>
          <div className="preloader__bar">
            <span id="plBar"></span>
          </div>
          <div className="preloader__meta">
            <span>Preparing clinical memory</span>
            <span id="plPct">0%</span>
          </div>
        </div>
      </div>

      {/* ============ ATMOSPHERE ============ */}
      <div className="grain" aria-hidden="true"></div>
      <div className="cursor" id="cursor" aria-hidden="true">
        <span className="cursor__dot"></span>
      </div>
      <div className="cursor-ring" id="cursorRing" aria-hidden="true">
        <span className="cursor-ring__label"></span>
      </div>
      <div className="scroll-progress" aria-hidden="true">
        <span id="scrollBar"></span>
      </div>
      <div className="spotlight" id="spotlight" aria-hidden="true"></div>

      <nav className="chapters" id="chapters" aria-label="Section navigation">
        <span className="chapters__label">Chapters</span>
        <div className="chapters__track" id="chaptersTrack"></div>
      </nav>

      {/* ============ NAV ============ */}
      <header className="nav" id="nav">
        <div className="nav__inner">
          <a className="brand" href="#top" data-cursor="home" aria-label="ClinSync home">
            <span className="brand__mark">
              <svg viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.6" opacity=".35" />
                <path d="M16 3.5A12.5 12.5 0 0 1 28.5 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <circle cx="16" cy="16" r="3.4" fill="currentColor" />
              </svg>
            </span>
            <span className="brand__name">ClinSync</span>
          </a>
          <nav className="nav__links" aria-label="Primary">
            <a href="#problem">Why</a>
            <a href="#workflow">Workflow</a>
            <a href="#memory">Clinical Memory</a>
            <a href="#brief">Doctor Brief</a>
            <a href="#evidence">Evidence</a>
            <a href="#architecture">Architecture</a>
          </nav>
          <div className="nav__actions">
            {/* Theme Toggle Button: Dark & Light Modes */}
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle"
              id="themeToggle"
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
              data-cursor="theme"
              data-testid="landing-theme-toggle"
            >
              <span className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </span>
              <span className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </span>
            </button>

            <button
              onClick={() => (onOpenLogin ? onOpenLogin() : onLaunchApp('doctor'))}
              className="btn btn--ghost"
              data-cursor="login"
              data-action="launch-login"
              data-testid="landing-btn-signin"
            >
              Sign in
            </button>
            <a
              href="https://clinsync-landing.vercel.app/downloads/ClinSync.apk"
              download="ClinSync.apk"
              className="btn btn--ghost"
              data-cursor="download"
              style={{ color: 'var(--accent, #ea580c)', fontWeight: 600 }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="currentColor"
                style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '4px' }}
              >
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
              </svg>
              Download APK
            </a>
            <a href="#architecture" className="btn btn--ghost" data-cursor="docs">
              Platform
            </a>
            <button
              onClick={() => onLaunchApp('kiosk')}
              className="btn btn--solid"
              data-cursor="start"
              data-action="launch-app"
              data-tab="kiosk"
            >
              Launch Prototype
            </button>
            <button className="nav__burger" id="burger" aria-label="Open menu">
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      <div className="mobile-menu" id="mobileMenu">
        <button
          onClick={() => onLaunchApp('kiosk')}
          style={{ color: 'var(--accent, #ea580c)', fontWeight: 600, textAlign: 'left', padding: '12px 0' }}
          data-action="launch-app"
          data-tab="kiosk"
        >
          Launch Web App →
        </button>
        <a
          href="https://clinsync-landing.vercel.app/downloads/ClinSync.apk"
          download="ClinSync.apk"
          style={{ color: '#0284c7', fontWeight: 600, padding: '12px 0' }}
        >
          Download Android APK (v1.0) ↓
        </a>
        <a href="#problem">Why ClinSync</a>
        <a href="#workflow">Workflow</a>
        <a href="#memory">Clinical Memory</a>
        <a href="#brief">Doctor Brief</a>
        <a href="#evidence">Evidence</a>
        <a href="#architecture">Architecture</a>
        <div className="mobile-menu__row">
          <span>Theme Mode ({isDark ? 'Dark' : 'Light'})</span>
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle theme-toggle--inline"
            aria-label="Toggle theme mode"
            data-testid="landing-theme-toggle-mobile"
          >
            {isDark ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
        <button
          onClick={() => onLaunchApp('kiosk')}
          className="mobile-menu__cta"
          data-action="launch-app"
          data-tab="kiosk"
          style={{ width: '100%', marginTop: '16px' }}
        >
          Launch Prototype
        </button>
      </div>

      <main id="top">
        {/* ============ HERO ============ */}
        <section className="hero" id="hero">
          <div className="hero__media">
            <video
              className="hero__video hero__video--dark"
              id="heroVideo"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/assets/video/hero-dark-poster.jpg"
            >
              <source src="/assets/video/hero-dark.mp4" type="video/mp4" />
            </video>
            <video
              className="hero__video hero__video--light"
              id="heroVideoLight"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/assets/video/hero-light-poster.jpg"
            >
              <source src="/assets/video/hero-light.mp4" type="video/mp4" />
            </video>
            <div className="hero__scrim"></div>
            <div className="hero__vignette"></div>
          </div>

          <div className="hero__grid-lines" aria-hidden="true"></div>

          <div className="hero__content wrap">
            <div className="hero__eyebrow reveal">
              <span className="pulse-dot"></span>
              <span>Pre-consultation intelligence</span>
            </div>

            <h1 className="hero__title">
              <span className="line">
                <span className="line__in">Know the patient</span>
              </span>
              <span className="line">
                <span className="line__in">before you meet</span>
              </span>
              <span className="line">
                <span className="line__in">
                  the <em>patient.</em>
                </span>
              </span>
            </h1>

            <p className="hero__sub reveal">
              ClinSync turns a patient's voice, documents and years of fragmented records into a concise,{' '}
              <strong>evidence-backed doctor brief</strong> — before the consultation begins.
            </p>

            <div className="hero__cta reveal">
              <button
                onClick={() => onLaunchApp('kiosk')}
                className="btn btn--solid btn--lg"
                data-cursor="open"
                data-action="launch-app"
                data-tab="kiosk"
              >
                <span>Launch Web App</span>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style={{ marginLeft: 8 }}>
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <a
                href="https://clinsync-landing.vercel.app/downloads/ClinSync.apk"
                download="ClinSync.apk"
                className="btn btn--line btn--lg"
                data-cursor="download"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: '8px' }}
                >
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
                </svg>
                <span>Download Android APK</span>
              </a>
            </div>

            <div className="hero__tags reveal">
              <span>Voice Intake</span>
              <i></i>
              <span>Medical Documents</span>
              <i></i>
              <span>Clinical Memory</span>
              <i></i>
              <span>Evidence</span>
              <i></i>
              <span>Specialty Routing</span>
              <i></i>
              <span>Doctor Brief</span>
            </div>
          </div>

          <div className="hero__scroll reveal">
            <span>Scroll to explore</span>
            <span className="hero__scroll-line"></span>
          </div>

          <div className="hero__hud" aria-hidden="true">
            <div className="hud-row">
              <span className="hud-key">WORKFLOW</span>
              <span className="hud-val">LangGraph · stateful</span>
            </div>
            <div className="hud-row">
              <span className="hud-key">TRACEABILITY</span>
              <span className="hud-val">claim → source</span>
            </div>
            <div className="hud-row">
              <span className="hud-key">AUTHORITY</span>
              <span className="hud-val">clinician</span>
            </div>
          </div>
        </section>

        {/* ============ MARQUEE / PRINCIPLE BAND ============ */}
        <section className="band">
          <div className="band__marquee">
            <div className="band__track">
              <span>Less time collecting information.</span>
              <b>◆</b>
              <span>More time caring for the patient.</span>
              <b>◆</b>
              <span>Information prepared beforehand.</span>
              <b>◆</b>
              <span>The doctor makes the decision.</span>
              <b>◆</b>
              <span>Evidence remains traceable.</span>
              <b>◆</b>
            </div>
          </div>
        </section>

        {/* ============ STATS ============ */}
        <section className="stats wrap" id="stats">
          <div className="stats__grid">
            <div className="stat reveal" data-counter="100" data-suffix="%">
              <div className="stat__num">
                <span className="stat__val">0</span>
              </div>
              <p>of AI claims linked back to a source</p>
            </div>
            <div className="stat stat--static reveal">
              <div className="stat__num">
                <span className="stat__val">0</span>
              </div>
              <p>medical facts invented — evidence-first by design</p>
            </div>
            <div className="stat reveal" data-counter="60" data-suffix="s">
              <div className="stat__num">
                <span className="stat__val">0</span>
              </div>
              <p>to read a complete patient brief</p>
            </div>
            <div className="stat reveal" data-counter="1" data-suffix="×">
              <div className="stat__num">
                <span className="stat__val">0</span>
              </div>
              <p>time the patient tells their story</p>
            </div>
          </div>
        </section>

        {/* ============ SCROLLYTELLING PIPELINE ============ */}
        <section className="scrolly" id="scrolly" data-chapter="Pipeline">
          <div className="scrolly__head wrap">
            <span className="sec-tag reveal">Processing pipeline</span>
            <h2 className="sec-title reveal">
              Upload to memory, <em>step by step.</em>
            </h2>
            <p className="sec-lead reveal">
              The document pipeline is explicit and traceable. Scroll to follow one report from raw file to clinical memory.
            </p>
          </div>

          <div className="scrolly__viewport">
            <div className="scrolly__sticky">
              <div className="scrolly__stage wrap">
                <div className="scrolly__visual">
                  <div className="docscan" id="docscan">
                    <div className="docscan__chrome">
                      <span className="dot red"></span>
                      <span className="dot amber"></span>
                      <span className="dot green"></span>
                      <span className="docscan__name">lab_report_2026.pdf</span>
                    </div>
                    <div className="docscan__page">
                      <div className="docscan__letterhead">
                        <span></span>
                        <span></span>
                      </div>
                      <div className="docscan__lines">
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                      </div>
                      <div className="docscan__table">
                        <div>
                          <span>HbA1c</span>
                          <b>7.2 %</b>
                        </div>
                        <div>
                          <span>Glucose</span>
                          <b>142 mg/dL</b>
                        </div>
                        <div>
                          <span>LDL</span>
                          <b>138 mg/dL</b>
                        </div>
                      </div>
                      <div className="docscan__lines docscan__lines--short">
                        <i></i>
                        <i></i>
                      </div>
                      <div className="docscan__beam"></div>
                      <div className="docscan__box" data-box="1"></div>
                      <div className="docscan__box" data-box="2"></div>
                      <div className="docscan__box" data-box="3"></div>
                    </div>
                    <div className="docscan__status">
                      <span className="rec"></span>
                      <span id="docscanStatus">UPLOADED</span>
                      <em id="docscanPct">0%</em>
                    </div>
                  </div>
                </div>

                <div className="scrolly__copy" id="scrollyCopy">
                  <div className="sc-step is-active" data-step="0">
                    <span className="sc-step__k">01 · Upload</span>
                    <h3>Secure upload</h3>
                    <p>PDF, camera capture or existing record — validated and stored before anything is processed.</p>
                  </div>
                  <div className="sc-step" data-step="1">
                    <span className="sc-step__k">02 · Classification</span>
                    <h3>Document classification</h3>
                    <p>Prescription, lab report, imaging, discharge summary — typed with an explicit confidence score.</p>
                    <div className="sc-confidence">
                      <span></span>
                      <em>LAB_REPORT · 0.96</em>
                    </div>
                  </div>
                  <div className="sc-step" data-step="2">
                    <span className="sc-step__k">03 · OCR / Vision</span>
                    <h3>Text &amp; table extraction</h3>
                    <p>Vision and OCR read the page, preserving position so every value can be located later.</p>
                  </div>
                  <div className="sc-step" data-step="3">
                    <span className="sc-step__k">04 · Entities</span>
                    <h3>Medical entity extraction</h3>
                    <p>Structured entities are pulled with a value, a page and a confidence — never a fact without a source.</p>
                  </div>
                  <div className="sc-step" data-step="4">
                    <span className="sc-step__k">05 · Validation</span>
                    <h3>Evidence linking</h3>
                    <p>Each extracted item is bound to its source span, then validated before it reaches clinical memory.</p>
                  </div>
                  <div className="sc-step" data-step="5">
                    <span className="sc-step__k">06 · Memory</span>
                    <h3>Clinical memory</h3>
                    <p>The report becomes part of the timeline, the trends and the next doctor brief.</p>
                  </div>
                </div>
              </div>
              <div className="scrolly__progress">
                <span id="scrollyBar"></span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PROBLEM ============ */}
        <section className="section problem" id="problem">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-tag reveal">01 — The problem</span>
              <h2 className="sec-title reveal">
                A doctor's most valuable resource is <em>time with the patient.</em>
              </h2>
              <p className="sec-lead reveal">
                Too much of the consultation is spent reconstructing a story that was never organized in the first place.
                ClinSync moves that work <strong>before</strong> the consultation.
              </p>
            </div>

            <div className="problem__grid">
              <article className="pcard reveal" data-tilt>
                <div className="pcard__idx">01</div>
                <h3>Repeated questions</h3>
                <p>Basic history is re-asked at every visit because nothing carries forward.</p>
                <div className="pcard__glow"></div>
              </article>
              <article className="pcard reveal" data-tilt>
                <div className="pcard__idx">02</div>
                <h3>Manual document review</h3>
                <p>Prescriptions, labs and discharge summaries are read one by one, by hand.</p>
                <div className="pcard__glow"></div>
              </article>
              <article className="pcard reveal" data-tilt>
                <div className="pcard__idx">03</div>
                <h3>Scattered records</h3>
                <p>Years of history live across files that never speak to each other.</p>
                <div className="pcard__glow"></div>
              </article>
              <article className="pcard reveal" data-tilt>
                <div className="pcard__idx">04</div>
                <h3>Fragmented information</h3>
                <p>Nothing is organized around the single question that matters: why today?</p>
                <div className="pcard__glow"></div>
              </article>
              <article className="pcard reveal" data-tilt>
                <div className="pcard__idx">05</div>
                <h3>Repetitive documentation</h3>
                <p>Notes are written from scratch after every consultation.</p>
                <div className="pcard__glow"></div>
              </article>
              <article className="pcard pcard--accent reveal" data-tilt>
                <div className="pcard__idx">→</div>
                <h3>ClinSync changes this</h3>
                <p>Collection, organization and preparation move to the patient side, before the door opens.</p>
                <div className="pcard__glow"></div>
              </article>
            </div>
          </div>
        </section>

        {/* ============ MANIFESTO ============ */}
        <section className="manifesto" id="manifesto" data-chapter="Philosophy">
          <div className="manifesto__glow" aria-hidden="true"></div>
          <div className="wrap">
            <span className="sec-tag sec-tag--center reveal">The core philosophy</span>
            <p className="manifesto__text" id="manifestoText">
              ClinSync is not an AI doctor. It is an AI preparation and information organization layer around the doctor —
              the doctor remains the final authority.
            </p>
            <p className="manifesto__note reveal">Built so the clinician decides, with every claim traceable to its source.</p>
          </div>
        </section>

        {/* ============ WORKFLOW PIPELINE ============ */}
        <section className="section workflow" id="workflow">
          <div className="workflow__bgline" aria-hidden="true"></div>
          <div className="wrap">
            <div className="sec-head sec-head--center">
              <span className="sec-tag reveal">02 — The workflow</span>
              <h2 className="sec-title reveal">
                From a patient's voice to a doctor's <em>clarity.</em>
              </h2>
              <p className="sec-lead reveal">An explicit, traceable pipeline. Every step leaves a record.</p>
            </div>

            <div className="flow">
              <div className="flow__rail" aria-hidden="true">
                <span id="flowRail"></span>
              </div>

              <div className="flow__step reveal" data-step="1">
                <div className="flow__node">
                  <span>1</span>
                </div>
                <div className="flow__body">
                  <h3>Information intake</h3>
                  <p>Secure identity, voice, camera scans, PDFs and existing records enter from the patient side.</p>
                  <div className="flow__chips">
                    <span>Voice</span>
                    <span>Documents</span>
                    <span>History</span>
                    <span>Identity</span>
                  </div>
                </div>
              </div>

              <div className="flow__step reveal" data-step="2">
                <div className="flow__node">
                  <span>2</span>
                </div>
                <div className="flow__body">
                  <h3>Extraction</h3>
                  <p>Speech-to-text, OCR and vision produce structured clinical entities — each with confidence and provenance.</p>
                  <div className="flow__chips">
                    <span>STT</span>
                    <span>OCR</span>
                    <span>NER</span>
                    <span>Classification</span>
                  </div>
                </div>
              </div>

              <div className="flow__step reveal" data-step="3">
                <div className="flow__node">
                  <span>3</span>
                </div>
                <div className="flow__body">
                  <h3>Clinical memory layer</h3>
                  <p>Timeline, trends, medications and symptoms link into one living, longitudinal record.</p>
                  <div className="flow__chips">
                    <span>Timeline</span>
                    <span>Trends</span>
                    <span>Medications</span>
                  </div>
                </div>
              </div>

              <div className="flow__step reveal" data-step="4">
                <div className="flow__node">
                  <span>4</span>
                </div>
                <div className="flow__body">
                  <h3>Missing-information check</h3>
                  <p>The system compares known information against what a useful consultation actually needs.</p>
                  <div className="flow__chips">
                    <span>Gap detection</span>
                    <span>Priority</span>
                  </div>
                </div>
              </div>

              <div className="flow__step reveal" data-step="5">
                <div className="flow__node">
                  <span>5</span>
                </div>
                <div className="flow__body">
                  <h3>Dynamic questioning</h3>
                  <p>Not a 30-item form — a calm conversation that asks only what is still missing.</p>
                  <div className="flow__chips">
                    <span>Adaptive</span>
                    <span>Non-repetitive</span>
                  </div>
                </div>
              </div>

              <div className="flow__step reveal" data-step="6">
                <div className="flow__node">
                  <span>6</span>
                </div>
                <div className="flow__body">
                  <h3>Specialty routing</h3>
                  <p>Complaint, symptoms and history resolve into candidate specialties — never a diagnosis.</p>
                  <div className="flow__chips">
                    <span>Cardiology</span>
                    <span>Gastro</span>
                    <span>Neuro</span>
                  </div>
                </div>
              </div>

              <div className="flow__step reveal" data-step="7">
                <div className="flow__node">
                  <span>7</span>
                </div>
                <div className="flow__body">
                  <h3>Evidence-backed brief</h3>
                  <p>A concise doctor brief is generated, validated and linked to its sources.</p>
                  <div className="flow__chips">
                    <span>Claims</span>
                    <span>Sources</span>
                    <span>Validation</span>
                  </div>
                </div>
              </div>

              <div className="flow__step reveal" data-step="8">
                <div className="flow__node">
                  <span>8</span>
                </div>
                <div className="flow__body">
                  <h3>Human decision &amp; memory update</h3>
                  <p>The doctor reviews, corrects and decides. Afterward, the patient's memory grows richer.</p>
                  <div className="flow__chips">
                    <span>Review</span>
                    <span>Correction</span>
                    <span>Update</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PATIENT SIDE / VOICE ============ */}
        <section className="section patient" id="patient">
          <div className="wrap">
            <div className="split">
              <div className="split__copy">
                <span className="sec-tag reveal">03 — Patient side</span>
                <h2 className="sec-title reveal">
                  The patient simply <em>speaks naturally.</em>
                </h2>
                <p className="sec-lead reveal">
                  No interrogation. ClinSync listens, extracts structured symptoms, preserves the original transcript, and
                  asks a targeted follow-up only when something useful is missing.
                </p>

                <ul className="feature-list">
                  <li className="reveal">
                    <span className="fl-dot"></span>
                    <div>
                      <strong>Voice intake</strong>
                      <p>“Tell us what is bothering you.” Speech becomes structured symptoms.</p>
                    </div>
                  </li>
                  <li className="reveal">
                    <span className="fl-dot"></span>
                    <div>
                      <strong>Original preserved</strong>
                      <p>Patient-stated and AI-interpreted information never blur together.</p>
                    </div>
                  </li>
                  <li className="reveal">
                    <span className="fl-dot"></span>
                    <div>
                      <strong>Progressive disclosure</strong>
                      <p>One calm step at a time — not thirty fields at once.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="split__visual reveal">
                <div className="voice-card" data-tilt>
                  <div className="voice-card__top">
                    <div className="voice-card__avatar">P</div>
                    <div>
                      <div className="voice-card__name">Patient</div>
                      <div className="voice-card__status">
                        <span className="rec"></span> Recording · 00:14
                      </div>
                    </div>
                  </div>
                  <div className="voice-card__wave" id="voiceWave" aria-hidden="true"></div>
                  <p className="voice-card__quote">
                    “I've been having headaches for the past four days. They become worse in the evening and I've also been
                    feeling dizzy.”
                  </p>
                  <div className="voice-card__result">
                    <div className="vr">
                      <span className="vr-k">Chief complaint</span>
                      <span className="vr-v">Headache</span>
                    </div>
                    <div className="vr">
                      <span className="vr-k">Duration</span>
                      <span className="vr-v">4 days</span>
                    </div>
                    <div className="vr">
                      <span className="vr-k">Pattern</span>
                      <span className="vr-v">Worse in evening</span>
                    </div>
                    <div className="vr">
                      <span className="vr-k">Associated</span>
                      <span className="vr-v">Dizziness</span>
                    </div>
                  </div>
                  <div className="voice-card__src">
                    Source · transcript_123 · 00:42 <span className="conf">conf 0.97</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ DYNAMIC INTAKE ============ */}
        <section className="section intake" id="intake">
          <div className="wrap">
            <div className="sec-head sec-head--center">
              <span className="sec-tag reveal">04 — Dynamic intake</span>
              <h2 className="sec-title reveal">
                Not a questionnaire. A <em>conversation.</em>
              </h2>
              <p className="sec-lead reveal">
                After every answer, ClinSync decides what is still missing and asks only that.
              </p>
            </div>

            <div className="chat reveal" id="chat">
              <div className="chat__head">
                <span className="chat__dot"></span>
                <span>ClinSync intake</span>
                <span className="chat__phase" id="chatPhase">
                  extracting known information…
                </span>
              </div>
              <div className="chat__log" id="chatLog"></div>
              <div className="chat__foot">
                <span className="chat__engine">Missing-info engine</span>
                <div className="chat__fields" id="chatFields">
                  <span className="cf" data-f="chief_complaint">
                    chief complaint
                  </span>
                  <span className="cf" data-f="duration">
                    duration
                  </span>
                  <span className="cf" data-f="location">
                    location
                  </span>
                  <span className="cf" data-f="triggers">
                    triggers
                  </span>
                  <span className="cf" data-f="associated">
                    associated
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ CLINICAL MEMORY ============ */}
        <section className="section memory" id="memory">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-tag reveal">05 — Clinical memory</span>
              <h2 className="sec-title reveal">
                The heart of ClinSync. An <em>evolving story.</em>
              </h2>
              <p className="sec-lead reveal">
                ClinSync does not simply store documents. It understands the relationships between them — so each visit starts
                with more information than the last.
              </p>
            </div>

            <div className="memory__layout">
              <div className="timeline reveal" id="timeline">
                <div className="timeline__rail" aria-hidden="true">
                  <span id="tlRail"></span>
                </div>

                <div className="tl-year">
                  <div className="tl-year__label">2024</div>
                  <div className="tl-event" data-kind="condition">
                    <div className="tl-event__dot"></div>
                    <div className="tl-event__card">
                      <span className="tl-kind tl-kind--condition">Condition</span>
                      <h4>Hypertension recorded</h4>
                      <p>First documented diagnosis · source: consultation note</p>
                    </div>
                  </div>
                </div>

                <div className="tl-year">
                  <div className="tl-year__label">2025</div>
                  <div className="tl-event" data-kind="consult">
                    <div className="tl-event__dot"></div>
                    <div className="tl-event__card">
                      <span className="tl-kind tl-kind--consult">Consultation</span>
                      <h4>Cardiology follow-up</h4>
                      <p>Medication adjusted · source: discharge summary</p>
                    </div>
                  </div>
                  <div className="tl-event" data-kind="prescription">
                    <div className="tl-event__dot"></div>
                    <div className="tl-event__card">
                      <span className="tl-kind tl-kind--prescription">Prescription</span>
                      <h4>Drug A — 500mg — twice daily</h4>
                      <p>Source: prescription, page 1</p>
                    </div>
                  </div>
                  <div className="tl-event" data-kind="lab">
                    <div className="tl-event__dot"></div>
                    <div className="tl-event__card">
                      <span className="tl-kind tl-kind--lab">Lab report</span>
                      <h4>HbA1c — 6.7</h4>
                      <p>Source: lab report, page 2</p>
                    </div>
                  </div>
                </div>

                <div className="tl-year">
                  <div className="tl-year__label">2026</div>
                  <div className="tl-event" data-kind="prescription">
                    <div className="tl-event__dot"></div>
                    <div className="tl-event__card">
                      <span className="tl-kind tl-kind--prescription">Prescription</span>
                      <h4>
                        Drug A — 500mg — once daily <i className="flag">dosage changed</i>
                      </h4>
                      <p>Reconciliation flag for review · not an autonomous judgment</p>
                    </div>
                  </div>
                  <div className="tl-event" data-kind="lab">
                    <div className="tl-event__dot is-active"></div>
                    <div className="tl-event__card">
                      <span className="tl-kind tl-kind--lab">Lab report</span>
                      <h4>
                        HbA1c — 7.2 <i className="flag">increased</i>
                      </h4>
                      <p>The value increased across the available reports.</p>
                    </div>
                  </div>
                  <div className="tl-event" data-kind="voice">
                    <div className="tl-event__dot is-current"></div>
                    <div className="tl-event__card">
                      <span className="tl-kind tl-kind--voice">Current complaint</span>
                      <h4>Intermittent chest discomfort, ~3 days</h4>
                      <p>Source: voice transcript · confidence 0.96</p>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="memory__side">
                <div className="side-card reveal">
                  <span className="side-card__k">Your Medical Memory</span>
                  <div className="side-stat">
                    <b>7</b>
                    <span>Previous consultations</span>
                  </div>
                  <div className="side-stat">
                    <b>18</b>
                    <span>Documents</span>
                  </div>
                  <div className="side-stat">
                    <b>11</b>
                    <span>Prescriptions</span>
                  </div>
                  <div className="side-stat">
                    <b>14</b>
                    <span>Reports</span>
                  </div>
                  <div className="side-card__foot">Last consultation · 12 Aug 2026</div>
                </div>
                <div className="side-card side-card--trend reveal">
                  <span className="side-card__k">Trend · HbA1c</span>
                  <svg className="trend" viewBox="0 0 260 110" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="tg" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#38bdf8" />
                        <stop offset="1" stopColor="#818cf8" />
                      </linearGradient>
                    </defs>
                    <path className="trend__grid" d="M0 90H260M0 55H260M0 20H260" />
                    <path className="trend__path" d="M20 84 L120 58 L240 26" fill="none" />
                    <circle className="trend__pt" cx="20" cy="84" r="4" />
                    <circle className="trend__pt" cx="120" cy="58" r="4" />
                    <circle className="trend__pt" cx="240" cy="26" r="5" />
                    <text x="12" y="104">
                      2024 · 6.1
                    </text>
                    <text x="106" y="104">
                      2025 · 6.7
                    </text>
                    <text x="212" y="104">
                      2026 · 7.2
                    </text>
                  </svg>
                  <p className="side-card__note">
                    Detect → visualize → cite → <strong>let the doctor interpret.</strong>
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* ============ EVIDENCE ============ */}
        <section className="section evidence" id="evidence">
          <div className="wrap">
            <div className="sec-head sec-head--center">
              <span className="sec-tag reveal">06 — Evidence system</span>
              <h2 className="sec-title reveal">
                The AI doesn't just generate. It <em>remembers where it came from.</em>
              </h2>
              <p className="sec-lead reveal">Click any claim to travel back to its original source.</p>
            </div>

            <div className="evidence__stage reveal">
              <div className="claim-list" id="claims">
                <button className="claim is-active" data-src="voice">
                  <span className="claim__text">Patient reports symptoms for 4 days</span>
                  <span className="claim__meta">VOICE_TRANSCRIPT · conf 0.97</span>
                </button>
                <button className="claim" data-src="lab">
                  <span className="claim__text">HbA1c measured at 7.2 in the recent report</span>
                  <span className="claim__meta">DOCUMENT · page 2 · conf 0.94</span>
                </button>
                <button className="claim" data-src="med">
                  <span className="claim__text">Drug A dosage changed from twice to once daily</span>
                  <span className="claim__meta">PRESCRIPTION · page 1 · conf 0.91</span>
                </button>
              </div>

              <div className="source-pane" id="sourcePane">
                <div className="source source--voice is-active" data-src="voice">
                  <div className="source__bar">
                    <span className="source__type">Voice transcript</span>
                    <span className="source__loc">00:42</span>
                  </div>
                  <p className="source__body">
                    “…I've been having headaches for the past <mark>four days</mark>. They become worse in the evening and
                    I've also been feeling dizzy…”
                  </p>
                </div>
                <div className="source" data-src="lab">
                  <div className="source__bar">
                    <span className="source__type">Lab report · page 2</span>
                    <span className="source__loc">row 14</span>
                  </div>
                  <p className="source__body">
                    HbA1c ····································· <mark>7.2 %</mark>
                    <br />
                    Reference range · 4.0 – 5.6 %
                  </p>
                </div>
                <div className="source" data-src="med">
                  <div className="source__bar">
                    <span className="source__type">Prescription · page 1</span>
                    <span className="source__loc">line 3</span>
                  </div>
                  <p className="source__body">
                    Rx · Drug A <mark>500 mg — once daily</mark> · 30 days
                    <br />
                    <span className="source__dim">previous: twice daily</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="evidence__pillars">
              <div className="ep reveal">
                <span className="ep__n">01</span>
                <h4>Evidence-first extraction</h4>
                <p>Information is extracted from source material, never invented.</p>
              </div>
              <div className="ep reveal">
                <span className="ep__n">02</span>
                <h4>Source linking</h4>
                <p>Every important entity receives a source, page and confidence.</p>
              </div>
              <div className="ep reveal">
                <span className="ep__n">03</span>
                <h4>Validation layer</h4>
                <p>Claims are matched against evidence before publication.</p>
              </div>
              <div className="ep reveal">
                <span className="ep__n">04</span>
                <h4>Doctor review</h4>
                <p>Clinical information always remains human-reviewed.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ DOCTOR BRIEF ============ */}
        <section className="section brief" id="brief">
          <div className="brief__bg" aria-hidden="true">
            <video
              className="brief__video brief__video--dark"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster="/assets/video/ribbon-light-poster.jpg"
            >
              <source src="/assets/video/ribbon-light.mp4" type="video/mp4" />
            </video>
            <video
              className="brief__video brief__video--light"
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              poster="/assets/video/ribbon-dark-poster.jpg"
            >
              <source src="/assets/video/ribbon-dark.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="wrap">
            <div className="sec-head sec-head--center">
              <span className="sec-tag reveal">07 — The north star</span>
              <h2 className="sec-title reveal">
                The 60-second <em>patient brief.</em>
              </h2>
              <p className="sec-lead reveal">
                The most important screen in ClinSync — designed to answer: who, why, what changed, what matters, what needs
                review.
              </p>
            </div>

            <div className="brief-doc reveal" id="briefDoc">
              <div className="brief-doc__chrome">
                <span className="dot red"></span>
                <span className="dot amber"></span>
                <span className="dot green"></span>
                <span className="brief-doc__url">clinsync · patient brief</span>
                <span className="brief-doc__live">
                  <span className="pulse-dot"></span>pre-consultation ready
                </span>
              </div>

              <div className="brief-doc__head">
                <div className="bd-avatar">JD</div>
                <div className="bd-id">
                  <h3>Patient J.D.</h3>
                  <p>
                    Age · Sex · Appointment <b>10:30 AM · Cardiology</b>
                  </p>
                </div>
                <div className="bd-badge">Brief ready</div>
              </div>

              <div className="brief-doc__body">
                <section className="bd-sec">
                  <span className="bd-k">Why they are here</span>
                  <p>Patient reports intermittent chest discomfort for approximately three days.</p>
                </section>

                <section className="bd-sec">
                  <span className="bd-k">Relevant history</span>
                  <ul className="bd-list">
                    <li>Previous hypertension record</li>
                    <li>Previous cardiology consultation</li>
                    <li>Current medication history available</li>
                  </ul>
                </section>

                <div className="bd-cols">
                  <section className="bd-sec">
                    <span className="bd-k">Medications</span>
                    <ul className="bd-list bd-list--mono">
                      <li>
                        Drug A · 500mg · once daily <i className="flag">changed</i>
                      </li>
                      <li>Drug B · 10mg · once daily</li>
                    </ul>
                  </section>
                  <section className="bd-sec">
                    <span className="bd-k">Recent reports</span>
                    <ul className="bd-list">
                      <li>
                        Lab report · HbA1c 7.2 <i className="flag">recent</i>
                      </li>
                      <li>Chest imaging report</li>
                    </ul>
                  </section>
                </div>

                <section className="bd-sec">
                  <span className="bd-k">What changed</span>
                  <div className="bd-trend">
                    <div className="bd-trend__bar">
                      <span style={{ '--w': '34%' } as React.CSSProperties}></span>
                      <em>2024 · 6.1</em>
                    </div>
                    <div className="bd-trend__bar">
                      <span style={{ '--w': '62%' } as React.CSSProperties}></span>
                      <em>2025 · 6.7</em>
                    </div>
                    <div className="bd-trend__bar bd-trend__bar--hot">
                      <span style={{ '--w': '92%' } as React.CSSProperties}></span>
                      <em>2026 · 7.2</em>
                    </div>
                  </div>
                </section>

                <section className="bd-sec bd-sec--warn">
                  <span className="bd-k">Information needing review</span>
                  <p>⚠ Medication adherence unclear — flagged for clinician verification.</p>
                </section>

                <section className="bd-sec bd-sec--quote">
                  <span className="bd-k">Patient's own words</span>
                  <blockquote>“I've been experiencing tightness in my chest that comes and goes…”</blockquote>
                  <div className="bd-actions">
                    <span className="mini-btn" onClick={() => onLaunchApp('doctor')}>
                      Listen
                    </span>
                    <span className="mini-btn" onClick={() => onLaunchApp('doctor')}>
                      View transcript
                    </span>
                  </div>
                </section>

                <div className="bd-evidence">
                  <span className="bd-evidence__count">
                    <b>6</b> claims · <b>6</b> sources
                  </span>
                  <span
                    className="mini-btn mini-btn--ghost"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onLaunchApp('ledger')}
                  >
                    Review evidence →
                  </span>
                </div>
              </div>

              <div className="brief-doc__foot">
                <span>Doctor remains the final authority.</span>
                <button
                  onClick={() => onLaunchApp('doctor')}
                  className="btn btn--solid mini"
                  data-action="launch-app"
                  data-tab="doctor"
                >
                  Start consultation
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ============ SECURITY / TRUST ============ */}
        <section className="section trust" id="trust">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-tag reveal">08 — Trust &amp; safety</span>
              <h2 className="sec-title reveal">Clinical data is not ordinary application data.</h2>
              <p className="sec-lead reveal">Privacy by design, at every layer of the platform.</p>
            </div>

            <div className="trust__grid">
              <div className="tcard reveal">
                <span className="tcard__ico">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M9.5 12l1.8 1.8L15 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h3>Role-based access</h3>
                <p>Patient, Doctor, Admin. Authorization happens at the backend — never trusted from the frontend.</p>
              </div>
              <div className="tcard reveal">
                <span className="tcard__ico">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M7 10V8a5 5 0 0 1 10 0v2" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="4.5" y="10" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <circle cx="12" cy="15" r="1.4" fill="currentColor" />
                  </svg>
                </span>
                <h3>Explicit consent</h3>
                <p>Scoped, time-bound consent checked against authorization rules on every sensitive access.</p>
              </div>
              <div className="tcard reveal">
                <span className="tcard__ico">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 4h11l3 3v13H5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <h3>Audit logs</h3>
                <p>Every sensitive action recorded — without storing unnecessary sensitive metadata.</p>
              </div>
              <div className="tcard reveal">
                <span className="tcard__ico">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
                <h3>Fail gracefully</h3>
                <p>AI failure never destroys or hides original patient information. The doctor is never blocked.</p>
              </div>
              <div className="tcard reveal">
                <span className="tcard__ico">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 19V9M9 19V5M14 19v-7M19 19V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <h3>Observable AI</h3>
                <p>Latency, token usage, status and validation results tracked — without logging raw medical data.</p>
              </div>
              <div className="tcard reveal">
                <span className="tcard__ico">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 4a8 8 0 0 0-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path
                      d="M20 12a8 8 0 0 0-8-8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity=".4"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
                <h3>Provider abstraction</h3>
                <p>LLM, speech, OCR and embedding providers are swappable — no single-vendor lock-in.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ ARCHITECTURE ============ */}
        <section className="section architecture" id="architecture">
          <div className="wrap">
            <div className="sec-head sec-head--center">
              <span className="sec-tag reveal">09 — Architecture</span>
              <h2 className="sec-title reveal">
                Built for the demo. <em>Architected for the future.</em>
              </h2>
            </div>

            <div className="arch reveal">
              <div className="arch__col">
                <span className="arch__label">Clients</span>
                <div className="arch__box">
                  Patient App<small>voice · documents · identity</small>
                </div>
                <div className="arch__box">
                  Doctor App<small>brief · timeline · evidence</small>
                </div>
              </div>
              <div className="arch__arrow" aria-hidden="true"></div>
              <div className="arch__col">
                <span className="arch__label">Platform</span>
                <div className="arch__box arch__box--accent">
                  FastAPI backend<small>API → Service → Repository</small>
                </div>
                <div className="arch__row">
                  <div className="arch__box arch__box--sm">Storage</div>
                  <div className="arch__box arch__box--sm">Postgres</div>
                  <div className="arch__box arch__box--sm">Workers</div>
                </div>
              </div>
              <div className="arch__arrow" aria-hidden="true"></div>
              <div className="arch__col">
                <span className="arch__label">Intelligence</span>
                <div className="arch__box arch__box--accent">
                  LangGraph engine<small>typed, traceable state</small>
                </div>
                <div className="arch__row">
                  <div className="arch__box arch__box--sm">Voice</div>
                  <div className="arch__box arch__box--sm">Documents</div>
                  <div className="arch__box arch__box--sm">Memory</div>
                </div>
                <div className="arch__box arch__box--ghost">Evidence → Validation layer</div>
              </div>
              <div className="arch__arrow" aria-hidden="true"></div>
              <div className="arch__col">
                <span className="arch__label">Outcome</span>
                <div className="arch__box arch__box--human">
                  Doctor review<small>human clinical decision</small>
                </div>
                <div className="arch__box arch__box--ghost">Patient memory update</div>
              </div>
            </div>

            <div className="arch__api reveal">
              <span className="api-pill">/auth</span>
              <span className="api-pill">/documents</span>
              <span className="api-pill">/voice</span>
              <span className="api-pill">/intake</span>
              <span className="api-pill">/clinical-memory</span>
              <span className="api-pill">/routing</span>
              <span className="api-pill">/appointments</span>
              <span className="api-pill">/doctor</span>
              <span className="api-pill">/consultations</span>
              <span className="api-note">versioned · documented · typed</span>
            </div>
          </div>
        </section>

        {/* ============ METRIC ============ */}
        <section className="section metric" id="metric">
          <div className="wrap metric__inner">
            <span className="sec-tag reveal">10 — The metric that matters</span>
            <h2 className="metric__title reveal">
              Time saved <em>without losing</em> clinically relevant information.
            </h2>
            <div className="metric__compare">
              <div className="meter reveal">
                <span className="meter__k">Traditional workflow</span>
                <div className="meter__track">
                  <span className="meter__fill meter__fill--old" data-w="88%"></span>
                </div>
                <p>More time collecting information</p>
              </div>
              <div className="meter reveal">
                <span className="meter__k">With ClinSync</span>
                <div className="meter__track">
                  <span className="meter__fill meter__fill--new" data-w="24%"></span>
                </div>
                <p>Information prepared beforehand → more time on the patient</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ PROMISE ============ */}
        <section className="section promise" id="promise">
          <div className="wrap">
            <div className="promise__lines">
              <p className="reveal">
                The patient tells the story <em>once.</em>
              </p>
              <p className="reveal">
                ClinSync <em>remembers it.</em>
              </p>
              <p className="reveal">
                The doctor gets the relevant <em>picture.</em>
              </p>
              <p className="reveal">
                The doctor makes the <em>decision.</em>
              </p>
            </div>
          </div>
        </section>

        {/* ============ CTA ============ */}
        <section className="section cta" id="cta">
          <div className="cta__glow" aria-hidden="true"></div>
          <div className="wrap cta__inner">
            <span className="sec-tag reveal">Get started</span>
            <h2 className="cta__title reveal">
              Know the patient
              <br />
              <em>before you meet the patient.</em>
            </h2>
            <p className="cta__sub reveal">ClinSync prepares the clinical picture. Your team focuses on care.</p>
            <div className="cta__actions reveal">
              <button
                onClick={() => onLaunchApp('kiosk')}
                className="btn btn--solid btn--lg"
                data-cursor="launch"
                data-action="launch-app"
                data-tab="kiosk"
              >
                <span>Launch Web App</span>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18" style={{ marginLeft: 8 }}>
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <a
                href="https://clinsync-landing.vercel.app/downloads/ClinSync.apk"
                download="ClinSync.apk"
                className="btn btn--line btn--lg"
                data-cursor="download"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  style={{ display: 'inline-block', verticalAlign: '-3px', marginRight: '8px' }}
                >
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
                </svg>
                <span>Download Android APK</span>
              </a>
            </div>
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className="footer">
          <div className="wrap footer__inner">
            <div className="footer__brand">
              <a className="brand" href="#top">
                <span className="brand__mark">
                  <svg viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="1.6" opacity=".35" />
                    <path d="M16 3.5A12.5 12.5 0 0 1 28.5 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    <circle cx="16" cy="16" r="3.4" fill="currentColor" />
                  </svg>
                </span>
                <span className="brand__name">ClinSync</span>
              </a>
              <p>Know the patient before you meet the patient.</p>
            </div>
            <div className="footer__cols">
              <div>
                <span>Product</span>
                <a href="#workflow">Workflow</a>
                <a href="#memory">Clinical Memory</a>
                <a href="#brief">Doctor Brief</a>
                <a href="#evidence">Evidence</a>
              </div>
              <div>
                <span>Platform</span>
                <a href="#architecture">Architecture</a>
                <a href="#trust">Security</a>
                <a href="#architecture">API</a>
                <a href="#stats">Observability</a>
              </div>
              <div>
                <span>Prototype</span>
                <button
                  onClick={() => onLaunchApp('kiosk')}
                  style={{ textAlign: 'left', color: 'inherit', font: 'inherit', padding: '4px 0' }}
                >
                  Patient Kiosk
                </button>
                <button
                  onClick={() => onLaunchApp('doctor')}
                  style={{ textAlign: 'left', color: 'inherit', font: 'inherit', padding: '4px 0' }}
                >
                  Doctor Console
                </button>
                <button
                  onClick={() => onLaunchApp('visual-qa')}
                  style={{ textAlign: 'left', color: 'inherit', font: 'inherit', padding: '4px 0' }}
                >
                  Visual QA (G6)
                </button>
              </div>
            </div>
          </div>
          <div className="wrap footer__base">
            <span>© 2026 ClinSync. Synthetic data only for demonstrations.</span>
            <span>Patient → Memory → Intelligence → Doctor → Care</span>
          </div>
        </footer>
      </main>
    </div>
  );
};
