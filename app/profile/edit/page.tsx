'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, Calendar, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';

const profileEditSchema = z.object({
  username: z.string().min(3, 'profileEdit.usernameMinChars'),
  bio: z.string().max(500, 'profileEdit.bioMaxChars'),
  age: z.number().min(18, 'profileEdit.ageMin').max(100, 'profileEdit.ageMax'),
  location: z.string().min(2, 'profileEdit.locationMin'),
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

export default function ProfileEditPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
  });

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    loadProfile();
  }, [user, router]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        form.reset({
          username: data.profile.username || '',
          bio: data.profile.bio || '',
          age: data.profile.age || 18,
          location: data.profile.location || '',
        });
      }
    } catch (error) {
      toast({
        title: t.profileEdit.loadFailed,
        description: t.profileEdit.loadFailedDesc,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: ProfileEditFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast({
          title: t.profileEdit.updateSuccess,
          description: t.profileEdit.updateSuccessDesc,
        });
        router.push('/dashboard');
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      toast({
        title: t.profileEdit.updateFailed,
        description: t.profileEdit.updateFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t.profileEdit.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t.profileEdit.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t.profileEdit.subtitle}
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.profileEdit.backToDashboard}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.profileEdit.basicInfo}</CardTitle>
            <CardDescription>
              {t.profileEdit.basicInfoDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="text-sm font-medium">{t.profileEdit.username}</label>
                <Input
                  {...form.register('username')}
                  placeholder={t.profileEdit.usernamePlaceholder}
                  icon={<User className="h-4 w-4" />}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-500 mt-1">
                    {t.profileEdit[form.formState.errors.username.message as keyof typeof t.profileEdit]}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">{t.profileEdit.bio}</label>
                <Textarea
                  {...form.register('bio')}
                  placeholder={t.profileEdit.bioPlaceholder}
                  rows={4}
                />
                {form.formState.errors.bio && (
                  <p className="text-sm text-red-500 mt-1">
                    {t.profileEdit[form.formState.errors.bio.message as keyof typeof t.profileEdit]}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{t.profileEdit.age}</label>
                  <Input
                    {...form.register('age', { valueAsNumber: true })}
                    type="number"
                    placeholder={t.profileEdit.agePlaceholder}
                    icon={<Calendar className="h-4 w-4" />}
                  />
                  {form.formState.errors.age && (
                    <p className="text-sm text-red-500 mt-1">
                      {t.profileEdit[form.formState.errors.age.message as keyof typeof t.profileEdit]}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">{t.profileEdit.location}</label>
                  <Input
                    {...form.register('location')}
                    placeholder={t.profileEdit.locationPlaceholder}
                    icon={<MapPin className="h-4 w-4" />}
                  />
                  {form.formState.errors.location && (
                    <p className="text-sm text-red-500 mt-1">
                      {t.profileEdit[form.formState.errors.location.message as keyof typeof t.profileEdit]}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link href="/dashboard">
                  <Button type="button" variant="outline">
                    {t.profileEdit.cancel}
                  </Button>
                </Link>
                <Button type="submit" disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? t.profileEdit.saving : t.profileEdit.saveChanges}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 