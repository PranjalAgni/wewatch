"use client";
import { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Button } from './ui/button';

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export default function EmojiPickerComponent({ 
  onEmojiSelect, 
  disabled = false 
}: EmojiPickerComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Handle emoji selection
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close picker on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Emoji trigger button */}
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="p-2 h-auto text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Open emoji picker"
      >
        <svg 
          className="w-5 h-5" 
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
          <circle cx="8.5" cy="10.5" r="1.5"/>
          <circle cx="15.5" cy="10.5" r="1.5"/>
          <path d="M12 18c2.28 0 4.22-1.66 4.71-4H16.5c-.41 1.25-1.57 2-2.5 2s-2.09-.75-2.5-2H7.29c.49 2.34 2.43 4 4.71 4z"/>
        </svg>
      </Button>

      {/* Emoji picker popover */}
      {isOpen && (
        <div 
          ref={pickerRef}
          className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl rounded-lg overflow-hidden border border-gray-600"
          style={{
            // Position above the button, align to right edge
            transform: 'translateX(0)',
          }}
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={Theme.DARK}
            width={320}
            height={400}
            searchPlaceHolder="Search emojis..."
            previewConfig={{
              showPreview: false
            }}
            skinTonesDisabled={false}
            autoFocusSearch={true}
            lazyLoadEmojis={true}
            style={{
              '--epr-bg-color': '#374151',
              '--epr-category-label-bg-color': '#4B5563',
              '--epr-emoji-hover-color': '#6B7280',
              '--epr-emoji-variation-picker-bg-color': '#4B5563',
              '--epr-search-input-bg-color': '#1F2937',
              '--epr-text-color': '#F3F4F6',
              '--epr-search-border-color': '#6B7280',
            } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  );
}
