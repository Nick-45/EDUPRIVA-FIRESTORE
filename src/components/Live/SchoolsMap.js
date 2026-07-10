import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { MapPin, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SchoolsMap = () => {
  const [counties, setCounties] = useState([]);
  const [totalSchools, setTotalSchools] = useState(0);
  const [activeLocations, setActiveLocations] = useState(0);
  const [loading, setLoading] = useState(true);

  // Collection reference
  const schoolsCollection = collection(db, 'schools');

  // Kenya counties coordinates (approximate x,y percentages)
  const countyCoordinates = {
    'Nairobi': { x: 40, y: 38 },
    'Nakuru': { x: 32, y: 28 },
    'Kisumu': { x: 22, y: 35 },
    'Mombasa': { x: 52, y: 62 },
    'Meru': { x: 50, y: 20 },
    'Nyeri': { x: 38, y: 22 },
    'Machakos': { x: 60, y: 42 },
    'Embu': { x: 60, y: 18 },
    'Eldoret': { x: 28, y: 14 },
    'Thika': { x: 45, y: 30 },
    'Kiambu': { x: 38, y: 32 },
    'Narok': { x: 30, y: 45 },
    'Kajiado': { x: 35, y: 48 },
    'Uasin Gishu': { x: 28, y: 12 },
    'Kakamega': { x: 18, y: 20 },
    'Bungoma': { x: 15, y: 16 },
    'Kilifi': { x: 58, y: 55 },
    'Kwale': { x: 55, y: 68 },
    'Taita Taveta': { x: 50, y: 58 },
    'Lamu': { x: 68, y: 70 },
    'Garissa': { x: 72, y: 48 },
    'Wajir': { x: 78, y: 35 },
    'Mandera': { x: 85, y: 22 },
    'Isiolo': { x: 58, y: 15 },
    'Marsabit': { x: 52, y: 5 },
    'Samburu': { x: 45, y: 8 },
    'Turkana': { x: 20, y: 8 },
    'West Pokot': { x: 25, y: 10 },
    'Baringo': { x: 30, y: 18 },
    'Laikipia': { x: 42, y: 18 },
    'Nandi': { x: 28, y: 25 },
    'Bomet': { x: 30, y: 38 },
    'Kericho': { x: 32, y: 32 },
    'Nyamira': { x: 30, y: 42 },
    'Kisii': { x: 28, y: 40 },
    'Homa Bay': { x: 22, y: 42 },
    'Migori': { x: 20, y: 48 },
    'Siaya': { x: 18, y: 30 },
    'Vihiga': { x: 20, y: 28 }
  };

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    try {
      // Fetch all schools
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const schools = schoolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group schools by county
      const countyMap = {};
      let total = 0;
      let suspendedCount = 0;

      schools.forEach(school => {
        const county = school.city || school.county || 'Unknown';
        total++;

        if (!countyMap[county]) {
          countyMap[county] = {
            name: county,
            schools: 0,
            suspended: false,
            color: 'green'
          };
        }

        countyMap[county].schools++;
        
        if (school.status === 'suspended') {
          countyMap[county].suspended = true;
          suspendedCount++;
        }
      });

      // Determine colors based on school count
      const countyData = Object.values(countyMap).map(county => {
        let color = 'green';
        if (county.suspended) {
          color = 'red';
        } else if (county.schools >= 5) {
          color = 'orange';
        } else if (county.schools >= 3) {
          color = 'yellow';
        }
        
        // Add coordinates if available
        const coords = countyCoordinates[county.name];
        return {
          ...county,
          color: color,
          x: coords?.x || 30 + Math.random() * 40,
          y: coords?.y || 20 + Math.random() * 40,
          hasCoords: !!coords
        };
      });

      // Sort by school count (highest first)
      countyData.sort((a, b) => b.schools - a.schools);

      setCounties(countyData);
      setTotalSchools(total);
      setActiveLocations(countyData.filter(c => !c.suspended).length);

    } catch (error) {
      console.error('Error fetching school data:', error);
      toast.error('Failed to load school locations');
    } finally {
      setLoading(false);
    }
  };

  const handleCountyClick = (county) => {
    if (county.suspended) {
      toast.error(`${county.name}: ${county.schools} suspended school${county.schools !== 1 ? 's' : ''}`);
    } else {
      toast.success(`${county.name}: ${county.schools} school${county.schools !== 1 ? 's' : ''}`);
    }
  };

  const getDotSize = (schoolCount) => {
    if (schoolCount >= 5) return 'w-4 h-4';
    if (schoolCount >= 3) return 'w-3 h-3';
    return 'w-2 h-2';
  };

  const getDotColor = (color) => {
    switch(color) {
      case 'orange': return 'bg-orange-500';
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusMessage = () => {
    if (totalSchools === 0) return 'No schools registered yet';
    return `${totalSchools} schools across ${activeLocations} locations`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden h-[320px] flex flex-col">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <MapPin size={16} className="text-orange-400" />
            Schools by Region
          </h3>
          <span className="text-xs text-gray-500">Loading...</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (counties.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden h-[320px] flex flex-col">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <MapPin size={16} className="text-orange-400" />
            Schools by Region
          </h3>
          <span className="text-xs text-gray-500">0 locations</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">📍</div>
            <div className="text-sm text-gray-500">No schools registered yet</div>
          </div>
        </div>
      </div>
    );
  }

  // Get top counties for display
  const topCounties = counties.slice(0, 4);
  const remainingCount = counties.length - topCounties.length;

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden h-[320px] flex flex-col">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-700">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <MapPin size={16} className="text-orange-400" />
          Schools by Region
        </h3>
        <span className="text-xs text-gray-500">{getStatusMessage()}</span>
      </div>
      
      <div className="flex-1 p-4">
        {/* Map Placeholder */}
        <div className="relative h-[180px] bg-gray-700/30 rounded-lg overflow-hidden">
          {/* Kenya map background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700/30 to-gray-800/30" />
          
          {/* County dots */}
          {counties.map((county, idx) => (
            <div
              key={idx}
              className={`absolute ${getDotSize(county.schools)} rounded-full cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                getDotColor(county.color)
              } ${county.suspended ? 'animate-none' : 'animate-pulse'}`}
              style={{ 
                top: `${county.y}%`, 
                left: `${county.x}%`,
                boxShadow: county.color === 'orange' ? '0 0 12px rgba(251, 146, 60, 0.3)' :
                           county.color === 'red' ? '0 0 12px rgba(239, 68, 68, 0.3)' :
                           '0 0 8px rgba(34, 197, 94, 0.2)'
              }}
              onClick={() => handleCountyClick(county)}
              title={`${county.name} — ${county.schools} schools${county.suspended ? ' (Suspended)' : ''}`}
            >
              {county.schools >= 5 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white opacity-50 animate-ping" />
              )}
            </div>
          ))}
          
          <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Active
            </span>
            <span className="flex items-center gap-1 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Suspended
            </span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400">
          {topCounties.map((county, idx) => (
            <span key={idx} className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(county.color)}`} />
              {county.name}: {county.schools}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="text-gray-500">+ {remainingCount} more counties</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolsMap;
