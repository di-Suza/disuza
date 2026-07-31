import {
  ArrowRight,
  Blocks,
  Code2,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

import logo from '@/shared/assets/images/logo.png';
import './LandingPage.css';

const features = [
  {
    icon: MessageSquareText,
    title: 'Feedback-first social feed',
    text: 'Post code, ideas, project updates, and keep feedback connected to real conversations.',
  },
  {
    icon: Code2,
    title: 'Real-time coding rooms',
    text: 'Select problems, sync code, run submissions, and collaborate without leaving the app.',
  },
  {
    icon: Blocks,
    title: 'Saved collections',
    text: 'Organize posts into collections and move saved ideas as your learning path changes.',
  },
  {
    icon: ShieldCheck,
    title: 'Safety controls',
    text: 'Reports, blocking, session controls, and protected APIs keep the workspace predictable.',
  },
];

const problems = ['Posts live in one app', 'Feedback in another', 'Coding in a third'];
const workflow = ['Share posts and projects', 'Start feedback conversations', 'Open a collaborative coding room'];
const audience = [
  'Students building proof of work',
  'Developers sharing project progress',
  'Peers solving DSA together',
  'Creators collecting structured feedback',
];

const SectionLabel = memo(({ children }: { children: string }) => (
  <span className="landing-v1-label">
    <Sparkles size={14} aria-hidden="true" />
    {children}
  </span>
));

SectionLabel.displayName = 'SectionLabel';

const LandingPage = () => (
  <main className="landing-v1-page">
    <nav className="landing-v1-nav">
      <div className="landing-v1-nav__inner">
        <Link to="/" className="landing-v1-brand">
          <img className="brand-logo-image" src={logo} alt="Disuza" />
        </Link>

        <div className="landing-v1-nav__links">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#audience">For developers</a>
        </div>

        <Link to="/auth/signin" className="landing-v1-signin">Sign in</Link>
      </div>
    </nav>

    <section className="landing-v1-hero">
      <div className="landing-v1-grid-bg" aria-hidden="true" />
      <div className="landing-v1-container landing-v1-hero__inner">
        <div>
          <SectionLabel>Developer workspace</SectionLabel>
          <h1>Social feed, portfolio, and pair coding in one loop.</h1>
          <p>
            Disuza helps developers share progress, collect feedback, discover peers, and jump into
            collaborative coding rooms from the same product experience.
          </p>
          <div className="landing-v1-actions">
            <Link to="/auth/signin">
              Free demo available
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a href="#workflow">See workflow</a>
          </div>
        </div>

        <div className="landing-v1-code-card" aria-label="Disuza workflow preview">
          <div className="landing-v1-code-card__inner">
            <div className="landing-v1-code-card__dots">
              <span />
              <span />
              <span />
            </div>
            <pre>{`room.sync("two-sum", {
  code: "shared editor",
  status: "solving",
  run: "Piston execution",
});

feed.post({
  caption: "Need feedback on this approach",
  savedTo: "DSA patterns"
});`}</pre>
          </div>
        </div>
      </div>
    </section>

    <section className="landing-v1-section">
      <div className="landing-v1-container">
        <SectionLabel>Problem</SectionLabel>
        <div className="landing-v1-problem-grid">
          {problems.map((item) => (
            <article key={item} className="landing-v1-card">
              <h2>{item}</h2>
              <p>Context gets scattered, and your progress becomes harder to show.</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section id="features" className="landing-v1-section landing-v1-section--bordered">
      <div className="landing-v1-container">
        <SectionLabel>Features</SectionLabel>
        <div className="landing-v1-feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="landing-v1-card">
              <span className="landing-v1-card__icon"><Icon size={20} aria-hidden="true" /></span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section id="workflow" className="landing-v1-section">
      <div className="landing-v1-container">
        <SectionLabel>How it works</SectionLabel>
        <div className="landing-v1-workflow-grid">
          {workflow.map((step, index) => (
            <article key={step} className="landing-v1-card">
              <span className="landing-v1-step">0{index + 1}</span>
              <h2>{step}</h2>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section id="audience" className="landing-v1-section landing-v1-section--bordered">
      <div className="landing-v1-container landing-v1-audience">
        <div>
          <SectionLabel>Who it is for</SectionLabel>
          <h2>Developers who want their learning to look alive.</h2>
        </div>
        <div className="landing-v1-audience__list">
          {audience.map((item) => (
            <div key={item}>
              <Users size={16} aria-hidden="true" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="landing-v1-section">
      <div className="landing-v1-cta">
        <h2>Ready to close the loop?</h2>
        <p>Create your developer feed, collect feedback, and collaborate from the same account.</p>
        <Link to="/auth/signup">
          Create account
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </section>

    <footer className="landing-v1-footer">
      <div className="landing-v1-container">
        <span>
          <img className="brand-logo-image" src={logo} alt="Disuza" />
        </span>
        <p>Built for focused developer growth.</p>
      </div>
    </footer>
  </main>
);

export default memo(LandingPage);
