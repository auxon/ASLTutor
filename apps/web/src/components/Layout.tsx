import { Link, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, Hand, Home, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useBilling } from '@/hooks/useBilling';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dictionary', label: 'Dictionary', icon: BookOpen },
  { to: '/lessons', label: 'Lessons', icon: GraduationCap },
  { to: '/practice', label: 'Practice', icon: Hand },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
];

const LANDING_ANCHORS = [
  { href: '#features', label: 'Features' },
  { href: '#demo', label: 'Demo' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#pricing', label: 'Pricing' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const { entitlement, openPaywall } = useBilling();

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
              <Link to="/practice">
                <Button size="sm">Get Started</Button>
              </Link>
              {entitlement.pro ? (
                <Link to="/account" className="text-sm font-medium text-primary">
                  Pro
                </Link>
              ) : (
                <Button size="sm" variant="outline" onClick={() => openPaywall('pricing')}>
                  Start trial
                </Button>
              )}
            </nav>
          ) : (
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50',
                  )}
                  aria-current={location.pathname === to ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              ))}
              <Link
                to="/account"
                className={cn(
                  'inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium',
                  location.pathname === '/account'
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {entitlement.pro ? 'Pro' : 'Account'}
              </Link>
            </nav>
          )}

          {isLanding && (
            <div className="md:hidden flex items-center gap-2">
              <Link to="/practice">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <main
        id="main-content"
        className={cn('flex-1', isLanding ? 'w-full' : 'container mx-auto px-4 py-6')}
      >
        {children}
      </main>

      {!isLanding && (
        <>
          <nav
            aria-label="Mobile navigation"
            className="md:hidden sticky bottom-0 border-t border-border bg-background/95 backdrop-blur"
          >
            <div className="flex justify-around py-2">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-1 text-xs',
                    location.pathname === to || (to !== '/' && location.pathname.startsWith(to))
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                  aria-current={location.pathname === to ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          </nav>

          <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground hidden md:block">
            SignFlow ASL — Learn with interactive 3D hands. Content for educational purposes.
          </footer>
        </>
      )}
    </div>
  );
}
