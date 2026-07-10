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
import { platformWallet } from '../../services/platformWalletService';

const Ticker = () => {
  const [tickerItems, setTickerItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const subscriptionsCollection = collection(db, 'subscriptions');
  const paymentsCollection = collection(db, 'payments');
  const studentsCollection = collection(db, 'students');
  const aiRemarksCollection = collection(db, 'ai_remarks');

  useEffect(() => {
    fetchTickerData();
    // Refresh every 60 seconds
    const interval = setInterval(fetchTickerData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const fetchTickerData = async () => {
    try {
      // Fetch data in parallel
      const [
        schoolsSnapshot,
        subscriptionsSnapshot,
        paymentsSnapshot,
        studentsSnapshot,
        aiRemarksSnapshot
      ] = await Promise.all([
        getDocs(schoolsCollection),
        getDocs(subscriptionsCollection),
        getDocs(query(paymentsCollection, where('status', '==', 'completed'), orderBy('payment_date', 'desc'), limit(1))),
        getDocs(studentsCollection),
        getDocs(query(aiRemarksCollection, where('status', '==', 'published'), orderBy('created_at', 'desc')))
      ]);

      const schools = schoolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const subscriptions = subscriptionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const aiRemarks = aiRemarksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate metrics
      const totalSchools = schools.length;
      const activeSchools = schools.filter(s => s.status === 'active').length;
      const activePercentage = totalSchools > 0 ? Math.round((activeSchools / totalSchools) * 100) : 0;

      // Get expiring subscriptions (within 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const expiringSubs = subscriptions.filter(sub => {
        if (!sub.expiry_date || sub.status !== 'active') return false;
        const expiry = getDateValue(sub.expiry_date);
        return expiry && expiry > now && expiry <= thirtyDaysFromNow;
      });
      const expiringCount = new Set(expiringSubs.map(sub => sub.school_id)).size;

      // Get total students
      const totalStudents = students.length;

      // Get approved AI remarks count
      const approvedRemarks = aiRemarks.filter(r => r.status === 'published').length;

      // Get platform wallet balance
      let walletBalance = 0;
      try {
        walletBalance = await platformWallet.getBalance();
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }

      // Get last payment
      const lastPayment = paymentsSnapshot.docs[0]?.data();
      const lastPaymentAmount = lastPayment?.amount || 0;
      const lastPaymentSchool = lastPayment?.school_name || 'Unknown School';

      // Get top school by wallet balance
      const topSchool = schools.reduce((max, school) => 
        (school.wallet_balance || 0) > (max.wallet_balance || 0) ? school : max, 
        { wallet_balance: 0 }
      );

      // Build ticker items
      const items = [
        { 
          icon: '🏫', 
          text: 'Total Schools', 
          value: `${totalSchools} schools`, 
          up: true 
        },
        { 
          icon: '📊', 
          text: 'Active Schools', 
          value: `${activeSchools} / ${totalSchools} (${activePercentage}%)`, 
          up: activePercentage > 70 
        },
        { 
          icon: '⚠️', 
          text: 'Expiring Soon', 
          value: `${expiringCount} schools within 30 days`, 
          up: false 
        },
        { 
          icon: '👥', 
          text: 'Total Students', 
          value: `${totalStudents.toLocaleString()} students`, 
          up: true 
        },
        { 
          icon: '🤖', 
          text: 'AI Remarks', 
          value: `${approvedRemarks} approved remarks`, 
          up: true 
        },
        { 
          icon: '💰', 
          text: 'Platform Revenue', 
          value: `KES ${(walletBalance / 1000).toFixed(0)}K`, 
          up: true 
        },
        { 
          icon: '🏦', 
          text: 'Platform Wallet', 
          value: `KES ${walletBalance.toLocaleString()} available`, 
          up: true 
        },
        { 
          icon: '💳', 
          text: 'Last Payment', 
          value: `KES ${lastPaymentAmount.toLocaleString()} — ${lastPaymentSchool}`, 
          up: true 
        },
        { 
          icon: '🏆', 
          text: 'Top School', 
          value: `${topSchool.name || 'N/A'} (KES ${(topSchool.wallet_balance || 0).toLocaleString()})`, 
          up: true 
        }
      ];

      setTickerItems(items);
    } catch (error) {
      console.error('Error fetching ticker data:', error);
      // Set fallback data
      setTickerItems([
        { icon: '🏫', text: 'System', value: 'Loading data...', up: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Duplicate for seamless loop
  const allItems = [...tickerItems, ...tickerItems];

  if (loading) {
    return (
      <div className="bg-gray-800 border-t border-gray-700 py-2 px-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <span className="text-orange-400 text-xs font-mono font-semibold flex-shrink-0 animate-pulse">LIVE</span>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-8 whitespace-nowrap">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>⏳</span>
                <span>Loading ticker data...</span>
                <span className="text-gray-500">Please wait</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border-t border-gray-700 py-2 px-4 overflow-hidden">
      <div className="flex items-center gap-4">
        <span className="text-orange-400 text-xs font-mono font-semibold flex-shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          LIVE
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-8 whitespace-nowrap animate-[ticker_28s_linear_infinite] hover:animate-none">
            {allItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                <span className="text-base">{item.icon}</span>
                <span className="text-gray-400">{item.text}:</span>
                <span className={item.up ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-\[ticker_28s_linear_infinite\] {
          animation: ticker 28s linear infinite;
        }
        
        .hover\:animate-none:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default Ticker;
