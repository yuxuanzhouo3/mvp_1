import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validatePhotoBuffer,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/services/photoValidation';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';

// Create Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const ALLOWED_TYPES = [...ALLOWED_MIME_TYPES];

// POST - Upload photo
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const isPrimary = formData.get('is_primary') === 'true';
    const sortOrder = parseInt(formData.get('sort_order') as string || '0', 10);

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file
    if (!ALLOWED_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer for server-side validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate photo using the photoValidation service (includes dimension check)
    const validationResult = await validatePhotoBuffer(buffer, file.type, file.name);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { success: false, error: validationResult.errorReason },
        { status: 400 }
      );
    }

    // 移除照片数量限制检查

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage (buffer already created during validation)
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('user-photos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload photo' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from('user-photos')
      .getPublicUrl(fileName);

    // If setting as primary, unset other photos
    if (isPrimary) {
      await supabaseAdmin
        .from('user_photos')
        .update({ is_primary: false })
        .eq('user_id', user.id);
    }

    // Insert photo record
    const { data: photoData, error: photoError } = await supabaseAdmin
      .from('user_photos')
      .insert({
        user_id: user.id,
        url: urlData.publicUrl,
        is_primary: isPrimary || count === 0, // First photo is always primary
        sort_order: sortOrder,
        audit_status: 'pending'
      })
      .select()
      .single();

    if (photoError) {
      console.error('Photo record error:', photoError);
      // Clean up uploaded file
      await supabaseAdmin.storage.from('user-photos').remove([fileName]);
      
      return NextResponse.json(
        { success: false, error: 'Failed to save photo record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: photoData
    });

  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - List user photos
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { data: photos, error } = await supabaseAdmin
      .from('user_photos')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch photos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: photos
    });

  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a photo
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json(
        { success: false, error: 'Photo ID required' },
        { status: 400 }
      );
    }

    // Get photo record first
    const { data: photo, error: fetchError } = await supabaseAdmin
      .from('user_photos')
      .select('*')
      .eq('id', photoId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { success: false, error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const urlParts = photo.url.split('/');
    const filePath = `${user.id}/${urlParts[urlParts.length - 1]}`;
    await supabaseAdmin.storage.from('user-photos').remove([filePath]);

    // Delete record
    const { error: deleteError } = await supabaseAdmin
      .from('user_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete photo' },
        { status: 500 }
      );
    }

    // If deleted photo was primary, set first remaining photo as primary
    if (photo.is_primary) {
      const { data: remainingPhotos } = await supabaseAdmin
        .from('user_photos')
        .select('id')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .limit(1);

      if (remainingPhotos && remainingPhotos.length > 0) {
        await supabaseAdmin
          .from('user_photos')
          .update({ is_primary: true })
          .eq('id', remainingPhotos[0].id);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update photo (set primary, reorder)
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { photo_id, is_primary, sort_order } = body;

    if (!photo_id) {
      return NextResponse.json(
        { success: false, error: 'Photo ID required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    if (is_primary !== undefined) {
      // Unset other photos first
      if (is_primary) {
        await supabaseAdmin
          .from('user_photos')
          .update({ is_primary: false })
          .eq('user_id', user.id);
      }
      updateData.is_primary = is_primary;
    }

    if (sort_order !== undefined) {
      updateData.sort_order = sort_order;
    }

    const { data, error } = await supabaseAdmin
      .from('user_photos')
      .update(updateData)
      .eq('id', photo_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to update photo' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Update photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

