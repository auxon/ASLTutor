import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useBilling } from '@/hooks/useBilling';
import {
  confirmCheckout,
  logoutBilling,
  openBillingPortal,
  requestMagicLink,
  startCheckout,
  verifyMagicLink,
} from '@/lib/billing';

export function AccountPage() {
  const [params] = useSearchParams();
  const { entitlement, refresh, openPaywall } = useBilling();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    const sessionId = params.get('session_id');
    if (!token && !sessionId) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      setBusy(true);
      try {
        if (token) {
          await verifyMagicLink(token);
          await refresh();
          if (!cancelled) setMessage('Signed in.');
        }
        if (sessionId) {
          await confirmCheckout(sessionId);
          await refresh();
          if (!cancelled) setMessage('Trial started. You can manage billing from this page.');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not finish sign-in.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, refresh]);

  const sendLink = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const result = await requestMagicLink(email);
      if (result.loginUrl) {
        setMessage('Dev sign-in link is ready — opening it.');
        window.location.href = result.loginUrl;
        return;
      }
      setMessage('Check your email for a sign-in link. It expires in 15 minutes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the link.');
    } finally {
      setBusy(false);
    }
  };

  const portal = async () => {
    setError(null);
    try {
      window.location.href = await openBillingPortal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing.');
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account</h1>
        <p className="text-muted-foreground mt-1">
          SignFlow Pro is $12.99/month or $99/year after a 7-day trial. The score is a handshape
          guide, not a fluency grade.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {entitlement.email ? (
              <>
                Signed in as <strong>{entitlement.email}</strong>
              </>
            ) : (
              'Not signed in.'
            )}
          </p>
          <p className="capitalize">
            Plan:{' '}
            <strong>
              {entitlement.pro
                ? entitlement.status === 'trialing'
                  ? 'Pro trial'
                  : 'Pro'
                : 'Free'}
            </strong>
            {entitlement.plan ? ` · ${entitlement.plan}` : ''}
          </p>
          {entitlement.currentPeriodEnd ? (
            <p className="text-muted-foreground">
              Current period ends {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
            </p>
          ) : null}
          {message && (
            <p className="text-success" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="text-destructive" role="status">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {!entitlement.email && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block text-sm">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-secondary border border-border"
                autoComplete="email"
              />
            </label>
            <Button type="button" onClick={() => void sendLink()} disabled={busy || !email}>
              {busy ? 'Working…' : 'Email me a sign-in link'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {entitlement.pro ? (
          <Button type="button" variant="outline" onClick={() => void portal()}>
            Manage billing
          </Button>
        ) : (
          <>
            <Button type="button" onClick={() => openPaywall('pricing')}>
              Start 7-day trial
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void startCheckout('yearly').then((url) => (window.location.href = url))}
            >
              Yearly $99
            </Button>
          </>
        )}
        {entitlement.email && (
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              void logoutBilling().then(() => {
                void refresh();
              })
            }
          >
            Sign out
          </Button>
        )}
        <Link to="/practice">
          <Button variant="secondary">Back to practice</Button>
        </Link>
      </div>
    </div>
  );
}
