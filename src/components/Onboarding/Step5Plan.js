import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Check, Info, AlertCircle, Star, Crown } from 'lucide-react';

const Step5Plan = ({ value, onChange }) => {
  const [plans, setPlans] = useState([
    {
      id: 'standard',
      name: 'Standard',
      price: '12,500',
      period: '/ term',
      badge: 'MOST POPULAR',
      popular: true,
      icon: '📊',
      color: 'orange',
      features: [
        '✅ Unlimited students',
        '✅ All CBC modules',
        '✅ AI remarks (100/term)',
        '✅ Helix Pay integration',
        '✅ Email + SMS notifications',
        '✅ Offline-first mode',
        '✅ Report card generation',
        '✅ Advanced analytics'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '18,500',
      period: '/ term',
      badge: 'BEST VALUE',
      popular: false,
      icon: '👑',
      color: 'purple',
      features: [
        '✅ Unlimited students',
        '✅ All CBC modules',
        '✅ AI remarks (500/term)',
        '✅ Helix Pay integration',
        '✅ Email + SMS notifications',
        '✅ Offline-first mode',
        '✅ Report card generation',
        '✅ Advanced analytics',
        '✅ Custom branding',
        '✅ API access',
        '✅ Priority support'
      ]
    },
    {
      id: 'trial',
      name: 'Free Trial',
      price: '0',
      period: '/ 30 days',
      badge: null,
      popular: false,
      icon: '🎯',
      color: 'green',
      features: [
        '✅ Up to 50 students',
        '✅ All CBC modules',
        '⚠️ AI remarks (10 only)',
        '✅ Helix Pay integration',
        '✅ Email notifications',
        '⚠️ No SMS (trial)',
        '✅ Report cards (5 only)',
        '⚠️ Limited analytics'
      ]
    }
  ]);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    // Optionally fetch plans from Firestore
    const fetchPlans = async () => {
      try {
        const plansCollection = collection(db, 'plans');
        const plansSnapshot = await getDocs(plansCollection);
        if (!plansSnapshot.empty) {
          const plansData = plansSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          if (plansData.length > 0) {
            setPlans(plansData);
          }
        }
      } catch (error) {
        console.warn('Could not fetch plans from Firestore, using defaults:', error);
      }
    };
    // Uncomment to fetch from Firestore
    // fetchPlans();
  }, []);

  useEffect(() => {
    if (value) {
      const found = plans.find(p => p.id === value);
      setSelectedPlan(found || null);
    }
  }, [value, plans]);

  const handleSelect = (id) => {
    onChange(id);
    const found = plans.find(p => p.id === id);
    setSelectedPlan(found || null);
  };

  const getColorClasses = (color) => {
    const colors = {
      orange: {
        border: 'border-orange-500',
        bg: 'bg-orange-500/5',
        text: 'text-orange-400',
        hover: 'hover:border-orange-400'
      },
      purple: {
        border: 'border-purple-500',
        bg: 'bg-purple-500/5',
        text: 'text-purple-400',
        hover: 'hover:border-purple-400'
      },
      green: {
        border: 'border-green-500',
        bg: 'bg-green-500/5',
        text: 'text-green-400',
        hover: 'hover:border-green-400'
      }
    };
    return colors[color] || colors.orange;
  };

  const formatPrice = (price) => {
    return parseInt(price).toLocaleString();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-sm text-gray-400 mb-4">
        Choose the plan that best fits your school's needs. You can upgrade or downgrade at any time.
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const colorClasses = getColorClasses(plan.color);
          const isSelected = value === plan.id;
          
          return (
            <div
              key={plan.id}
              onClick={() => handleSelect(plan.id)}
              className={`relative border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? `${colorClasses.border} ${colorClasses.bg} shadow-lg`
                  : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/30'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <span className={`absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                  plan.popular 
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}>
                  {plan.badge}
                </span>
              )}

              {/* Icon */}
              <div className="text-3xl mb-2">{plan.icon}</div>

              {/* Selection Indicator */}
              <div className={`absolute top-3 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-orange-500' : 'border-gray-600'
              }`}>
                {isSelected && <div className="w-3 h-3 rounded-full bg-orange-500" />}
              </div>
              
              <div className="mt-6">
                <div className="flex items-center gap-2">
                  <div className={`font-bold text-white text-lg ${isSelected ? colorClasses.text : ''}`}>
                    {plan.name}
                  </div>
                  {plan.popular && (
                    <Star size={14} className="text-orange-400 fill-orange-400" />
                  )}
                </div>
                
                <div className="mt-2">
                  <span className={`text-2xl font-bold ${colorClasses.text}`}>
                    KES {formatPrice(plan.price)}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">{plan.period}</span>
                </div>

                {/* Features */}
                <div className="mt-4 space-y-1.5">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="text-orange-400">•</span>
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Toggle */}
      <button
        onClick={() => setShowComparison(!showComparison)}
        className="text-xs text-orange-400 hover:text-orange-300 transition flex items-center gap-1 mx-auto"
      >
        <Info size={14} />
        {showComparison ? 'Hide' : 'Show'} detailed comparison
      </button>

      {/* Detailed Comparison */}
      {showComparison && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-gray-500">Feature</th>
                {plans.map(plan => (
                  <th key={plan.id} className={`text-center py-2 px-3 font-medium ${
                    value === plan.id ? 'text-orange-400' : 'text-gray-400'
                  }`}>
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700/50">
                <td className="py-2 px-3 text-gray-400">Students</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-2 px-3 text-gray-300">
                    {plan.id === 'trial' ? 'Up to 50' : 'Unlimited'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-2 px-3 text-gray-400">AI Remarks</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-2 px-3 text-gray-300">
                    {plan.id === 'trial' ? '10' : plan.id === 'standard' ? '100' : '500'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-2 px-3 text-gray-400">SMS Notifications</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-2 px-3 text-gray-300">
                    {plan.id === 'trial' ? '⚠️ No' : '✅ Yes'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-2 px-3 text-gray-400">Custom Branding</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-2 px-3 text-gray-300">
                    {plan.id === 'premium' ? '✅ Yes' : '—'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-2 px-3 text-gray-400">API Access</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-2 px-3 text-gray-300">
                    {plan.id === 'premium' ? '✅ Yes' : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2 px-3 text-gray-400">Support</td>
                {plans.map(plan => (
                  <td key={plan.id} className="text-center py-2 px-3 text-gray-300">
                    {plan.id === 'premium' ? 'Priority' : 'Standard'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Payment Information */}
      <div className="bg-orange-500/5 border border-orange-500/15 rounded-lg p-4 text-sm text-gray-400">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-orange-400 mb-1">Payment Information</div>
            <div className="text-xs">
              School subscription payments of KES 12,500/term go directly to EduPriva. 
              Parent fee payments use Helix Pay with a 3% service charge (capped at KES 200) 
              which is added to the parent's total — your school always receives the full fee amount.
            </div>
          </div>
        </div>
      </div>

      {/* Money-Back Guarantee */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Crown size={14} className="text-orange-400" />
        <span>30-day money-back guarantee. No questions asked.</span>
      </div>
    </div>
  );
};

export default Step5Plan;
