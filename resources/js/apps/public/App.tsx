import { FC } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicPage } from '@/apps/central/components/pages/PublicPage';
import { CookieBanner } from './components';
import { BookingPaymentPage } from './components/BookingPaymentPage';
import { GuestMagicLinkPage } from './components/GuestMagicLinkPage';
import { GuestPortalPage } from './components/GuestPortalPage';

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

                {/* Guest portal */}
                <Route path="/guest-portal" element={<GuestPortalPage />} />
                <Route path="/guest-portal/:bookingId" element={<GuestPortalPage />} />
                <Route path="/my-bookings" element={<GuestPortalPage />} />
                <Route path="/my-bookings/:bookingId" element={<GuestPortalPage />} />
                <Route path="/guest/magic/:token" element={<GuestMagicLinkPage />} />
            </Routes>
        </BrowserRouter>
    );
};
