import React, { useState } from 'react';
import TargetGroups from './TargetGroups';
import SchoolSearch from './SchoolSearch';
import SelectedSummary from './SelectedSummary';
import BroadcastLogs from './BroadcastLogs';

const LeftPanel = ({ 
  selectedGroup, 
  onSelectGroup, 
  pickedSchools, 
  onToggleSchool,
  groupInfo,
  logs,
  onLoadBroadcast 
}) => {
  const [showIndividual, setShowIndividual] = useState(false);

  React.useEffect(() => {
    setShowIndividual(selectedGroup === 'custom');
  }, [selectedGroup]);

  const getSelectedCount = () => {
    if (selectedGroup === 'custom') return pickedSchools.size;
    return groupInfo[selectedGroup]?.count || 0;
  };

  const getSelectedLabel = () => {
    if (selectedGroup === 'custom') return `Custom — ${pickedSchools.size} selected`;
    return groupInfo[selectedGroup]?.label || 'All Schools';
  };

  const getSelectedIcon = () => {
    if (selectedGroup === 'custom') return '🎯';
    return groupInfo[selectedGroup]?.icon || '🌍';
  };

  return (
    <div className="w-72 bg-dark-card border-r border-dark-border overflow-y-auto flex flex-col">
      <TargetGroups 
        selectedGroup={selectedGroup} 
        onSelectGroup={onSelectGroup} 
        groupInfo={groupInfo} 
      />
      
      <SchoolSearch 
        pickedSchools={pickedSchools} 
        onToggleSchool={onToggleSchool} 
        visible={showIndividual} 
      />
      
      <SelectedSummary 
        count={getSelectedCount()} 
        label={getSelectedLabel()} 
        icon={getSelectedIcon()} 
      />
      
      <BroadcastLogs logs={logs} onLoadBroadcast={onLoadBroadcast} />
    </div>
  );
};

export default LeftPanel;
