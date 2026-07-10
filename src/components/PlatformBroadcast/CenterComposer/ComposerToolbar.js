import React, { useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, AlignLeft, Eye, Trash2 } from 'lucide-react';

const ComposerToolbar = ({ onInsertTag, onClearBody, onPreview }) => {
  const [formatBlock, setFormatBlock] = useState('p');

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  };

  const formatBlocks = [
    { value: 'p', label: 'Paragraph' },
    { value: 'h2', label: 'Heading' },
    { value: 'h3', label: 'Subheading' }
  ];

  return (
    <div className="bg-dark-card border-b border-dark-border p-2 flex items-center gap-1 flex-wrap sticky top-0 z-10">
      <select
        value={formatBlock}
        onChange={(e) => {
          setFormatBlock(e.target.value);
          applyFormat('formatBlock', e.target.value);
        }}
        className="px-2 py-1 bg-dark-hover border border-dark-border rounded-md text-white text-xs"
      >
        {formatBlocks.map(block => (
          <option key={block.value} value={block.value}>{block.label}</option>
        ))}
      </select>
      
      <div className="w-px h-5 bg-dark-border mx-1" />
      
      <button onClick={() => applyFormat('bold')} className="w-7 h-7 rounded hover:bg-dark-hover text-gray-400 hover:text-white flex items-center justify-center">
        <Bold size={14} />
      </button>
      <button onClick={() => applyFormat('italic')} className="w-7 h-7 rounded hover:bg-dark-hover text-gray-400 hover:text-white flex items-center justify-center">
        <Italic size={14} />
      </button>
      <button onClick={() => applyFormat('underline')} className="w-7 h-7 rounded hover:bg-dark-hover text-gray-400 hover:text-white flex items-center justify-center">
        <Underline size={14} />
      </button>
      
      <div className="w-px h-5 bg-dark-border mx-1" />
      
      <button onClick={() => applyFormat('insertUnorderedList')} className="w-7 h-7 rounded hover:bg-dark-hover text-gray-400 hover:text-white flex items-center justify-center">
        <List size={14} />
      </button>
      <button onClick={() => applyFormat('insertOrderedList')} className="w-7 h-7 rounded hover:bg-dark-hover text-gray-400 hover:text-white flex items-center justify-center">
        <ListOrdered size={14} />
      </button>
      <button onClick={() => applyFormat('justifyLeft')} className="w-7 h-7 rounded hover:bg-dark-hover text-gray-400 hover:text-white flex items-center justify-center">
        <AlignLeft size={14} />
      </button>
      
      <div className="w-px h-5 bg-dark-border mx-1" />
      
      <button onClick={insertLink} className="w-7 h-7 rounded hover:bg-dark-hover text-gray-400 hover:text-white flex items-center justify-center">
        <LinkIcon size={14} />
      </button>
      
      <div className="flex-1" />
      
      <button onClick={onPreview} className="px-3 py-1 bg-transparent border border-dark-border rounded-md text-gray-400 text-xs hover:text-white hover:border-gray-600 transition">
        <div className="flex items-center gap-1">
          <Eye size={12} />
          Preview
        </div>
      </button>
      
      <button onClick={onClearBody} className="px-3 py-1 bg-transparent border border-dark-border rounded-md text-gray-400 text-xs hover:text-red-400 hover:border-red-500/30 transition">
        <div className="flex items-center gap-1">
          <Trash2 size={12} />
          Clear
        </div>
      </button>
    </div>
  );
};

export default ComposerToolbar;
