'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// 使用原生 img 标签，避免在云托管环境下 /_next/image 路由 404 问题
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Check,
  X,
  SkipForward,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  User,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ImageIcon,
} from 'lucide-react';

interface Photo {
  id: string;
  user_id: string;
  url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  audit_status: 'pending' | 'approved' | 'rejected';
  admin_rating?: number;
  created_at: string;
  source?: 'CN' | 'INTL';
  user?: {
    id: string;
    username?: string;
    email: string;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function PhotoReviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { language } = useLanguage();
  const t = useTranslations(language);

  // Rejection reasons - using translations
  const REJECTION_REASONS = [
    { value: 'inappropriate_content', label: t.admin.photoReview.reasons.inappropriateContent },
    { value: 'low_quality', label: t.admin.photoReview.reasons.lowQuality },
    { value: 'not_a_person', label: t.admin.photoReview.reasons.notAPerson },
    { value: 'group_photo', label: t.admin.photoReview.reasons.groupPhoto },
    { value: 'face_not_visible', label: t.admin.photoReview.reasons.faceNotVisible },
    { value: 'heavy_filter', label: t.admin.photoReview.reasons.heavyFilter },
    { value: 'screenshot', label: t.admin.photoReview.reasons.screenshot },
    { value: 'duplicate', label: t.admin.photoReview.reasons.duplicate },
    { value: 'other', label: t.admin.photoReview.reasons.other },
  ];

  // State
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [sourceMeta, setSourceMeta] = useState<{
    CN?: { total?: number; error?: string | null };
    INTL?: { total?: number; error?: string | null };
  }>({});

  // Filter state
  const [searchUserId, setSearchUserId] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'pending' | 'approved'>('pending');
  const [onlyUnrated, setOnlyUnrated] = useState(false);
  const [source, setSource] = useState<'ALL' | 'CN' | 'INTL'>('ALL');

  // Modal state
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [photoToReject, setPhotoToReject] = useState<Photo | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Batch operation state
  const [batchRejectDialogOpen, setBatchRejectDialogOpen] = useState(false);
  const [batchReason, setBatchReason] = useState('');
  const [batchCustomReason, setBatchCustomReason] = useState('');

  // Current focused photo index (for keyboard navigation)
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Rating state
  const [photoRatings, setPhotoRatings] = useState<Record<string, number>>({});
  const [isRating, setIsRating] = useState(false);

  // Load photos
  const loadPhotos = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortOrder,
        status: viewMode,
      });
      params.set('source', source);

      if (viewMode === 'approved' && onlyUnrated) {
        params.set('unrated', 'true');
      }

      if (searchUserId) {
        params.set('userId', searchUserId);
      }

      const response = await fetch(`/api/admin/photos/pending?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login');
          return;
        }
        if (response.status === 403) {
          toast({
            title: t.admin.layout.accessDenied,
            description: t.admin.layout.noPermission,
            variant: 'destructive',
          });
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to load photos');
      }

      const data = await response.json();
      setPhotos(data.photos || []);
      setPagination((prev) => ({
        ...prev,
        total: data.total || 0,
        totalPages: data.totalPages || 0,
      }));
      setSourceMeta(data.sources || {});
    } catch (error) {
      console.error('Load photos error:', error);
      toast({
        title: t.admin.photoReview.error,
        description: t.admin.photoReview.failedToApprove,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.pageSize, sortOrder, searchUserId, viewMode, onlyUnrated, source, router, toast]);

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPhotos]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no dialog is open
      if (rejectDialogOpen || batchRejectDialogOpen || viewPhotoUrl) return;

      const focusedPhoto = photos[focusedIndex];
      if (!focusedPhoto) return;

      switch (e.key.toLowerCase()) {
        case 'a':
          // Only handle approve in pending mode
          if (viewMode === 'pending') {
            e.preventDefault();
            handleApprove(focusedPhoto.id, (focusedPhoto.source || 'INTL') as 'CN' | 'INTL');
          }
          break;
        case 'r':
          // Only handle reject in pending mode
          if (viewMode === 'pending') {
            e.preventDefault();
            openRejectDialog(focusedPhoto);
          }
          break;
        case ' ':
          e.preventDefault();
          if (focusedIndex < photos.length - 1) {
            setFocusedIndex((prev) => prev + 1);
          } else if (pagination.page < pagination.totalPages) {
            setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
            setFocusedIndex(0);
          }
          break;
        case 'arrowleft':
          e.preventDefault();
          if (focusedIndex > 0) {
            setFocusedIndex((prev) => prev - 1);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (focusedIndex < photos.length - 1) {
            setFocusedIndex((prev) => prev + 1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, focusedIndex, rejectDialogOpen, batchRejectDialogOpen, viewPhotoUrl, pagination, viewMode]);

  // Handle approve
  const handleApprove = async (photoId: string, photoSource: 'CN' | 'INTL') => {
    try {
      setIsProcessing(true);

      const response = await fetch('/api/admin/photos/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'approve', photoId, source: photoSource }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve photo');
      }

      toast({
        title: t.admin.photoReview.approved,
        description: t.admin.photoReview.photoApproved,
      });

      // Remove from list
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch (error) {
      console.error('Approve error:', error);
      toast({
        title: t.admin.photoReview.error,
        description: t.admin.photoReview.failedToApprove,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open reject dialog
  const openRejectDialog = (photo: Photo) => {
    setPhotoToReject(photo);
    setSelectedReason('');
    setCustomReason('');
    setRejectDialogOpen(true);
  };

  // Handle reject
  const handleReject = async () => {
    if (!photoToReject) return;

    const reason = selectedReason === 'other' ? customReason :
      REJECTION_REASONS.find((r) => r.value === selectedReason)?.label || selectedReason;

    if (!reason.trim()) {
      toast({
        title: t.admin.photoReview.error,
        description: t.admin.photoReview.reasonRequired,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);

      const response = await fetch('/api/admin/photos/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'reject',
          photoId: photoToReject.id,
          reason,
          source: photoToReject.source,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject photo');
      }

      toast({
        title: t.admin.photoReview.rejected,
        description: t.admin.photoReview.photoRejected,
      });

      // Remove from list
      setPhotos((prev) => prev.filter((p) => p.id !== photoToReject.id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      setRejectDialogOpen(false);
      setPhotoToReject(null);
    } catch (error) {
      console.error('Reject error:', error);
      toast({
        title: t.admin.photoReview.error,
        description: t.admin.photoReview.failedToReject,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle batch approve
  const handleBatchApprove = async () => {
    if (selectedPhotos.size === 0) {
      toast({
        title: t.admin.photoReview.error,
        description: 'Please select photos to approve',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);

      const selected = Array.from(selectedPhotos).map((k) => {
        const [src, id] = k.split(':');
        return { source: (src as 'CN' | 'INTL') || 'INTL', id };
      });
      const targetSource = selected[0]?.source;
      if (!targetSource || selected.some((s) => s.source !== targetSource)) {
        toast({
          title: t.admin.photoReview.error,
          description: t.admin.photoReview.batchSameSourceOnly || 'Batch operations must be within the same source',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/admin/photos/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'batch-approve',
          photoIds: selected.map((s) => s.id),
          source: targetSource,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve photos');
      }

      toast({
        title: t.admin.photoReview.approved,
        description: `${selectedPhotos.size} ${t.admin.photoReview.batchApproved}`,
      });

      // Remove from list
      const selectedIds = new Set(selected.map((s) => `${s.source}:${s.id}`));
      setPhotos((prev) => prev.filter((p) => !selectedIds.has(`${p.source}:${p.id}`)));
      setPagination((prev) => ({ ...prev, total: prev.total - selectedPhotos.size }));
      setSelectedPhotos(new Set());
    } catch (error) {
      console.error('Batch approve error:', error);
      toast({
        title: t.admin.photoReview.error,
        description: t.admin.photoReview.failedToApprove,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle batch reject
  const handleBatchReject = async () => {
    const reason = batchReason === 'other' ? batchCustomReason :
      REJECTION_REASONS.find((r) => r.value === batchReason)?.label || batchReason;

    if (!reason.trim()) {
      toast({
        title: t.admin.photoReview.error,
        description: t.admin.photoReview.reasonRequired,
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);

      const selected = Array.from(selectedPhotos).map((k) => {
        const [src, id] = k.split(':');
        return { source: (src as 'CN' | 'INTL') || 'INTL', id };
      });
      const targetSource = selected[0]?.source;
      if (!targetSource || selected.some((s) => s.source !== targetSource)) {
        toast({
          title: t.admin.photoReview.error,
          description: t.admin.photoReview.batchSameSourceOnly || 'Batch operations must be within the same source',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch('/api/admin/photos/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'batch-reject',
          photoIds: selected.map((s) => s.id),
          reason,
          source: targetSource,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject photos');
      }

      toast({
        title: t.admin.photoReview.rejected,
        description: `${selectedPhotos.size} ${t.admin.photoReview.batchRejected}`,
      });

      // Remove from list
      const selectedIds = new Set(selected.map((s) => `${s.source}:${s.id}`));
      setPhotos((prev) => prev.filter((p) => !selectedIds.has(`${p.source}:${p.id}`)));
      setPagination((prev) => ({ ...prev, total: prev.total - selectedPhotos.size }));
      setSelectedPhotos(new Set());
      setBatchRejectDialogOpen(false);
    } catch (error) {
      console.error('Batch reject error:', error);
      toast({
        title: t.admin.photoReview.error,
        description: t.admin.photoReview.failedToReject,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle photo rating
  const handleRate = async (photoId: string, photoSource: 'CN' | 'INTL') => {
    const rating = photoRatings[photoId];
    if (!rating || rating < 1 || rating > 100) {
      toast({
        title: t.admin.photoReview.error,
        description: t.admin.photoReview.ratingRange || 'Rating must be between 1 and 100',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsRating(true);

      const response = await fetch('/api/admin/photos/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'rate',
          photoId,
          rating,
          source: photoSource,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rate photo');
      }

      toast({
        title: t.admin.photoReview.ratingSubmitted || 'Rating Submitted',
        description: `${t.admin.photoReview.appearanceRating || 'Appearance Rating'}: ${rating}/100`,
      });

      // In unrated mode, remove the photo from the list after rating
      if (viewMode === 'approved' && onlyUnrated) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      } else {
        // Update local state to show the rating
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId ? { ...p, admin_rating: rating } : p
          )
        );
      }

      // Clear the input
      setPhotoRatings((prev) => {
        const newRatings = { ...prev };
        delete newRatings[photoId];
        return newRatings;
      });
    } catch (error) {
      toast({
        title: t.admin.photoReview.error,
        description: error instanceof Error ? error.message : 'Failed to rate photo',
        variant: 'destructive',
      });
    } finally {
      setIsRating(false);
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    const target = photos.find((p) => p.id === photoId);
    if (!target) return;

    try {
      setIsProcessing(true);

      const response = await fetch('/api/admin/photos/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'set-primary', photoId, source: target.source }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set primary photo');
      }

      toast({
        title: t.admin.photoReview.primarySet || 'Primary Photo Updated',
        description: t.admin.photoReview.primarySetDesc || 'Primary photo has been updated',
      });

      setPhotos((prev) =>
        prev.map((p) =>
          p.user_id === target.user_id ? { ...p, is_primary: p.id === photoId } : p
        )
      );
    } catch (error) {
      toast({
        title: t.admin.photoReview.error,
        description: error instanceof Error ? error.message : 'Failed to set primary photo',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle photo selection
  const togglePhotoSelection = (photoKey: string) => {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoKey)) {
        newSet.delete(photoKey);
      } else {
        newSet.add(photoKey);
      }
      return newSet;
    });
  };

  // Select all photos on current page
  const toggleSelectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map((p) => `${p.source || 'INTL'}:${p.id}`)));
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Calculate time since upload
  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  };

  return (
    <div>
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.admin.photoReview.title}</h1>
          <p className="text-gray-600 mt-1">{t.admin.photoReview.subtitle}</p>
        </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              <Clock className="h-3 w-3 mr-1" />
              {pagination.total}{' '}
              {viewMode === 'pending'
                ? t.admin.photoReview.pendingCount
                : t.admin.photoReview.approvedCount || 'Approved'}
            </Badge>
            <span>|</span>
            <span>{t.admin.photoReview.keyboardShortcuts}</span>
          </div>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            {(source === 'ALL' && ((sourceMeta.CN?.error && sourceMeta.CN.error !== null) || (sourceMeta.INTL?.error && sourceMeta.INTL.error !== null))) && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">{t.admin.photoReview.sourcePartialWarning || 'Some sources are not available'}</div>
                  <div className="mt-0.5">
                    {sourceMeta.CN?.error ? (t.admin.photoReview.sourceCNNotConfigured || 'CN source not configured') : null}
                    {sourceMeta.CN?.error && sourceMeta.INTL?.error ? '；' : null}
                    {sourceMeta.INTL?.error ? (t.admin.photoReview.sourceINTLNotConfigured || 'INTL source not configured') : null}
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search by user ID */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t.admin.photoReview.searchByUserId}
                  value={searchUserId}
                  onChange={(e) => setSearchUserId(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select
                value={source}
                onValueChange={(value: 'ALL' | 'CN' | 'INTL') => {
                  setSource(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  setSelectedPhotos(new Set());
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t.admin.photoReview.source || 'Source'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.admin.photoReview.sourceAll || 'All'}</SelectItem>
                  <SelectItem value="CN">{t.admin.photoReview.sourceCN || 'CN'}</SelectItem>
                  <SelectItem value="INTL">{t.admin.photoReview.sourceINTL || 'INTL'}</SelectItem>
                </SelectContent>
              </Select>

              {/* View mode selector */}
              <Select
                value={viewMode}
                onValueChange={(value: 'pending' | 'approved') => {
                  setViewMode(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                  setSelectedPhotos(new Set());
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t.admin.photoReview.viewMode || 'View Mode'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t.admin.photoReview.pendingReview || 'Pending Review'}</SelectItem>
                  <SelectItem value="approved">{t.admin.photoReview.approvedMode || 'Approved'}</SelectItem>
                </SelectContent>
              </Select>

              {viewMode === 'approved' && (
                <div className="flex items-center gap-2">
                  <input
                    id="only-unrated"
                    type="checkbox"
                    checked={onlyUnrated}
                    onChange={(e) => {
                      setOnlyUnrated(e.target.checked);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="only-unrated" className="text-sm text-gray-600">
                    {t.admin.photoReview.onlyUnrated || 'Only Unrated'}
                  </label>
                </div>
              )}

              {/* Sort order */}
              <Select
                value={sortOrder}
                onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}
              >
                <SelectTrigger className="w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t.admin.photoReview.sortOrder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">{t.admin.photoReview.oldestFirst}</SelectItem>
                  <SelectItem value="desc">{t.admin.photoReview.newestFirst}</SelectItem>
                </SelectContent>
              </Select>

              {/* Batch actions - only show for pending mode */}
              {viewMode === 'pending' && selectedPhotos.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBatchApprove}
                    disabled={isProcessing}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t.admin.photoReview.approveSelected} ({selectedPhotos.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchReason('');
                      setBatchCustomReason('');
                      setBatchRejectDialogOpen(true);
                    }}
                    disabled={isProcessing}
                    className="text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t.admin.photoReview.rejectSelected} ({selectedPhotos.size})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : photos.length === 0 ? (
          /* Empty state */
          <Card>
            <CardContent className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {viewMode === 'pending' ? t.admin.photoReview.noPendingPhotos : t.admin.photoReview.noApprovedPhotos}
              </h3>
              <p className="text-gray-600">
                {viewMode === 'pending' ? t.admin.photoReview.allReviewed : t.admin.photoReview.allApprovedReviewed}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select all checkbox */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedPhotos.size === photos.length && photos.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="select-all" className="text-sm text-gray-600">
                {t.admin.photoReview.selectAll}
              </label>
            </div>

            {/* Photo grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {photos.map((photo, index) => {
                const photoKey = `${photo.source || 'INTL'}:${photo.id}`;
                return (
                <Card
                  key={photoKey}
                  className={`overflow-hidden transition-all ${
                    focusedIndex === index
                      ? 'ring-2 ring-blue-500'
                      : ''
                  } ${selectedPhotos.has(photoKey) ? 'ring-2 ring-green-500' : ''}`}
                  onClick={() => setFocusedIndex(index)}
                >
                  <div className="relative aspect-square">
                    {/* Selection checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedPhotos.has(photoKey)}
                        onChange={() => togglePhotoSelection(photoKey)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5 rounded border-gray-300 bg-white"
                      />
                    </div>

                    {/* Photo */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnail_url || photo.url}
                      alt="User photo"
                      className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewPhotoUrl(photo.url);
                      }}
                    />

                    {/* View button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewPhotoUrl(photo.url);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  <CardContent className="p-3">
                    {/* User info */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <User className="h-4 w-4" />
                      <span className="truncate">
                        {photo.user?.username || photo.user_id.slice(0, 8)}
                      </span>
                    </div>

                    {/* Upload time */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <Clock className="h-3 w-3" />
                      <span>{getTimeSince(photo.created_at)}</span>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {photo.source || 'INTL'}
                      </Badge>
                      {photo.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>

                    {viewMode === 'approved' && !photo.is_primary && (
                      <div className="mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(photo.id);
                          }}
                          disabled={isProcessing}
                        >
                          {t.admin.photoReview.setAsPrimary || 'Set as Primary'}
                        </Button>
                      </div>
                    )}

                    {/* Appearance Rating - only for primary photo */}
                    {viewMode === 'approved' && photo.is_primary && (
                      <div className="mb-3 p-2 bg-gray-50 rounded-md">
                        <label className="text-xs text-gray-500 block mb-1">
                          {t.admin.photoReview.appearanceRating || 'Appearance Rating'}
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={photoRatings[photo.id] ?? photo.admin_rating ?? ''}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              setPhotoRatings((prev) => ({
                                ...prev,
                                [photo.id]: isNaN(value) ? 0 : value,
                              }));
                            }}
                            className="w-20 h-7 text-sm"
                            placeholder="1-100"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRate(photo.id, (photo.source || 'INTL') as 'CN' | 'INTL');
                            }}
                            disabled={isRating || !photoRatings[photo.id]}
                          >
                            {t.admin.photoReview.submitRating || 'Rate'}
                          </Button>
                          {photo.admin_rating && (
                            <span className="text-xs text-green-600 ml-auto">
                              {photo.admin_rating}/100
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons - only show for pending mode */}
                    {viewMode === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(photo.id, (photo.source || 'INTL') as 'CN' | 'INTL')}
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {t.admin.photoReview.approve}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => openRejectDialog(photo)}
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          {t.admin.photoReview.reject}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400"
                          onClick={() => {
                            if (index < photos.length - 1) {
                              setFocusedIndex(index + 1);
                            }
                          }}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1 || isLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

    {/* View photo dialog */}
      <Dialog open={!!viewPhotoUrl} onOpenChange={() => setViewPhotoUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          {viewPhotoUrl && (
            <div className="relative w-full h-[80vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewPhotoUrl}
                alt="Full size photo"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              {t.admin.photoReview.rejectPhoto}
            </DialogTitle>
            <DialogDescription>
              {t.admin.photoReview.rejectReason}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder={t.admin.photoReview.selectReason} />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedReason === 'other' && (
              <Input
                placeholder={t.admin.photoReview.customReason}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || (!selectedReason || (selectedReason === 'other' && !customReason.trim()))}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {t.admin.photoReview.reject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch reject dialog */}
      <Dialog open={batchRejectDialogOpen} onOpenChange={setBatchRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              {t.admin.photoReview.reject} {selectedPhotos.size} Photos
            </DialogTitle>
            <DialogDescription>
              All selected photos will be rejected with the same reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select value={batchReason} onValueChange={setBatchReason}>
              <SelectTrigger>
                <SelectValue placeholder={t.admin.photoReview.selectReason} />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {batchReason === 'other' && (
              <Input
                placeholder={t.admin.photoReview.customReason}
                value={batchCustomReason}
                onChange={(e) => setBatchCustomReason(e.target.value)}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchRejectDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchReject}
              disabled={isProcessing || (!batchReason || (batchReason === 'other' && !batchCustomReason.trim()))}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Reject All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
