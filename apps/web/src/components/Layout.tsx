import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Hand, Library, MessageCircle, Scan, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { ReactNode } from 'react';

const DESKTOP_NAV = [
  { to: '/dictionary', label: 'Dictionary', icon: Library },
  { to: '/lessons', label: 'Learn', icon: BookOpen },
  { to: '/practice', label: 'Practice', icon: Scan },
  { to: '/talk', label: 'Talk', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: User },
];

const MOBILE_NAV = [
  { to: '/lessons', label: 'Learn', icon: BookOpen },
  { to: '/practice', label: 'Practice', icon: Scan },
  { to: '/talk', label: 'Talk', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: User },
];

const LANDING_ANCHORS = [
  { href: '#features', label: 'Features' },
  { href: '#demo', label: 'Demo' },
  { href: '#how-it-works', label: 'How it works' },
];

function navActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  if (to === '/profile') return pathname === '/profile' || pathname.startsWith('/progress');
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isTalk = location.pathname.startsWith('/talk');

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div
          className={cn(
            'mx-auto px-4 h-14 flex items-center justify-between',
            isLanding ? 'max-w-6xl' : 'container',
          )}
        >
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <Hand className="h-6 w-6 text-primary" aria-hidden="true" />
            <span>SignFlow</span>
          </Link>

          {isLanding ? (
            <nav aria-label="Landing navigation" className="hidden md:flex items-center gap-6">
              {LANDING_ANCHORS.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {label}
                </a>
              ))}
              <Link to="/talk">
                <Button size="sm" variant="secondary">
                  Talk
                </Button>
              </Link>
              <Link to="/lessons">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
          ) : (
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
              {DESKTOP_NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    navActive(location.pathname, to)
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                  )}
                  aria-current={navActive(location.pathname, to) ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {isLanding && (
            <Link to="/lessons" className="md:hidden">
              <Button size="sm">Get Started</Button>
            </Link>
          )}
        </div>
      </header>

      <main
        id="main-content"
        className={cn(
          'flex-1',
          isLanding ? 'w-full' : isTalk ? 'container mx-auto px-4 pt-3 pb-2' : 'container mx-auto px-4 py-6',
        )}
      >
        {children}
      </main>

      {!isLanding && (
        <>
          <nav
            aria-label="Mobile navigation"
            className="md:hidden sticky bottom-0 border-t border-border bg-background/95 backdrop-blur"
          >
            <div className="flex justify-around py-2 px-1">
              {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
                const active = navActive(location.pathname, to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      'flex flex-col items-center gap-0.5 px-3 py-1 text-xs rounded-xl min-w-[64px]',
                      active ? 'text-primary border border-primary/70' : 'text-muted-foreground border border-transparent',
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {!isTalk && (
            <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground hidden md:block">
              SignFlow ASL — Learn with interactive 3D hands. Content for educational purposes.
            </footer>
          )}
        </>
      )}
    </div>
  );
}
