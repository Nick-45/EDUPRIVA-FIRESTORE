import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, Check, Loader2 } from 'lucide-react';

const SchoolSearch = ({ pickedSchools, onToggleSchool, visible }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchSchools();
    }
  }, [visible]);

  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const schoolsQuery = query(
        collection(db, 'schools'),
        orderBy('name', 'asc')
      );
      const schoolsSnapshot = await getDocs(schoolsQuery);
      
      const schoolsData = schoolsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          school_id: data.school_id || data.id || doc.id,
          name: data.name || 'Unnamed School',
          county: data.city || data.county || 'N/A',
          status: data.status || 'Active',
          avatar: data.name ? data.name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase() : 'SC',
          registration_number: data.registration_number || '',
          email: data.email || '',
          phone: data.phone || '',
        };
      });
      
      setSchools(schoolsData);
    } catch (err) {
      console.error('Error fetching schools:', err);
      setError('Failed to load schools. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return 'text-green-400 bg-green-400/10';
      case 'trial': return 'text-blue-400 bg-blue-400/10';
      case 'suspended': return 'text-red-400 bg-red-400/10';
      case 'expired': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusDot = (status) => {
    switch(status?.toLowerCase()) {
      case 'active': return '🟢';
      case 'trial': return '🔵';
      case 'suspended': return '🔴';
      case 'expired': return '🟡';
      default: return '⚪';
    }
  };

  if (!visible) return null;

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.school_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="text-[10px] text-gray-500 uppercase mb-2 font-mono flex items-center justify-between">
        <span>Search Schools</span>
        <span className="text-xs font-normal text-gray-600">
          {schools.length} schools available
        </span>
      </div>
      
      <div className="relative">
        <Search size={12} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type school name, ID or email..."
          className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500 transition"
        />
      </div>
      
      {loading ? (
        <div className="mt-4 flex items-center justify-center py-8">
          <Loader2 size={24} className="text-orange-500 animate-spin" />
          <span className="ml-2 text-sm text-gray-400">Loading schools...</span>
        </div>
      ) : error ? (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
          <button 
            onClick={fetchSchools}
            className="ml-2 text-orange-400 hover:text-orange-300 underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
          {filteredSchools.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchTerm ? 'No schools found matching your search' : 'No schools available'}
            </div>
          ) : (
            filteredSchools.map((school) => (
              <div
                key={school.id}
                onClick={() => onToggleSchool(school.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  pickedSchools.has(school.id)
                    ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/5'
                    : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'
                }`}
              >
                <div className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold ${
                  pickedSchools.has(school.id) 
                    ? 'bg-orange-500/20 text-orange-400' 
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {school.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-white truncate">
                      {school.name}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(school.status)}`}>
                      {getStatusDot(school.status)} {school.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span>ID: {school.school_id}</span>
                    <span>•</span>
                    <span>{school.county}</span>
                    {school.registration_number && (
                      <>
                        <span>•</span>
                        <span>Reg: {school.registration_number}</span>
                      </>
                    )}
                  </div>
                </div>
                {pickedSchools.has(school.id) && (
                  <Check size={16} className="text-orange-400 flex-shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SchoolSearch;
