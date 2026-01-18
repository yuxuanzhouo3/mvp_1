'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// 使用原生 img 标签，避免在云托管环境下 /_next/image 路由 404 问题
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  Camera,
  Upload,
  X,
  Star,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface Photo {
  id: string;
  url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  audit_status: 'pending' | 'approved' | 'rejected';
  rejected_reason?: string;
  created_at: string;
}

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function PhotoManagementPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load photos
  const loadPhotos = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile/photos', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to load photos');
      }

      const data = await response.json();
      setPhotos(data.data || []);
    } catch (error) {
      console.error('Load photos error:', error);
      toast({
        title: t.photos?.loadFailed || 'Error',
        description: t.photos?.failedToLoad || 'Failed to load photos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, toast, t]);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    loadPhotos();
  }, [user, router, loadPhotos]);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t.profileSetup?.invalidFileType || 'Only JPG, PNG, and WebP images are allowed';
    }
    if (file.size > MAX_FILE_SIZE) {
      return t.profileSetup?.fileTooLarge || 'File size must be less than 5MB';
    }
    return null;
  };

  // Upload photos
  const handleUpload = async (files: FileList | File[]) => {
    if (!session?.access_token) return;

    const fileArray = Array.from(files);
    const remainingSlots = MAX_PHOTOS - photos.length;

    if (remainingSlots <= 0) {
      toast({
        title: t.photos?.maxPhotosReached || 'Maximum photos reached',
        description: t.photos?.maxPhotosDesc || `You can only have ${MAX_PHOTOS} photos`,
        variant: 'destructive',
      });
      return;
    }

    const filesToUpload = fileArray.slice(0, remainingSlots);

    for (const file of filesToUpload) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: t.photos?.uploadFailed || 'Upload Failed',
          description: error,
          variant: 'destructive',
        });
        continue;
      }

      try {
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('is_primary', String(photos.length === 0));

        const response = await fetch('/api/user/profile/photos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
          cache: 'no-store',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        toast({
          title: t.photos?.uploaded || 'Photo Uploaded',
          description: t.photos?.uploadedDesc || 'Your photo is now pending review',
        });

        // Reload photos
        await loadPhotos();
      } catch (error) {
        console.error('Upload error:', error);
        toast({
          title: t.photos?.uploadFailed || 'Upload Failed',
          description: error instanceof Error ? error.message : 'Failed to upload photo',
          variant: 'destructive',
        });
      }
    }

    setIsUploading(false);
  };

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
    }
  };

  // Delete photo
  const handleDelete = async (photoId: string) => {
    if (!session?.access_token) return;

    try {
      setDeletingId(photoId);
      const response = await fetch(`/api/user/profile/photos?id=${photoId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete photo');
      }

      toast({
        title: t.photos?.deleted || 'Deleted',
        description: t.photos?.photoDeleted || 'Photo has been deleted',
      });

      await loadPhotos();
    } catch (error) {
      console.error('Delete photo error:', error);
      toast({
        title: t.photos?.deleteFailed || 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete photo',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Set primary photo
  const handleSetPrimary = async (photoId: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch('/api/user/profile/photos', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ photo_id: photoId, is_primary: true }),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to set primary photo');
      }

      toast({
        title: t.photos?.primarySet || 'Primary Photo Updated',
        description: t.photos?.primarySetDesc || 'Your primary photo has been updated',
      });

      await loadPhotos();
    } catch (error) {
      console.error('Set primary error:', error);
      toast({
        title: t.photos?.error || 'Error',
        description: 'Failed to set primary photo',
        variant: 'destructive',
      });
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t.photos?.approved || 'Approved'}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            {t.photos?.pending || 'Pending'}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            {t.photos?.rejected || 'Rejected'}
          </Badge>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  const stats = {
    total: photos.length,
    approved: photos.filter((p) => p.audit_status === 'approved').length,
    pending: photos.filter((p) => p.audit_status === 'pending').length,
    rejected: photos.filter((p) => p.audit_status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              {t.photos?.managePhotos || 'Manage Photos'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t.photos?.managePhotosDesc || 'Upload and manage your profile photos'}
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.profileEdit?.backToDashboard || 'Back'}
            </Button>
          </Link>
        </div>

        {/* Upload Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t.photos?.uploadPhotos || 'Upload Photos'}
            </CardTitle>
            <CardDescription>
              {t.photos?.uploadDesc || 'Drag and drop photos or click to upload'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
                ${dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }
                ${photos.length >= MAX_PHOTOS || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={() => photos.length < MAX_PHOTOS && !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                multiple
                onChange={handleFileInput}
                className="hidden"
                disabled={photos.length >= MAX_PHOTOS || isUploading}
              />

              {isUploading ? (
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
              ) : (
                <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-primary' : 'text-gray-400'}`} />
              )}

              <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isUploading
                  ? (t.photos?.uploading || 'Uploading...')
                  : dragActive
                    ? (t.profileSetup?.dropHere || 'Drop photos here')
                    : (t.profileSetup?.dragOrClick || 'Drag photos here or click to upload')
                }
              </p>

              <p className="text-sm text-gray-500">
                {t.profileSetup?.photoRequirements || 'JPG, PNG or WebP, max 5MB each'}
              </p>

              <p className="text-sm text-gray-400 mt-2">
                {photos.length} / {MAX_PHOTOS} {t.photos?.photosUploaded || 'photos'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Photos Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                {t.photos?.myPhotos || 'My Photos'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={loadPhotos} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            {photos.length > 0 && (
              <div className="flex gap-4 text-sm">
                <span className="text-gray-600">{t.photos?.total || 'Total'}: {stats.total}</span>
                {stats.approved > 0 && (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {stats.approved}
                  </span>
                )}
                {stats.pending > 0 && (
                  <span className="text-yellow-600 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {stats.pending}
                  </span>
                )}
                {stats.rejected > 0 && (
                  <span className="text-red-600 flex items-center">
                    <XCircle className="h-4 w-4 mr-1" />
                    {stats.rejected}
                  </span>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : photos.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t.photos?.noPhotos || 'No photos uploaded yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`relative rounded-lg overflow-hidden border-2 group ${
                      photo.audit_status === 'approved'
                        ? 'border-green-200'
                        : photo.audit_status === 'rejected'
                          ? 'border-red-200'
                          : 'border-yellow-200'
                    }`}
                  >
                    <div className="aspect-square relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbnail_url || photo.url}
                        alt="User photo"
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      {/* Primary badge */}
                      {photo.is_primary && (
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-yellow-500 text-white">
                            <Star className="h-3 w-3 mr-1 fill-white" />
                            {t.photos?.primary || 'Primary'}
                          </Badge>
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {!photo.is_primary && photo.audit_status === 'approved' && (
                          <button
                            onClick={() => handleSetPrimary(photo.id)}
                            className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                            title={t.profileSetup?.setAsPrimary || 'Set as primary'}
                          >
                            <Star className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(photo.id)}
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          disabled={deletingId === photo.id}
                        >
                          {deletingId === photo.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Pending overlay */}
                      {photo.audit_status === 'pending' && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                          <div className="bg-white/90 rounded-lg px-3 py-2 text-center">
                            <Clock className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                            <p className="text-xs text-gray-600">
                              {t.photos?.pendingReviewMessage || 'Pending review'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="p-2 bg-white dark:bg-gray-800">
                      {getStatusBadge(photo.audit_status)}

                      {/* Rejected reason */}
                      {photo.audit_status === 'rejected' && photo.rejected_reason && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                          <div className="flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-red-700">{photo.rejected_reason}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending info */}
            {stats.pending > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">
                      {stats.pending} {t.photos?.photoPendingReview || 'photo(s) pending review'}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      {t.photos?.pendingReviewDesc || 'Your photos will be reviewed by our team within 24 hours'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Tips */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                {t.profileSetup?.photoTips || 'Photo Tips'}
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• {t.profileSetup?.photoTip1 || 'Use clear, high-quality photos'}</li>
                <li>• {t.profileSetup?.photoTip2 || 'Show your face clearly in your primary photo'}</li>
                <li>• {t.profileSetup?.photoTip3 || 'Include full-body shots and activity photos'}</li>
                <li>• {t.profileSetup?.photoTip4 || 'Smile! Friendly photos get more matches'}</li>
                <li>• {t.profileSetup?.photoTip5 || 'Avoid group photos or photos with filters'}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
