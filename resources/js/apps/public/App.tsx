import { FC } from 'react'

export const PublicApp: FC = () => {
    return (
        <div className="min-h-screen bg-white">
            <h1 className="text-2xl font-bold p-8">Public Page Renderer</h1>
            <p className="px-8 text-gray-600">Public-facing pages rendered with PuckEditor</p>
        </div>
    )
};
