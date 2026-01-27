import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface TableSearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function TableSearchBar({ onSearch, placeholder = 'Search...', className = '', value, onChange }: TableSearchBarProps & { value?: string, onChange?: (v: string) => void }) {
  const [internalValue, setInternalValue] = useState('');
  const controlled = typeof value === 'string' && typeof onChange === 'function';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (controlled) {
      onChange?.(e.target.value);
    } else {
      setInternalValue(e.target.value);
      onSearch(e.target.value);
    }
  };

  return (
    <div className={`w-full max-w-xs mb-4 ${className}`}>
      <Input
        type="text"
        value={controlled ? value : internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="rounded-lg border border-red-300 focus:border-primary focus:ring-primary px-3 py-2 shadow-sm"
      />
    </div>
  );
}
