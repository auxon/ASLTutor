import { Link } from 'react-router-dom';
import { Hand } from 'lucide-react';

const FOOTER_LINKS = [
  { to: '/practice', label: 'Practice' },
  { to: '/lessons', label: 'Lessons' },
  { to: '/dictionary', label: 'Dictionary' },
  { to: '/account', label: 'Account' },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg mb-2">
              <Hand className="h-5 w-5 text-primary" aria-hidden="true" />
              SignFlow
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Learn American Sign Language with interactive 3D hands. Built for educational
              purposes.
            </p>
          </div>

          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {FOOTER_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="text-xs text-muted-foreground mt-10 pt-6 border-t border-border">
          © {new Date().getFullYear()} SignFlow ASL. Hand models are procedurally generated for
          this project. Camera scores are a guide, not a fluency grade.
        </p>
      </div>
    </footer>
  );
}
