import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { OnboardingModal } from '@/components/OnboardingModal';
import { HomePage } from '@/pages/HomePage';
import { DictionaryPage } from '@/pages/DictionaryPage';
import { SignDetailPage } from '@/pages/SignDetailPage';
import { LessonsPage } from '@/pages/LessonsPage';
import { PracticePage } from '@/pages/PracticePage';
import { ProgressPage } from '@/pages/ProgressPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/dictionary" element={<DictionaryPage />} />
            <Route path="/dictionary/:signId" element={<SignDetailPage />} />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/lessons/:moduleId" element={<LessonsPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/progress" element={<ProgressPage />} />
          </Routes>
        </Layout>
        <OnboardingModal />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
