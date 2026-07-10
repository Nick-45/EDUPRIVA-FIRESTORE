import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

const ParentProfile = () => {
  const { user, userData } = useAuth();
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    schoolName: 'N/A',
    schoolCountry: 'N/A',
    schoolPhone: 'N/A',
    schoolId: null,
  });
  const [loading, setLoading] = useState(true);

  const schoolId = user?.metadata?.school_id || userData?.school_id;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const currentUser = auth.currentUser;
        let fullName = '';
        let email = currentUser?.email || '';
        let phone = '';

        // Fetch user profile from users collection
        if (currentUser) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userDataFromDB = userDoc.data();
            fullName = userDataFromDB.full_name || userDataFromDB.name || currentUser.displayName || '';
            phone = userDataFromDB.phone || userDataFromDB.phone_number || '';
          }
        }

        // Fetch school data if schoolId exists
        let schoolName = 'N/A';
        let schoolCountry = 'N/A';
        let schoolPhone = 'N/A';

        if (schoolId) {
          const schoolDoc = await getDoc(doc(db, 'schools', schoolId));
          if (schoolDoc.exists()) {
            const schoolData = schoolDoc.data();
            schoolName = schoolData.name || 'N/A';
            schoolCountry = schoolData.country || 'N/A';
            schoolPhone = schoolData.phone || 'N/A';
          }
        }

        setProfile({
          full_name: fullName || 'Parent',
          email: email || 'Not available',
          phone: phone || 'Not provided',
          schoolName,
          schoolCountry,
          schoolPhone,
          schoolId,
        });
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, userData, schoolId]);

  if (loading) {
    return (
      <div className="p-4 pt-24">
        <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-24">
      <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-500">Review your parent account details and assigned school.</p>
          </div>
          <div className="inline-flex items-center rounded-3xl bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
            Role: Parent
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Account</div>
            <div className="mb-2 text-sm text-gray-700">
              <strong>Name:</strong> {profile.full_name}
            </div>
            <div className="mb-2 text-sm text-gray-700">
              <strong>Email:</strong> {profile.email}
            </div>
            <div className="text-sm text-gray-700">
              <strong>Phone:</strong> {profile.phone}
            </div>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">School</div>
            <div className="mb-2 text-sm text-gray-700">
              <strong>Name:</strong> {profile.schoolName}
            </div>
            <div className="mb-2 text-sm text-gray-700">
              <strong>Country:</strong> {profile.schoolCountry}
            </div>
            <div className="text-sm text-gray-700">
              <strong>Phone:</strong> {profile.schoolPhone}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentProfile;
