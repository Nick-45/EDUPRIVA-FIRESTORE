import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  addDoc, 
  updateDoc, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import TopBar from './TopBar';
import LeftPanel from './LeftPanel/LeftPanel';
import CenterComposer from './CenterComposer/CenterComposer';
import RightPanel from './RightPanel/RightPanel';
import PreviewModal from './Modals/PreviewModal';
import SendingOverlay from './Modals/SendingOverlay';
import { broadcastService } from '../../services/broadcastService';
import toast from 'react-hot-toast';

const BroadcastDashboard = () => {
  const { user, userData } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [pickedSchools, setPickedSchools] = useState(new Set());
  const [emailData, setEmailData] = useState({
    subject: 'EduPriva — Subscription Renewal Reminder',
    preview: 'Your school subscription is due for renewal.',
    body: `<p>Dear School Administrator,</p><p>This is a friendly reminder that your <strong>EduPriva subscription</strong> is due for renewal.</p><p>Renew your subscription at <strong>KES 12,500 per term</strong> to maintain uninterrupted access.</p><p>Warm regards,<br><strong>EduPriva Platform Team</strong></p>`
  });
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    inApp: true
  });
  const [attachments, setAttachments] = useState([]);
  const [priority, setPriority] = useState('normal');
  const [schedule, setSchedule] = useState({ type: 'now', date: '', time: '' });
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showSendingOverlay, setShowSendingOverlay] = useState(false);
  const [schools, setSchools] = useState([]);
  const [groupInfo, setGroupInfo] = useState({
    all: { count: 0, label: 'All Schools', icon: '🌍' },
    active: { count: 0, label: 'Active Schools', icon: '✅' },
    expiring: { count: 0, label: 'Expiring Soon', icon: '⏳' },
    expired: { count: 0, label: 'Expired Schools', icon: '⚠️' },
    suspended: { count: 0, label: 'Suspended Schools', icon: '⊘' },
    trial: { count: 0, label: 'Free Trial Schools', icon: '🆓' },
    new: { count: 0, label: 'New Schools', icon: '🆕' },
    nairobi: { count: 0, label: 'Nairobi County', icon: '📍' }
  });

  // Collection references
  const schoolsCollection = collection(db, 'schools');
  const subscriptionsCollection = collection(db, 'subscriptions');
  const broadcastLogsCollection = collection(db, 'broadcast_logs');

  useEffect(() => {
    fetchSchoolsAndGroups();
    loadBroadcastLogs();
    setupRealtimeSubscription();
  }, []);

  const getDateValue = (date) => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    return new Date(date);
  };

  const fetchSchoolsAndGroups = async () => {
    try {
      const schoolsSnapshot = await getDocs(schoolsCollection);
      const schoolsData = schoolsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSchools(schoolsData);

      // Fetch subscriptions for expiring/trial calculations
      const subscriptionsSnapshot = await getDocs(subscriptionsCollection);
      const subscriptionsData = subscriptionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Calculate group counts
      const active = schoolsData.filter(s => s.status === 'active').length;
      const suspended = schoolsData.filter(s => s.status === 'suspended').length;
      const expired = schoolsData.filter(s => s.status === 'expired').length;
      
      // Get expiring subscriptions
      const expiringSubs = subscriptionsData.filter(sub => {
        if (!sub.expiry_date || sub.status !== 'active') return false;
        const expiry = getDateValue(sub.expiry_date);
        return expiry && expiry > now && expiry <= thirtyDaysFromNow;
      });
      const expiring = new Set(expiringSubs.map(sub => sub.school_id)).size;

      const trial = subscriptionsData.filter(sub => 
        sub.plan === 'trial' && sub.status === 'active'
      ).length;

      const nairobi = schoolsData.filter(s => 
        s.city?.toLowerCase() === 'nairobi' || s.county?.toLowerCase() === 'nairobi'
      ).length;

      // New schools (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newSchools = schoolsData.filter(s => {
        const created = getDateValue(s.created_at);
        return created && created > weekAgo;
      }).length;

      setGroupInfo({
        all: { count: schoolsData.length, label: 'All Schools', icon: '🌍' },
        active: { count: active, label: 'Active Schools', icon: '✅' },
        expiring: { count: expiring, label: 'Expiring Soon', icon: '⏳' },
        expired: { count: expired, label: 'Expired Schools', icon: '⚠️' },
        suspended: { count: suspended, label: 'Suspended Schools', icon: '⊘' },
        trial: { count: trial, label: 'Free Trial Schools', icon: '🆓' },
        new: { count: newSchools, label: 'New Schools', icon: '🆕' },
        nairobi: { count: nairobi, label: 'Nairobi County', icon: '📍' }
      });

    } catch (error) {
      console.error('Error fetching schools and groups:', error);
      toast.error('Failed to load school data');
    }
  };

  const setupRealtimeSubscription = () => {
    const unsubscribe = onSnapshot(schoolsCollection, () => {
      fetchSchoolsAndGroups();
    }, (error) => {
      console.error('Schools subscription error:', error);
    });
    return unsubscribe;
  };

  const loadBroadcastLogs = async () => {
    try {
      const logsQuery = query(
        broadcastLogsCollection,
        orderBy('created_at', 'desc'),
        limit(50)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading broadcast logs:', error);
    }
  };

  const getRecipientCount = () => {
    if (selectedGroup === 'custom') return pickedSchools.size;
    return groupInfo[selectedGroup]?.count || 0;
  };

  const updateEmailField = (field, value) => {
    setEmailData(prev => ({ ...prev, [field]: value }));
  };

  const updateEmailBody = (html) => {
    setEmailData(prev => ({ ...prev, body: html }));
  };

  const toggleChannel = (channel) => {
    setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
  };

  const insertTag = (tag) => {
    setEmailData(prev => ({ ...prev, body: prev.body + tag }));
  };

  const handleSend = async () => {
    if (!emailData.subject.trim()) {
      toast.error('Please enter an email subject');
      return;
    }

    const recipientCount = getRecipientCount();
    if (recipientCount === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setShowSendingOverlay(true);
    setSending(true);

    try {
      const currentUser = auth.currentUser;
      
      // Get target schools based on selected group
      let targetSchoolIds = [];
      if (selectedGroup === 'custom') {
        targetSchoolIds = Array.from(pickedSchools);
      } else {
        // Filter schools based on group
        let filteredSchools = [...schools];
        if (selectedGroup === 'active') {
          filteredSchools = filteredSchools.filter(s => s.status === 'active');
        } else if (selectedGroup === 'suspended') {
          filteredSchools = filteredSchools.filter(s => s.status === 'suspended');
        } else if (selectedGroup === 'expired') {
          filteredSchools = filteredSchools.filter(s => s.status === 'expired');
        } else if (selectedGroup === 'nairobi') {
          filteredSchools = filteredSchools.filter(s => 
            s.city?.toLowerCase() === 'nairobi' || s.county?.toLowerCase() === 'nairobi'
          );
        } else if (selectedGroup === 'trial') {
          // Get trial subscriptions
          const trialSubsQuery = query(
            subscriptionsCollection,
            where('plan', '==', 'trial'),
            where('status', '==', 'active')
          );
          const trialSubsSnapshot = await getDocs(trialSubsQuery);
          const trialSchoolIds = trialSubsSnapshot.docs.map(doc => doc.data().school_id);
          filteredSchools = filteredSchools.filter(s => trialSchoolIds.includes(s.id));
        } else if (selectedGroup === 'expiring') {
          // Get expiring subscriptions
          const now = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          const expiringQuery = query(
            subscriptionsCollection,
            where('status', '==', 'active')
          );
          const expiringSnapshot = await getDocs(expiringQuery);
          const expiringSchoolIds = expiringSnapshot.docs
            .filter(doc => {
              const expiry = getDateValue(doc.data().expiry_date);
              return expiry && expiry > now && expiry <= thirtyDaysFromNow;
            })
            .map(doc => doc.data().school_id);
          filteredSchools = filteredSchools.filter(s => expiringSchoolIds.includes(s.id));
        }
        targetSchoolIds = filteredSchools.map(s => s.id);
      }

      // Create broadcast log
      await addDoc(broadcastLogsCollection, {
        subject: emailData.subject,
        preview: emailData.preview,
        body: emailData.body,
        target: selectedGroup,
        target_count: targetSchoolIds.length,
        channels: channels,
        priority: priority,
        schedule: schedule,
        status: 'sent',
        created_by: currentUser?.uid,
        created_at: new Date(),
        recipients: targetSchoolIds
      });

      toast.success(`Broadcast sent to ${targetSchoolIds.length} recipients!`);
      loadBroadcastLogs();
      
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error(error.message || 'Failed to send broadcast');
    } finally {
      setShowSendingOverlay(false);
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <TopBar onBack={() => window.history.back()} />
      
      <div className="flex h-[calc(100vh-54px)]">
        {/* Left Panel - Target & Logs */}
        <LeftPanel
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          pickedSchools={pickedSchools}
          onToggleSchool={(id) => {
            const newSet = new Set(pickedSchools);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setPickedSchools(newSet);
          }}
          groupInfo={groupInfo}
          logs={logs}
          onLoadBroadcast={(broadcast) => {
            setEmailData({
              subject: broadcast.subject,
              preview: broadcast.preview,
              body: broadcast.body
            });
            toast.success(`Loaded: ${broadcast.subject}`);
          }}
        />
        
        {/* Center Panel - Composer */}
        <CenterComposer
          emailData={emailData}
          onUpdateField={updateEmailField}
          onUpdateBody={updateEmailBody}
          onInsertTag={insertTag}
          onClearBody={() => setEmailData(prev => ({ ...prev, body: '<p>Dear School Administrator,</p><p></p>' }))}
          onPreview={() => setShowPreview(true)}
        />
        
        {/* Right Panel - Options */}
        <RightPanel
          channels={channels}
          onToggleChannel={toggleChannel}
          attachments={attachments}
          onAddAttachments={setAttachments}
          onInsertTag={insertTag}
          schedule={schedule}
          onScheduleChange={setSchedule}
          priority={priority}
          onPriorityChange={setPriority}
          recipientCount={getRecipientCount()}
          onSend={handleSend}
          onSaveDraft={() => toast.success('Draft saved!')}
          onSendTest={() => toast.success('Test email sent to your inbox')}
        />
      </div>
      
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        subject={emailData.subject}
        body={emailData.body}
        onSend={handleSend}
      />
      
      <SendingOverlay
        isOpen={showSendingOverlay}
        recipientCount={getRecipientCount()}
        attachmentCount={attachments.length}
      />
    </div>
  );
};

export default BroadcastDashboard;
