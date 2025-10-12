import { FC } from 'react'
import { BrowserRouter } from 'react-router-dom'

export const TenantApp: FC = () => {
    return (
        <BrowserRouter
            future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
            }}
        >
            <div className="min-h-screen bg-gray-50">
                <h1 className="text-2xl font-bold p-8">Tenant CMS App</h1>
                <p className="px-8 text-gray-600">CMS interface for content management, pages, media, and navigation</p>
            </div>
        </BrowserRouter>
    )
};
