import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { Layout } from '@/components/Layout';
import { OnboardingModal } from '@/components/OnboardingModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { HomePage } from '@/pages/HomePage';
import { DictionaryPage } from '@/pages/DictionaryPage';
import { SignDetailPage } from '@/pages/SignDetailPage';
import { LessonsPage } from '@/pages/LessonsPage';
import { PracticePage } from '@/pages/PracticePage';
import { ProgressPage } from '@/pages/ProgressPage';
import { TalkPageFallback } from '@/pages/TalkPageFallback';

const TalkPage = lazy(() =>
  import('@/pages/TalkPage').then((module) => ({ default: module.TalkPage })),
);

const queryClient = new QueryClient();
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename}>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
            <Route path="/dictionary/:signId" element={<SignDetailPage />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/lessons/:moduleId" element={<LessonsPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route
              path="/talk"
              element={
                <ErrorBoundary
                  fallback={(error, reset) => (
                    <TalkPageFallback message={error.message} onRetry={reset} />
                  )}
                >
                  <Suspense fallback={<TalkPageFallback />}>
                    <TalkPage />
                  </Suspense>
                </ErrorBoundary>
              }
            />
            <Route path="/profile" element={<ProgressPage />} />
            <Route path="/progress" element={<ProgressPage />} />
          </Routes>
        </Layout>
        <OnboardingModal />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
