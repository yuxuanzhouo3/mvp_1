'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/components/language-provider';
import { useTranslations } from '@/lib/i18n';
import { 
  Camera, 
  Upload, 
  X, 
  Star, 
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import type { CompleteProfileData } from '@/types/database';

interface Step6Props {
  data: Partial<CompleteProfileData>;
  onUpdate: (data: Partial<CompleteProfileData>) => void;
  onValidChange: (valid: boolean) => void;
}

interface PhotoItem {
  id: string;
  file?: File;
  preview: string;
  is_primary: boolean;
  uploading?: boolean;
  error?: string;
}

const MIN_PHOTOS = 1;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function Step6PhotoUpload({ data, onUpdate, onValidChange }: Step6Props) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from data
  useEffect(() => {
    if (data.photos && data.photos.length > 0) {
      const initialPhotos: PhotoItem[] = data.photos.map((photo, index) => ({
        id: `existing-${index}`,
        preview: photo.url || '',
        is_primary: photo.is_primary,
      }));
      setPhotos(initialPhotos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validate and update
  useEffect(() => {
    const hasEnoughPhotos = photos.length >= MIN_PHOTOS;
    const hasPrimaryPhoto = photos.some(p => p.is_primary);
    const noErrors = photos.every(p => !p.error);

    const isValid = hasEnoughPhotos && hasPrimaryPhoto && noErrors;
    onValidChange(isValid);

    if (photos.length > 0) {
      onUpdate({
        photos: photos.map(p => ({
          file: p.file,
          url: p.preview,
          is_primary: p.is_primary,
        })),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t.profileSetup?.invalidFileType || 'Only JPG, PNG, and WebP images are allowed';
    }
    return null;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const error = validateFile(file);
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setPhotos((prev) => {
          const shouldBePrimary = prev.length === 0 || !prev.some((p) => p.is_primary);
          const newPhoto: PhotoItem = {
            id: `photo-${Date.now()}-${Math.random()}`,
            file,
            preview: e.target?.result as string,
            is_primary: shouldBePrimary,
            error: error || undefined,
          };
          return [...prev, newPhoto];
        });
      };
      
      reader.readAsDataURL(file);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const newPhotos = prev.filter(p => p.id !== id);
      // If removed photo was primary, make first photo primary
      if (newPhotos.length > 0 && !newPhotos.some(p => p.is_primary)) {
        newPhotos[0].is_primary = true;
      }
      return newPhotos;
    });
  };

  const setPrimaryPhoto = (id: string) => {
    setPhotos(prev => prev.map(p => ({
      ...p,
      is_primary: p.id === id,
    })));
  };

  const primaryPhoto = photos.find(p => p.is_primary);
  const otherPhotos = photos.filter(p => !p.is_primary);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-lg">
          <Camera className="w-5 h-5 text-primary" />
          {t.profileSetup?.photos || 'Photos'} <span className="text-red-500">*</span>
        </Label>
        <span className="text-sm text-gray-500">
          {photos.length}
        </span>
      </div>

      {/* Drop Zone */}
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
          cursor-pointer
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-primary' : 'text-gray-400'}`} />
        
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          {dragActive 
            ? (t.profileSetup?.dropHere || 'Drop photos here') 
            : (t.profileSetup?.dragOrClick || 'Drag photos here or click to upload')
          }
        </p>
        
        <p className="text-sm text-gray-500">
          {t.profileSetup?.photoRequirements || 'JPG, PNG or WebP'}
        </p>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="space-y-4">
          {/* Primary Photo */}
          {primaryPhoto && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                {t.profileSetup?.primaryPhoto || 'Primary Photo'}
              </p>
              <div className="relative w-48 h-48 rounded-xl overflow-hidden border-4 border-yellow-400 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={primaryPhoto.preview}
                  alt="Primary"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(primaryPhoto.id)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                {primaryPhoto.error && (
                  <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-2">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    {primaryPhoto.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other Photos */}
          {otherPhotos.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t.profileSetup?.additionalPhotos || 'Additional Photos'}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {otherPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.preview}
                      alt="Photo"
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay buttons */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPrimaryPhoto(photo.id)}
                        className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors"
                        title={t.profileSetup?.setAsPrimary || 'Set as primary'}
                      >
                        <Star className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title={t.profileSetup?.remove || 'Remove'}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {photo.error && (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 truncate">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        Error
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Status */}
      <div className="space-y-2">
        <div className={`flex items-center gap-2 text-sm ${photos.length >= MIN_PHOTOS ? 'text-green-600' : 'text-gray-500'}`}>
          {photos.length >= MIN_PHOTOS ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {t.profileSetup?.minPhotosRequired || `At least ${MIN_PHOTOS} photo required`}
        </div>
        
        <div className={`flex items-center gap-2 text-sm ${photos.some(p => p.is_primary) ? 'text-green-600' : 'text-gray-500'}`}>
          {photos.some(p => p.is_primary) ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {t.profileSetup?.primaryPhotoSet || 'Primary photo selected'}
        </div>
      </div>

      {/* Photo Tips */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          📸 {t.profileSetup?.photoTips || 'Photo Tips'}
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• {t.profileSetup?.photoTip1 || 'Use clear, high-quality photos'}</li>
          <li>• {t.profileSetup?.photoTip2 || 'Show your face clearly in your primary photo'}</li>
          <li>• {t.profileSetup?.photoTip3 || 'Include full-body shots and activity photos'}</li>
          <li>• {t.profileSetup?.photoTip4 || 'Smile! Friendly photos get more matches'}</li>
          <li>• {t.profileSetup?.photoTip5 || 'Avoid group photos or photos with filters'}</li>
        </ul>
      </div>

      {/* Empty State */}
      {photos.length === 0 && (
        <div className="text-center py-8">
          <ImageIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {t.profileSetup?.noPhotosYet || 'No photos uploaded yet'}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4"
          >
            <Upload className="w-4 h-4 mr-2" />
            {t.profileSetup?.uploadPhotos || 'Upload Photos'}
          </Button>
        </div>
      )}
    </div>
  );
}

