import React, { useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const LogoUploader = ({ onUpload, uploading, currentLogo, schoolId }) => {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  // Cloudinary configuration
  const cloudinaryCloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const cloudinaryUploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Max 2MB');
      return;
    }

    await uploadToCloudinary(file);
    // Reset the input so the same file can be uploaded again
    e.target.value = '';
  };

  const uploadToCloudinary = async (file) => {
    if (!schoolId) {
      toast.error('School ID not found');
      return;
    }

    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      toast.error('Cloudinary configuration missing. Please check your environment variables.');
      return;
    }

    setIsUploading(true);
    
    try {
      // Create form data for Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudinaryUploadPreset);
      formData.append('folder', `schools/${schoolId}`);
      formData.append('public_id', `logo`); // Overwrite existing logo

      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.secure_url;

      // Update the school document in Firestore with the logo URL
      const schoolRef = doc(db, 'schools', schoolId);
      await updateDoc(schoolRef, {
        logo_url: imageUrl,
        logo_public_id: data.public_id,
        logo_metadata: {
          format: data.format,
          width: data.width,
          height: data.height,
          bytes: data.bytes,
          created_at: data.created_at,
        },
        updated_at: new Date()
      });

      // Call the onUpload callback with the URL
      if (onUpload) {
        onUpload(imageUrl);
      }

      toast.success('School logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteLogo = async (e) => {
    e.stopPropagation();
    
    if (!schoolId) {
      toast.error('School ID not found');
      return;
    }

    try {
      // Delete the image from Cloudinary (optional - if you have the public_id)
      // Note: Cloudinary deletion requires the public_id and an API call with signature
      // For simplicity, we'll just remove the reference from Firestore
      
      // If you want to delete from Cloudinary, you'd need to implement a server-side function
      // since deleting requires the API secret
      
      // Update the school document in Firestore to remove the logo URL
      const schoolRef = doc(db, 'schools', schoolId);
      await updateDoc(schoolRef, {
        logo_url: null,
        logo_public_id: null,
        logo_metadata: null,
        updated_at: new Date()
      });
      
      // Call the onUpload callback with null
      if (onUpload) {
        onUpload(null);
      }
      
      toast.success('Logo removed successfully');
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.error('Failed to remove logo. Please try again.');
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Determine if we're in the uploading state
  const isUploadingState = uploading || isUploading;

  return (
    <div
      onClick={triggerUpload}
      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-orange-500 transition bg-gray-50 hover:bg-gray-100"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {isUploadingState ? (
        <div className="flex flex-col items-center">
          <Loader2 size={40} className="text-orange-500 animate-spin mb-3" />
          <div className="text-sm text-gray-600">Uploading logo...</div>
        </div>
      ) : currentLogo ? (
        <div className="relative inline-block">
          <img 
            src={currentLogo} 
            alt="School logo" 
            className="w-24 h-24 rounded-full mx-auto object-cover border-2 border-orange-500" 
          />
          <div 
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center cursor-pointer hover:bg-red-600 transition shadow-md"
            onClick={handleDeleteLogo}
          >
            <X size={16} className="text-white" />
          </div>
          <div className="text-xs text-gray-500 mt-2">Click to change logo</div>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="text-5xl mb-3">🏫</div>
          <div className="text-sm font-semibold text-gray-700 mb-1">Click to upload school logo</div>
          <div className="text-xs text-gray-500">PNG, JPG, SVG, WebP · 256×256px recommended · Max 2MB</div>
        </div>
      )}
    </div>
  );
};

export default LogoUploader;
