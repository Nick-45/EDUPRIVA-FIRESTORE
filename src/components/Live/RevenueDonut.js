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

const RevenueDonut = () => {
  const [subscriptionRevenue, setSubscriptionRevenue] = useState(0);
  const [commissionRevenue, setCommissionRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [period, setPeriod] = useState('Year-to-Date');

  // Collection references
  const paymentsCollection = collection(db, 'payments');
  const subscriptionsCollection = collection(db, 'subscriptions');

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const fetchRevenueData = async () => {
    try {
      // Get current date range (Year-to-Date)
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      // Fetch completed payments for commission revenue
      const paymentsQuery = query(
        paymentsCollection,
        where('status', '==', 'completed')
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter payments for current year
      const yearPayments = payments.filter(p => {
        const date = getDateValue(p.payment_date);
        return date && date >= startOfYear && date <= now;
      });

      // Calculate commission (3% with max 200 KES cap)
      const calculateCommission = (amount) => {
        const commission = amount * 0.03;
        return Math.min(commission, 200);
      };

      // Calculate total commission revenue
      const totalCommission = yearPayments.reduce((sum, p) => {
        const commission = calculateCommission(p.amount || 0);
        return sum + commission;
      }, 0);

      // Fetch subscription revenue
      // Option 1: If you have a subscription_income field in payments
      const subscriptionIncome = yearPayments.reduce((sum, p) => {
        // If payment has a subscription_id, it's a subscription payment
        // You can customize this logic based on your data structure
        if (p.type === 'subscription' || p.subscription_id) {
          return sum + (p.amount || 0);
        }
        return sum;
      }, 0);

      // Option 2: If you have a separate subscriptions_income collection
      // const subscriptionsIncomeSnapshot = await getDocs(subscriptionsCollection);
      // const subscriptionsIncome = subscriptionsIncomeSnapshot.docs.reduce(...)

      // For demo, use a reasonable estimate based on active subscriptions
      const activeSubsQuery = query(
        subscriptionsCollection,
        where('status', '==', 'active')
      );
      const activeSubsSnapshot = await getDocs(activeSubsQuery);
      const activeSubscriptions = activeSubsSnapshot.size;
      
      // Estimate subscription revenue (assuming KES 12,500 per subscription per term)
      const estimatedSubscriptionRevenue = activeSubscriptions * 12500;

      // Use the higher of actual subscription income or estimated
      const finalSubscriptionRevenue = Math.max(subscriptionIncome, estimatedSubscriptionRevenue);

      setSubscriptionRevenue(finalSubscriptionRevenue);
      setCommissionRevenue(totalCommission);
      setTotalRevenue(finalSubscriptionRevenue + totalCommission);

    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  // Format currency with KES
  const formatKES = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate percentages
  const total = subscriptionRevenue + commissionRevenue;
  const subPercent = total > 0 ? (subscriptionRevenue / total * 100).toFixed(1) : 0;
  const commPercent = total > 0 ? (commissionRevenue / total * 100).toFixed(1) : 0;

  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const subDash = (subPercent / 100) * circumference;
  const commDash = (commPercent / 100) * circumference;
  const subOffset = circumference - subDash;
  const commOffset = circumference - (subDash + commDash);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Revenue Split</h3>
          <p className="text-xs text-gray-500 mt-0.5">Loading revenue data...</p>
        </div>
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Revenue Split</h3>
        </div>
        <div className="p-8 text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-gray-400 mb-2">No revenue data available</div>
          <div className="text-sm text-gray-500">Revenue will appear here once payments are processed</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Revenue Split</h3>
            <p className="text-xs text-gray-500 mt-0.5">Platform earnings breakdown</p>
          </div>
          <span className="text-xs text-gray-400">{period}</span>
        </div>
      </div>
      
      <div className="p-5">
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {/* Donut Chart */}
          <div className="relative w-[110px] h-[110px]">
            <svg width="110" height="110" viewBox="0 0 110 110" className="transform -rotate-90">
              <circle 
                cx="55" cy="55" r="38" 
                fill="none" 
                stroke="#f3f4f6" 
                strokeWidth="10" 
              />
              <circle 
                cx="55" cy="55" r="38" 
                fill="none" 
                stroke="#ff6b00" 
                strokeWidth="10"
                strokeDasharray={`${subDash} ${circumference}`}
                strokeDashoffset={subOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
              <circle 
                cx="55" cy="55" r="38" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="10"
                strokeDasharray={`${commDash} ${circumference}`}
                strokeDashoffset={commOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-gray-900 font-bold text-base">
                {formatCurrency(total)}
              </div>
              <div className="text-gray-400 text-[9px] uppercase tracking-wide">Total</div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex-1 min-w-[140px]">
            {/* Subscription */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-gray-700">
                  <span className="w-3 h-3 rounded-full bg-[#ff6b00]" />
                  <span className="font-medium">Subscriptions</span>
                </span>
                <span className="font-semibold text-[#ff6b00] font-mono">
                  {formatKES(subscriptionRevenue)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#ff6b00] rounded-full transition-all duration-500" 
                  style={{ width: `${subPercent}%` }} 
                />
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {subPercent}% of total
              </div>
            </div>
            
            {/* Commission */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-gray-700">
                  <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                  <span className="font-medium">Commissions (3%)</span>
                </span>
                <span className="font-semibold text-[#10b981] font-mono">
                  {formatKES(commissionRevenue)}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#10b981] rounded-full transition-all duration-500" 
                  style={{ width: `${commPercent}%` }} 
                />
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {commPercent}% of total
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Revenue Summary */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Platform Revenue</span>
            <div className="text-right">
              <span className="text-lg font-bold text-gray-900">
                {formatKES(total)}
              </span>
              <div className="text-xs text-gray-500">
                {period}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>{Math.round(subPercent)}% from subscriptions</span>
            <span>{Math.round(commPercent)}% from commissions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueDonut;
