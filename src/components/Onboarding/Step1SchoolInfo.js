import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Input from '../../components/Common/Input';
import Select from '../../components/Common/Select';

const Step1SchoolInfo = ({ data, onChange }) => {
  const [counties, setCounties] = useState([
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Machakos', 
    'Nyeri', 'Meru', 'Kiambu', 'Kajiado', 'Uasin Gishu', 'Kakamega', 'Bungoma', 
    'Mombasa', 'Kilifi', 'Kwale', 'Taita Taveta', 'Lamu', 'Garissa', 'Wajir', 
    'Mandera', 'Isiolo', 'Marsabit', 'Samburu', 'Turkana', 'West Pokot', 
    'Baringo', 'Laikipia', 'Nakuru', 'Nandi', 'Bomet', 'Kericho', 'Nyamira', 
    'Kisii', 'Homa Bay', 'Migori', 'Siaya', 'Kisumu', 'Vihiga', 'Kakamega'
  ]);
  
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [schoolLevels, setSchoolLevels] = useState([
    'Pre-Primary (PP1-PP2)',
    'Primary School (Grade 1-6)',
    'Junior Secondary (Grade 7-9)',
    'Senior Secondary (Form 1-4)',
    'Primary & Junior Secondary',
    'Primary & Secondary (All Levels)'
  ]);

  // Optionally fetch counties from Firestore if you have a counties collection
  useEffect(() => {
    const fetchCounties = async () => {
      try {
        const countiesCollection = collection(db, 'counties');
        const countiesSnapshot = await getDocs(countiesCollection);
        if (!countiesSnapshot.empty) {
          const countiesData = countiesSnapshot.docs.map(doc => doc.data().name);
          if (countiesData.length > 0) {
            setCounties(countiesData);
          }
        }
      } catch (error) {
        console.warn('Could not fetch counties from Firestore, using defaults:', error);
      }
    };
    // Uncomment to fetch from Firestore
    // fetchCounties();
  }, []);

  const handleChange = (field, value) => {
    onChange({ [field]: value });
  };

  // Helper to format phone number
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    // Format as +254 XXXXXXXXX
    if (cleaned.startsWith('254') && cleaned.length > 3) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9, 12)}`;
    }
    return value;
  };

  return (
    <div className="space-y-4">
      {/* School Name */}
      <Input
        label="Official School Name *"
        value={data.name}
        onChange={(e) => handleChange('name', e.target.value)}
        placeholder="e.g. Greenfield Academy"
        required
        maxLength={100}
      />

      {/* County and School Level */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="County / Location *"
          value={data.county}
          onChange={(e) => handleChange('county', e.target.value)}
          options={counties}
          placeholder="Select county..."
        />
        <Select
          label="School Level *"
          value={data.level}
          onChange={(e) => handleChange('level', e.target.value)}
          options={schoolLevels}
          placeholder="Select school level..."
        />
      </div>

      {/* School Email and Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="School Email *"
          type="email"
          value={data.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="info@school.ac.ke"
          required
        />
        <Input
          label="School Phone *"
          type="tel"
          value={data.phone}
          onChange={(e) => handleChange('phone', formatPhoneNumber(e.target.value))}
          placeholder="+254 7XX XXX XXX"
          required
          hint="Include country code for SMS notifications"
        />
      </div>

      {/* KNEC Code and Student Count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="KNEC School Code"
          value={data.knecCode}
          onChange={(e) => handleChange('knecCode', e.target.value.toUpperCase())}
          placeholder="e.g. 101234"
          hint="Optional — used on official CBC report cards"
          maxLength={20}
        />
        <Input
          label="No. of Students (approx.)"
          type="number"
          value={data.studentCount}
          onChange={(e) => handleChange('studentCount', parseInt(e.target.value) || 0)}
          placeholder="e.g. 342"
          min={0}
          max={10000}
        />
      </div>

      {/* Additional Fields (optional) */}
      <div className="grid grid-cols-1 gap-4">
        <Input
          label="School Website (Optional)"
          type="url"
          value={data.website || ''}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://www.school.ac.ke"
        />
      </div>

      {/* Progress indicator */}
      <div className="mt-4 p-3 bg-orange-50 border border-orange-100 rounded-lg">
        <div className="text-xs text-orange-700">
          <span className="font-medium">✓ All required fields must be filled to proceed.</span>
          {' '}You can edit these details later in Settings.
        </div>
      </div>
    </div>
  );
};

export default Step1SchoolInfo;
