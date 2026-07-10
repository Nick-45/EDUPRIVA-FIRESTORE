import React, { useState } from 'react';
import Input from '../../components/Common/Input';
import LogoUploader from '../../components/Onboarding/LogoUploader';
import { storage, db } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const Step2Branding = ({ data, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleMottoChange = (value) => {
    onChange({ motto: value });
  };

  const handleLogoUpload = async (file) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a reference to the file in Firebase Storage
      const storageRef = ref(storage, `schools/${onboardingData?.schoolId || 'temp'}/logo`);

      // Upload the file with progress tracking
      const uploadTask = uploadBytes(storageRef, file);

      // If you want progress tracking, use uploadBytesResumable
      // For simplicity, we'll use uploadBytes

      const snapshot = await uploadTask;
      
      // Get the download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      // Update the branding data with the logo URL
      onChange({ 
        logoUrl: downloadUrl, 
        logoFile: file,
        logoPath: snapshot.ref.fullPath
      });

      // If we have a school ID, update the school document in Firestore
      if (onboardingData?.schoolId) {
        const schoolRef = doc(db, 'schools', onboardingData.schoolId);
        await updateDoc(schoolRef, {
          logo_url: downloadUrl,
          logo_path: snapshot.ref.fullPath,
          updated_at: new Date()
        });
      }

      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'Failed to upload logo. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  };

  const handleLogoRemove = async () => {
    if (!data.logoUrl) return;

    try {
      // If we have a logo path, delete from Firebase Storage
      if (data.logoPath) {
        const storageRef = ref(storage, data.logoPath);
        await deleteObject(storageRef);
      }

      // Update branding data
      onChange({ 
        logoUrl: null, 
        logoFile: null,
        logoPath: null
      });

      // If we have a school ID, update the school document
      if (onboardingData?.schoolId) {
        const schoolRef = doc(db, 'schools', onboardingData.schoolId);
        await updateDoc(schoolRef, {
          logo_url: null,
          logo_path: null,
          updated_at: new Date()
        });
      }

      toast.success('Logo removed successfully');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Failed to remove logo. Please try again.');
    }
  };

  // Character counter for motto
  const mottoLength = data.motto?.length || 0;
  const maxMottoLength = 200;

  // Get the schoolId from onboardingData if available
  const onboardingData = { schoolId: null }; // This should come from context or props

  return (
    <div className="space-y-5">
      {/* School Motto */}
      <div>
        <Input
          label="School Motto *"
          value={data.motto}
          onChange={(e) => handleMottoChange(e.target.value)}
          placeholder="e.g. Excellence Through Knowledge"
          hint={`Appears in the footer of every report card and official receipt. ${mottoLength}/${maxMottoLength}`}
          maxLength={maxMottoLength}
        />
        {mottoLength > 150 && (
          <div className="text-xs text-orange-500 mt-1">
            {mottoLength >= maxMottoLength ? '⚠️ Max length reached' : `⚠️ ${mottoLength}/${maxMottoLength}`}
          </div>
        )}
      </div>

      {/* Logo Uploader */}
      <div>
        <label className="block text-xs text-gray-500 uppercase mb-2">School Logo</label>
        <LogoUploader 
          onUpload={handleLogoUpload} 
          onRemove={handleLogoRemove}
          uploading={uploading} 
          uploadProgress={uploadProgress}
          currentLogo={data.logoUrl} 
        />
        <div className="text-xs text-gray-500 mt-2">
          Recommended: 256×256px PNG with transparent background for best results.
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mt-4">
        <div className="text-xs text-gray-500 uppercase mb-3">Report Card Footer Preview</div>
        
        <div className="flex items-center justify-center gap-4">
          {data.logoUrl && (
            <img 
              src={data.logoUrl} 
              alt="School logo preview" 
              className="w-12 h-12 object-contain rounded-full border border-gray-700"
            />
          )}
          <div className="text-center flex-1">
            <div className="italic text-gray-400 text-sm mb-2">
              "{data.motto || 'Your motto here'}"
            </div>
            <div className="text-[10px] text-gray-600">
              System designed and maintained by EduPriva (info.edupriva@gmail.com)
            </div>
          </div>
        </div>
      </div>

      {/* Color Scheme Preview (Optional) */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="text-xs text-gray-500 uppercase mb-3">Theme Colors</div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-500"></div>
            <span className="text-xs text-gray-400">Primary (#ff6b00)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-orange-600"></div>
            <span className="text-xs text-gray-400">Secondary (#e55a00)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-700"></div>
            <span className="text-xs text-gray-400">Dark (#1a1a1a)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white border border-gray-700"></div>
            <span className="text-xs text-gray-400">Light (#ffffff)</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-3">
          These colors are applied across your dashboard, receipts, and public-facing pages.
        </div>
      </div>
    </div>
  );
};

export default Step2Branding;
