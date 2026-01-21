import { FC } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicPage } from '@/apps/central/components/pages/PublicPage';

export const PublicApp: FC = () => {
    return (
        <BrowserRouter
            basename="/"
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <Routes>
                {/* Homepage */}
                <Route path="/" element={<PublicPage />} />

                {/* Public pages */}
                <Route path="/pages/:slug" element={<PublicPage />} />
            </Routes>
        </BrowserRouter>
    );
};
