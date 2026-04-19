import { FC } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicPage } from '@/apps/central/components/pages/PublicPage';
import { CookieBanner } from './components';
import { BookingPaymentPage } from './components/BookingPaymentPage';

export const PublicApp: FC = () => {
    return (
        <BrowserRouter
            basename="/"
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <CookieBanner />
            <Routes>
                {/* Homepage */}
                <Route path="/" element={<PublicPage />} />

                {/* Public pages */}
                <Route path="/pages/:slug" element={<PublicPage />} />

                {/* Guest booking payment handoff */}
                <Route path="/booking/payment" element={<BookingPaymentPage />} />
            </Routes>
        </BrowserRouter>
    );
};
