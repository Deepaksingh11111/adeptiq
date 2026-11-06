import { Link } from "react-router-dom";
import {
  BrainCircuit,
  Bot,
  ClipboardList,
  Target,
  ChartNoAxesColumnIncreasing,
  BookOpen,
  Sparkles,
  ArrowRight,
  UserRound,
  GraduationCap,
  CheckCircle2,
  Play,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

import "./LandingPage.css";

const features = [
  {
    icon: Bot,
    title: "AI Personal Tutor",
    description:
      "Get instant answers, concept explanations and step-by-step help.",
    tone: "violet",
  },
  {
    icon: ClipboardList,
    title: "AI Quiz Generator",
    description:
      "Create custom quizzes based on topics, subjects or your weak areas.",
    tone: "blue",
  },
  {
    icon: Target,
    title: "Personalized Learning",
    description:
      "Learning paths tailored to your pace, goals and performance.",
    tone: "green",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Performance Analytics",
    description:
      "Track your progress, identify strengths and focus on weak areas.",
    tone: "orange",
  },
  {
    icon: BookOpen,
    title: "Smart Study Materials",
    description:
      "Access notes, PDFs, videos and useful resources in one place.",
    tone: "purple",
  },
  {
    icon: BrainCircuit,
    title: "Weak Topic Detection",
    description:
      "AI finds your weak topics and suggests focused practice.",
    tone: "pink",
  },
];

const steps = [
  {
    icon: UserRound,
    title: "Create Your Account",
    description: "Sign up in seconds with your details.",
    tone: "violet",
  },
  {
    icon: BookOpen,
    title: "Choose Your Subject",
    description:
      "Select your class, subject or upload your study material.",
    tone: "blue",
  },
  {
    icon: BrainCircuit,
    title: "Learn with AI",
    description:
      "Get quizzes, explanations and personalized guidance.",
    tone: "green",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "Track Progress",
    description:
      "See your performance, improve weak areas and grow.",
    tone: "orange",
  },
];

function DashboardPreview() {
  const chartPoints = [
    [8, 94],
    [55, 75],
    [88, 82],
    [125, 53],
    [158, 66],
    [196, 38],
    [230, 49],
    [269, 26],
    [302, 39],
    [339, 18],
    [375, 29],
    [415, 6],
  ];

  const chartPath = chartPoints
    .map(([x, y], index) =>
      `${index === 0 ? "M" : "L"} ${x} ${y}`
    )
    .join(" ");

  return (
    <div className="la-visual-wrap">
      <div className="la-orbit la-orbit-one" />
      <div className="la-orbit la-orbit-two" />

      <div className="la-floating-cap">
        <GraduationCap size={42} />
      </div>

      <div className="la-floating-books">
        <BookOpen size={30} />
      </div>

      <div className="la-dashboard-preview">
        <div className="la-preview-topbar">
          <span className="la-mini-logo">
            <img className="la-mini-logo-image" src="/logo.png" alt="" />
            Adeptiq
          </span>

          <span className="la-live-dot" />
        </div>

        <div className="la-preview-body">
          <aside className="la-preview-sidebar">
            <span className="active">
              <ChartNoAxesColumnIncreasing size={14} />
              Dashboard
            </span>

            <span>
              <BookOpen size={14} />
              Subjects
            </span>

            <span>
              <ClipboardList size={14} />
              Quizzes
            </span>

            <span>
              <Target size={14} />
              Performance
            </span>

            <span>
              <Bot size={14} />
              AI Tutor
            </span>
          </aside>

          <div className="la-preview-main">
            <p className="la-preview-eyebrow">
              YOUR LEARNING SPACE
            </p>

            <h3>Good morning, Learner!</h3>

            <p className="la-preview-muted">
              Keep going. You're making progress.
            </p>

            <div className="la-metric-row">
              <div className="la-metric">
                <span className="la-metric-icon blue">
                  <ClipboardList size={16} />
                </span>
                <small>Total quizzes</small>
                <strong>12</strong>
              </div>

              <div className="la-metric">
                <span className="la-metric-icon green">
                  <CheckCircle2 size={16} />
                </span>
                <small>Avg. score</small>
                <strong>82%</strong>
              </div>

              <div className="la-metric">
                <span className="la-metric-icon purple">
                  <Target size={16} />
                </span>
                <small>Accuracy</small>
                <strong>87%</strong>
              </div>
            </div>

            <div className="la-chart-card">
              <div className="la-chart-heading">
                <b>Learning progress</b>
                <span>+12%</span>
              </div>

              <svg
                viewBox="0 0 430 115"
                role="img"
                aria-label="Illustrative learning progress chart"
              >
                <defs>
                  <linearGradient
                    id="laChartFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#7767ff"
                      stopOpacity=".28"
                    />

                    <stop
                      offset="100%"
                      stopColor="#7767ff"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                <path
                  d={`${chartPath} L 415 110 L 8 110 Z`}
                  fill="url(#laChartFill)"
                />

                <path
                  d={chartPath}
                  fill="none"
                  stroke="#7767ff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {chartPoints.map(([x, y]) => (
                  <circle
                    key={`${x}-${y}`}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#ffffff"
                    stroke="#7767ff"
                    strokeWidth="2"
                  />
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="la-chat-preview">
        <div className="la-bot-orb">
          <Bot size={31} />
        </div>

        <strong>Your AI Tutor</strong>

        <p>
          Ask me about concepts, quizzes and explanations!
        </p>

        <span className="la-chat-arrow">
          <ArrowRight size={17} />
        </span>
      </div>

      <span className="la-sparkle la-sparkle-one">✦</span>
      <span className="la-sparkle la-sparkle-two">✦</span>
      <span className="la-sparkle la-sparkle-three">✧</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="la-landing">
      {/* HERO SECTION */}

      <section className="la-hero-shell" id="home">
        <header className="la-navbar">
          <a
            className="la-brand"
            href="#home"
            aria-label="Adeptiq home"
          >
            <img className="la-brand-image" src="/logo.png" alt="" />

            <span>
              Adeptiq
            </span>
          </a>

          <nav
            className="la-nav-links"
            aria-label="Main navigation"
          >
            <a className="is-active" href="#home">
              Home
            </a>

            <a href="#features">Features</a>

            <a href="#how-it-works">
              How It Works
            </a>

            <a href="#about">About</a>
          </nav>

          <div className="la-nav-actions">
            <Link className="la-login-button" to="/login">
              Login
            </Link>

            <Link className="la-get-started" to="/login">
              Get Started
              <ArrowRight size={16} />
            </Link>
          </div>
        </header>

        <div className="la-hero-content">
          <div className="la-hero-copy">
            <div className="la-pill">
              <Sparkles size={14} />
              AI-Powered Learning Platform
            </div>

            <h1>
              Learn Smarter.
              <br />
              Learn <span>Your Way.</span>
            </h1>

            <p>
              An AI-powered adaptive learning platform that
              personalizes your learning experience, identifies
              weak areas, and helps you improve with intelligent
              quizzes and personalized recommendations.
            </p>

            <div className="la-hero-actions">
              <Link className="la-primary-cta" to="/login">
                <ArrowRight size={18} />
                Start Learning
              </Link>

              <a
                className="la-secondary-cta"
                href="#features"
              >
                <Play size={15} />
                Explore Features
              </a>
            </div>

            <div className="la-trust-row">
              <span>
                <CheckCircle2 size={15} />
                Personalized learning
              </span>

              <span>
                <CheckCircle2 size={15} />
                AI-powered guidance
              </span>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      {/* FEATURES SECTION */}

      <section className="la-features-section" id="features">
        <div className="la-section-heading">
          <span className="la-section-kicker">
            OUR FEATURES
          </span>

          <h2>
            Everything You Need to Learn Better
          </h2>

          <p>
            Powerful features designed to make your learning
            journey personalized, efficient and enjoyable.
          </p>
        </div>

        <div className="la-feature-grid">
          {features.map(
            ({ icon: Icon, title, description, tone }) => (
              <article
                className="la-feature-card"
                key={title}
              >
                <div className={`la-feature-icon ${tone}`}>
                  <Icon size={27} strokeWidth={2.4} />
                </div>

                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            )
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section
        className="la-how-section"
        id="how-it-works"
      >
        <div className="la-section-heading">
          <span className="la-section-kicker">
            HOW IT WORKS
          </span>

          <h2>
            Start Your Learning Journey in 4 Simple Steps
          </h2>

          <p>
            Get started in minutes and experience the power
            of AI-driven learning.
          </p>
        </div>

        <div className="la-steps-grid">
          {steps.map(
            ({ icon: Icon, title, description, tone }, index) => (
              <div className="la-step" key={title}>
                <div className={`la-step-icon ${tone}`}>
                  <Icon size={28} />

                  <span>{index + 1}</span>
                </div>

                <h3>{title}</h3>
                <p>{description}</p>

                {index < steps.length - 1 && (
                  <ArrowRight
                    className="la-step-arrow"
                    size={22}
                  />
                )}
              </div>
            )
          )}
        </div>

        {/* CALL TO ACTION */}

        <div className="la-cta-banner" id="about">
          <div className="la-cta-emblem">
            <GraduationCap size={34} />
          </div>

          <div className="la-cta-copy">
            <h2>Your Future, Powered by AI</h2>

            <p>
              Build better learning habits and move forward
              with Adeptiq.
            </p>
          </div>

          <Link
            className="la-cta-banner-button"
            to="/login"
          >
            Get Started Free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="la-footer">
        <div className="la-footer-main">
          <div className="la-footer-brand-block">
            <a className="la-brand" href="#home">
              <img className="la-brand-image" src="/logo.png" alt="" />

              <span>
                Adeptiq
              </span>
            </a>

            <p>
              AI-powered adaptive learning and personalized
              education.
            </p>
          </div>

          <div className="la-footer-column">
            <h3>Quick Links</h3>
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#about">About</a>
          </div>

          <div className="la-footer-column">
            <h3>Account</h3>
            <Link to="/login">Login</Link>
            <Link to="/login">Register</Link>
          </div>

          <div className="la-footer-column la-contact-column">
            <h3>Contact</h3>

            <span>
              <Mail size={14} />
              learnadaptai@gmail.com
            </span>

            <span>
              <Phone size={14} />
              +91 98765 43210
            </span>

            <span>
              <MapPin size={14} />
              India
            </span>
          </div>
        </div>

        <div className="la-footer-bottom">
          <span>
            © 2026 Adeptiq. All rights reserved.
          </span>

          <span>Learn · Adapt · Grow</span>
        </div>
      </footer>
    </main>
  );
}