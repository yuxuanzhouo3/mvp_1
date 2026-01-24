'use client';

import { useState, useEffect } from 'react';
// 使用原生 img 标签，避免在云托管环境下 /_next/image 路由 404 问题
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Trash2,
  Upload,
  Loader2,
  Camera,
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

interface PhotoAuditStatusProps {
  userId: string;
  token?: string;
  onPhotoDeleted?: () => void;
  onUploadClick?: () => void;
}

export default function PhotoAuditStatus({
  userId,
  token,
  onPhotoDeleted,
  onUploadClick,
}: PhotoAuditStatusProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const { toast } = useToast();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load user photos
  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/profile/photos', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load photos');
      }

      const data = await response.json();
      setPhotos(data.data || []);
    } catch (error) {
      console.error('Load photos error:', error);
      toast({
        title: t.photos.loadFailed,
        description: t.photos.failedToLoad,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token]);

  // Delete photo
  const handleDelete = async (photoId: string) => {
    try {
      setDeletingId(photoId);
      const response = await fetch(`/api/user/profile/photos?id=${photoId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete photo');
      }

      // Update local state immediately
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));

      toast({
        title: t.photos.deleted,
        description: t.photos.photoDeleted,
      });

      // Call the callback after state update
      onPhotoDeleted?.();

      // Reload photos from server after a short delay to ensure consistency
      setTimeout(() => {
        loadPhotos();
      }, 500);
    } catch (error) {
      console.error('Delete photo error:', error);
      toast({
        title: t.photos.deleteFailed,
        description: error instanceof Error ? error.message : t.photos.failedToDelete,
        variant: 'destructive',
      });
      // Reload photos to ensure state is in sync with server
      await loadPhotos();
    } finally {
      setDeletingId(null);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string, reason?: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t.photos.approved}
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            {t.photos.pending}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            {t.photos.rejected}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calculate stats
  const stats = {
    total: photos.length,
    approved: photos.filter((p) => p.audit_status === 'approved').length,
    pending: photos.filter((p) => p.audit_status === 'pending').length,
    rejected: photos.filter((p) => p.audit_status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="h-5 w-5" />
            {t.photos.myPhotos}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadPhotos}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onUploadClick && (
              <Button variant="outline" size="sm" onClick={onUploadClick}>
                <Upload className="h-4 w-4 mr-2" />
                {t.photos.upload}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        {photos.length > 0 && (
          <div className="flex gap-4 mb-4 text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {t.photos.total}: {stats.total}
            </span>
            {stats.approved > 0 && (
              <span className="text-green-600">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                {stats.approved}
              </span>
            )}
            {stats.pending > 0 && (
              <span className="text-yellow-600">
                <Clock className="h-4 w-4 inline mr-1" />
                {stats.pending}
              </span>
            )}
            {stats.rejected > 0 && (
              <span className="text-red-600">
                <XCircle className="h-4 w-4 inline mr-1" />
                {stats.rejected}
              </span>
            )}
          </div>
        )}

        {photos.length === 0 ? (
          <div className="text-center py-8">
            <Camera className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {t.photos.noPhotos}
            </p>
            {onUploadClick && (
              <Button onClick={onUploadClick}>
                <Upload className="h-4 w-4 mr-2" />
                {t.photos.uploadPhotos}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`relative rounded-lg overflow-hidden border-2 ${
                  photo.audit_status === 'approved'
                    ? 'border-green-200 dark:border-green-800'
                    : photo.audit_status === 'rejected'
                    ? 'border-red-200 dark:border-red-800'
                    : 'border-yellow-200 dark:border-yellow-800'
                }`}
              >
                {/* Photo */}
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
                        {t.photos.primary}
                      </Badge>
                    </div>
                  )}

                  {/* Status overlay for pending */}
                  {photo.audit_status === 'pending' && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <div className="bg-white/90 dark:bg-gray-800/90 rounded-lg px-3 py-2 text-center">
                        <Clock className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {t.photos.pendingReviewMessage}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status and actions */}
                <div className="p-2 bg-white dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    {getStatusBadge(photo.audit_status, photo.rejected_reason)}
                  </div>

                  {/* Rejected reason */}
                  {photo.audit_status === 'rejected' && photo.rejected_reason && (
                    <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs">
                      <div className="flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-red-700 dark:text-red-300">
                          {photo.rejected_reason}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Delete button for rejected photos */}
                  {photo.audit_status === 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(photo.id)}
                      disabled={deletingId === photo.id}
                    >
                      {deletingId === photo.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {t.photos.deleteAndReupload}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info message for pending photos */}
        {stats.pending > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  {stats.pending} {t.photos.photoPendingReview}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {t.photos.pendingReviewDesc}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
