import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, usePuckEditMode } from '@/shared/hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface TenantLoginFormCardProps {
  title?: string;
  description?: string;
}

export function TenantLoginFormCard({ title, description }: TenantLoginFormCardProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const isEditing = usePuckEditMode();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (isEditing) {
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/cms');
    } catch (err: unknown) {
      const apiError = err as { response?: { status?: number; data?: { message?: string } } };
      setError(apiError.response?.data?.message || t('invalid_credentials'));

      if (apiError.response?.status !== 422) {
        console.error('Tenant login error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2">
        <div className="text-center">
          <CardTitle className="text-2xl">{title || t('login_title')}</CardTitle>
          <CardDescription className="mt-2">
            {description || t('login_description')}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || isEditing}
            />
          </div>
          {error && !isEditing ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          ) : null}
          {isEditing ? (
            <div className="text-sm text-muted-foreground bg-muted/60 border rounded-md p-3">
              Login form preview. Inputs stay locked in the system-surface editor.
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading || isEditing}>
            {loading ? t('signing_in') : t('sign_in')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
