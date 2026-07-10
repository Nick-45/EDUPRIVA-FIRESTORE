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
import { TrendingUp, TrendingDown } from 'lucide-react';

const MonthlyChart = () => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalSchools: 0,
    totalRevenue: 0,
    averagePerSchool: 0,
    growth: 0
  });

  // Collection references
  const subscriptionsCollection = collection(db, 'subscriptions');
  const schoolsCollection = collection(db, 'schools');

  useEffect(() => {
    fetchChartData();
  }, []);

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const fetchChartData = async () => {
    try {
      // Get all active subscriptions with expiry dates
      const subscriptionsQuery = query(
        subscriptionsCollection,
        where('status', '==', 'active'),
        orderBy('expiry_date', 'asc')
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      const subscriptions = subscriptionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get total schools count
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const totalSchools = schoolsSnapshot.size;

      // Process subscriptions by month
      const monthlyData = {};
      const now = new Date();
      
      subscriptions.forEach(sub => {
        const expiryDate = getDateValue(sub.expiry_date);
        if (!expiryDate) return;
        
        const month = expiryDate.toLocaleString('default', { month: 'short' });
        const year = expiryDate.getFullYear();
        const key = `${month}-${year}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = {
            month: month,
            year: year,
            count: 0,
            total: 0,
            fullKey: key
          };
        }
        monthlyData[key].count++;
        // Add subscription amount if available (default to 12500)
        const amount = sub.amount || 12500;
        monthlyData[key].total += amount;
      });

      // Get last 6 months
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        const key = `${month}-${year}`;
        last6Months.push(key);
      }

      // Build chart data
      const chartDataArray = last6Months.map(key => {
        const data = monthlyData[key] || { count: 0, total: 0 };
        const maxValue = Math.max(...Object.values(monthlyData).map(d => d.count), 1);
        const percentage = maxValue > 0 ? (data.count / maxValue) * 100 : 0;
        
        // Determine color based on count
        let color = 'bg-green-500';
        if (data.count > 50) color = 'bg-orange-500';
        else if (data.count > 30) color = 'bg-orange-400';
        else if (data.count > 10) color = 'bg-green-400';
        
        return {
          month: monthDisplay(key),
          count: data.count,
          total: data.total,
          percentage: Math.min(Math.max(percentage, 5), 100),
          color: color,
          fullKey: key
        };
      });

      // Calculate summary
      const totalRevenue = Object.values(monthlyData).reduce((sum, d) => sum + d.total, 0);
      const totalSubscriptions = Object.values(monthlyData).reduce((sum, d) => sum + d.count, 0);
      const averagePerSchool = totalSchools > 0 ? totalRevenue / totalSchools : 0;

      // Calculate growth (compare last 3 months vs previous 3 months)
      const sortedKeys = Object.keys(monthlyData).sort();
      const recentKeys = sortedKeys.slice(-3);
      const olderKeys = sortedKeys.slice(-6, -3);
      
      const recentTotal = recentKeys.reduce((sum, key) => sum + monthlyData[key].total, 0);
      const olderTotal = olderKeys.reduce((sum, key) => sum + monthlyData[key].total, 0);
      const growth = olderTotal > 0 ? ((recentTotal - olderTotal) / olderTotal) * 100 : 0;

      setChartData(chartDataArray);
      setSummary({
        totalSchools,
        totalRevenue,
        averagePerSchool: Math.round(averagePerSchool),
        growth: Math.round(growth)
      });
      
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthDisplay = (key) => {
    const parts = key.split('-');
    return parts[0] || key;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Monthly Subscriptions</h3>
        </div>
        <div className="p-4 flex items-center justify-center h-[140px]">
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-sm text-gray-500 mt-2">Loading chart data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Monthly Subscriptions</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {chartData.length} months
            </span>
            {summary.growth !== 0 && (
              <span className={`text-xs flex items-center gap-1 ${summary.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.growth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(summary.growth)}%
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex items-end gap-2 h-[80px]">
          {chartData.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full">
                <div 
                  className={`w-full ${item.color} rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer`}
                  style={{ 
                    height: `${item.percentage}%`, 
                    minHeight: '4px',
                    maxHeight: '80px'
                  }}
                />
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {item.count} subscriptions
                  <br />
                  {formatCurrency(item.total)}
                </div>
              </div>
              <div className="text-[9px] text-gray-500 font-mono">{item.month}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <div>
            <span className="font-medium text-gray-700">{summary.totalSchools}</span> schools
          </div>
          <div className="text-center">
            <div className="font-semibold text-orange-600 text-sm">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <div className="text-[10px] text-gray-400">Total revenue</div>
          </div>
          <div className="text-right">
            <span className="text-gray-700">Avg: {formatCurrency(summary.averagePerSchool)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyChart;
