import { ArrowRight, Code2, MessageSquareText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const highlights = [
  { icon: MessageSquareText, label: 'Feedback feeds' },
  { icon: Code2, label: 'Collab rooms' },
  { icon: ShieldCheck, label: 'Session-safe auth' },
];

const LandingPage = () => (
  <main className="landing-page">
    <div className="auth-grid-bg" />
    <section className="landing-hero">
      <div>
        <Link to="/" className="auth-brand">
          <span className="auth-brand__mark">DLF</span>
          <span>DevLoopFeed</span>
        </Link>
        <h1>DevLoopFeed</h1>
        <p>
          A focused developer feed for posts, feedback, portfolio proof, and real-time collaboration.
        </p>
        <div className="landing-actions">
          <Link className="button button--primary" to="/auth/signup">
            Create account
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className="button button--secondary" to="/auth/signin">
            Sign in
          </Link>
        </div>
      </div>

      <div className="landing-preview" aria-label="DevLoopFeed preview">
        <div className="landing-preview__topline">
          <span />
          <span />
          <span />
        </div>
        <div className="landing-preview__post">
          <div className="landing-preview__avatar" />
          <div>
            <strong>Portfolio feedback</strong>
            <p>Refine posts, collect comments, and turn work into proof.</p>
          </div>
        </div>
        <div className="landing-preview__metrics">
          {highlights.map(({ icon: Icon, label }) => (
            <article key={label}>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  </main>
);

export default LandingPage;
