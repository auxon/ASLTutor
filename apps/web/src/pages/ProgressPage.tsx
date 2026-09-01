import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart3, BookOpen, Flame, RefreshCw, Sparkles, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  getProgressStats,
  getReviewQueue,
  getTodayGoal,
  getAllMastery,
  recordReview,
} from '@/engine/mastery';
import { getSignById } from '@/data/content';
import { Link } from 'react-router-dom';
import type { MasteryRecord } from '@/engine/mastery';
import { getTalkApi, type TalkPlan, type TalkProfile, type UsageSnapshot } from '@/api/talk';

export function ProgressPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getProgressStats>> | null>(null);
  const [profile, setProfile] = useState<TalkProfile | null>(null);
  const [talkUsage, setTalkUsage] = useState<UsageSnapshot | null>(null);
  const reviewQueue = useLiveQuery(() => getReviewQueue(20), []) ?? [];
  const allMastery = useLiveQuery(() => getAllMastery(), []) ?? [];
  const todayGoal = useLiveQuery(() => getTodayGoal(), []);

  useEffect(() => {
    getProgressStats().then(setStats);
  }, [allMastery.length, reviewQueue.length]);

  useEffect(() => {
    const api = getTalkApi();
    api.getMe().then(setProfile);
    api.getUsage().then(setTalkUsage);
  }, []);

  const handleReview = async (record: MasteryRecord, quality: number) => {
    await recordReview(record.signId, quality);
    setStats(await getProgressStats());
  };

  const setPlan = async (plan: TalkPlan) => {
    const api = getTalkApi();
    const next = await api.patchMe({ plan });
    setProfile(next);
    setTalkUsage(await api.getUsage());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Plan, mastery, and review queue — saved on this device</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Talk plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Current plan:{' '}
            <strong className="capitalize">{profile?.plan ?? 'free'}</strong>
            {profile?.plan === 'trial' && profile.trial_ends_at
              ? ` · trial through ${new Date(profile.trial_ends_at).toLocaleDateString()}`
              : null}
          </p>
          <p className="text-sm text-muted-foreground">
            Free Talk includes {talkUsage?.talk_phrases_limit ?? 10} phrases per day. Pro is $12.99/mo or
            $99/yr with a 7-day trial. Stripe checkout is not in this slice — these buttons store the
            plan locally.
          </p>
          {talkUsage && (
            <p className="text-sm text-muted-foreground">
              Today: {talkUsage.talk_phrases_used}
              {talkUsage.talk_phrases_limit ? `/${talkUsage.talk_phrases_limit}` : ''} Talk phrases
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void setPlan('free')}>
              Free
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void setPlan('trial')}>
              Start 7-day trial
            </Button>
            <Button size="sm" onClick={() => void setPlan('pro')}>
              Pro (local)
            </Button>
            <Link
              to="/talk"
              className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-sm border border-border hover:bg-secondary"
            >
              Open Talk
            </Link>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={BookOpen}
            label="Signs Learned"
            value={stats.signsLearned.toString()}
          />
          <StatCard
            icon={RefreshCw}
            label="Review Due"
            value={stats.reviewDue.toString()}
            highlight={stats.reviewDue > 0}
          />
          <StatCard
            icon={Target}
            label="Avg Mastery"
            value={`${Math.round(stats.averageMastery * 100)}%`}
          />
          <StatCard icon={Flame} label="Day Streak" value={stats.streak.toString()} />
        </div>
      )}

      {todayGoal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Daily Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (todayGoal.completedMinutes / todayGoal.targetMinutes) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {todayGoal.completedMinutes}/{todayGoal.targetMinutes} min
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="review-heading">
        <h2 id="review-heading" className="text-xl font-bold mb-4">
          Review Queue
        </h2>
        {reviewQueue.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No reviews due — complete a lesson to add signs to your queue.
              <div className="mt-4">
                <Link
                  to="/lessons"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border hover:bg-secondary"
                >
                  Start a Lesson
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviewQueue.map((record) => {
              const sign = getSignById(record.signId);
              return (
                <Card key={record.signId}>
                  <CardContent className="py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-medium">{sign?.gloss ?? record.signId}</p>
                      <p className="text-sm text-muted-foreground">
                        Mastery: {Math.round(record.mastery * 100)}%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(record, 2)}
                      >
                        Hard
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleReview(record, 3)}>
                        Good
                      </Button>
                      <Button size="sm" onClick={() => handleReview(record, 5)}>
                        Easy
                      </Button>
                      <Link
                        to={`/dictionary/${record.signId}`}
                        className="inline-flex items-center justify-center h-8 px-3 rounded-lg text-sm hover:bg-secondary"
                      >
                        Study
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {allMastery.length > 0 && (
        <section aria-labelledby="mastery-heading">
          <h2 id="mastery-heading" className="text-xl font-bold mb-4">
            All Tracked Signs
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allMastery
              .sort((a, b) => b.mastery - a.mastery)
              .slice(0, 12)
              .map((record) => {
                const sign = getSignById(record.signId);
                return (
                  <Link
                    key={record.signId}
                    to={`/dictionary/${record.signId}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm"
                  >
                    <span>{sign?.gloss ?? record.signId}</span>
                    <span className="text-muted-foreground">
                      {Math.round(record.mastery * 100)}%
                    </span>
                  </Link>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-warning/50' : undefined}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${highlight ? 'text-warning' : 'text-primary'}`} />
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
