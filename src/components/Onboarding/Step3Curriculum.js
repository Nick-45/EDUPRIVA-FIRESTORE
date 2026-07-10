import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Check, Info, AlertCircle } from 'lucide-react';

const Step3Curriculum = ({ value, onChange }) => {
  const [curricula, setCurricula] = useState([
    {
      id: 'cbc',
      icon: '📚',
      name: 'CBC — Competency-Based Curriculum',
      description: 'EE · ME · AE · BE grading · Pre-Primary, Lower Primary, Upper Primary, Junior Secondary',
      recommended: true,
      features: ['Competency-based assessment', 'CBC levels (EE, ME, AE, BE)', 'Continuous assessment tracking'],
      levels: ['Pre-Primary', 'Lower Primary', 'Upper Primary', 'Junior Secondary']
    },
    {
      id: '844',
      icon: '📖',
      name: '8-4-4 — Former System',
      description: 'Percentage grading · Standard 1–8, Form 1–4 · Legacy schools',
      recommended: false,
      features: ['Traditional percentage grading', 'Standard 1-8, Form 1-4', 'Term-based assessments'],
      levels: ['Primary (Std 1-8)', 'Secondary (Form 1-4)']
    },
    {
      id: 'igcse',
      icon: '🌍',
      name: 'International / IGCSE',
      description: 'A–G grading · International schools · Cambridge system',
      recommended: false,
      features: ['A-G grading system', 'Cambridge International', 'International recognition'],
      levels: ['Primary', 'Secondary', 'Advanced']
    },
    {
      id: 'cbc_secondary',
      icon: '🎓',
      name: 'CBC — Secondary (Competency-Based)',
      description: 'Junior Secondary (Grade 7-9) & Senior Secondary (Form 1-4)',
      recommended: true,
      features: ['Competency-based assessment', 'Junior & Senior Secondary levels', 'Career pathways tracking'],
      levels: ['Junior Secondary (7-9)', 'Senior Secondary (Form 1-4)']
    }
  ]);

  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Optionally fetch curricula from Firestore if you have a curricula collection
    const fetchCurricula = async () => {
      try {
        const curriculaCollection = collection(db, 'curricula');
        const curriculaSnapshot = await getDocs(curriculaCollection);
        if (!curriculaSnapshot.empty) {
          const curriculaData = curriculaSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          if (curriculaData.length > 0) {
            setCurricula(curriculaData);
          }
        }
      } catch (error) {
        console.warn('Could not fetch curricula from Firestore, using defaults:', error);
      }
    };
    // Uncomment to fetch from Firestore
    // fetchCurricula();
  }, []);

  useEffect(() => {
    if (value) {
      const found = curricula.find(c => c.id === value);
      setSelectedCurriculum(found || null);
    }
  }, [value, curricula]);

  const handleSelect = (id) => {
    onChange(id);
    const found = curricula.find(c => c.id === id);
    setSelectedCurriculum(found || null);
  };

  const getGradeLevels = (curriculumId) => {
    const curriculum = curricula.find(c => c.id === curriculumId);
    return curriculum?.levels || [];
  };

  const getFeatures = (curriculumId) => {
    const curriculum = curricula.find(c => c.id === curriculumId);
    return curriculum?.features || [];
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 mb-4">
        Select the curriculum your school follows. This determines the grading system used in report cards.
      </div>

      <div className="grid gap-3">
        {curricula.map((curr) => (
          <div
            key={curr.id}
            onClick={() => handleSelect(curr.id)}
            className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 flex items-start gap-3 ${
              value === curr.id
                ? 'border-orange-500 bg-orange-500/5 shadow-lg shadow-orange-500/10'
                : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
            }`}
          >
            <div className="text-2xl flex-shrink-0">{curr.icon}</div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold ${value === curr.id ? 'text-white' : 'text-gray-300'}`}>
                  {curr.name}
                </span>
                {curr.recommended && (
                  <span className="text-[10px] px-2 py-0.5 bg-green-500/15 text-green-400 rounded-full border border-green-500/20">
                    ✓ Recommended
                  </span>
                )}
                {value === curr.id && (
                  <span className="text-[10px] px-2 py-0.5 bg-orange-500/15 text-orange-400 rounded-full border border-orange-500/20">
                    Selected
                  </span>
                )}
              </div>
              
              <div className="text-xs text-gray-500 mt-1">{curr.description}</div>
              
              {value === curr.id && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-2">Grade Levels:</div>
                  <div className="flex flex-wrap gap-2">
                    {getGradeLevels(curr.id).map((level, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-gray-700/50 rounded-full text-gray-300">
                        {level}
                      </span>
                    ))}
                  </div>
                  
                  <div className="text-xs text-gray-400 mt-2 mb-1">Features:</div>
                  <div className="flex flex-wrap gap-2">
                    {getFeatures(curr.id).map((feature, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-orange-500/10 rounded-full text-orange-400 border border-orange-500/10">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {value === curr.id ? (
              <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <Check size={14} className="text-white" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-gray-600 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Information Box */}
      <div className="bg-orange-500/5 border border-orange-500/15 rounded-lg p-3 text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <Info size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <b className="text-orange-400">Note:</b> Curriculum migration support is built in. You can switch between systems and map old subjects to new ones without losing data.
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {value && (
        <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-3 text-xs text-green-400">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              You have selected <b>{curricula.find(c => c.id === value)?.name}</b>. You can change this later in Settings.
            </div>
          </div>
        </div>
      )}

      {/* Subject Template Preview */}
      {value && (
        <div className="mt-4">
          <div className="text-xs text-gray-500 uppercase mb-2">Default Subjects for {curricula.find(c => c.id === value)?.name}</div>
          <div className="flex flex-wrap gap-2">
            {value === 'cbc' && (
              <>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">Mathematics</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">English</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">Kiswahili</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">Science</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">Social Studies</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">CRE</span>
                <span className="text-xs px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/20">+ Customize in Settings</span>
              </>
            )}
            {value === '844' && (
              <>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">Mathematics</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">English</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">Kiswahili</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">Science</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">Social Studies</span>
                <span className="text-xs px-3 py-1 bg-gray-700 rounded-full text-gray-300">CRE</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Step3Curriculum;
