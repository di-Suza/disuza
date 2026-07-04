import { Link } from 'react-router-dom';

const NotFound = () => (
  <main className="state-page">
    <section className="state-panel">
      <p className="state-panel__eyebrow">404</p>
      <h1>Page not found</h1>
      <p>This route is not available in DevLoopFeed.</p>
      <Link className="button button--primary state-panel__link" to="/">
        Go home
      </Link>
    </section>
  </main>
);

export default NotFound;
