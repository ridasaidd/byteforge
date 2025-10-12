import { FC } from 'react'
import { BrowserRouter } from 'react-router-dom'

export const CentralApp: FC = () => {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-50">
                <h1 className="text-2xl font-bold p-8">Central Admin App</h1>
                <p className="px-8 text-gray-600">Superadmin interface for managing tenants, users, and system-wide settings</p>
            </div>
        </BrowserRouter>
    )
};
