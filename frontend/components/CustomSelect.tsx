'use client';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

export interface CustomSelectOption {
    value: string;
    label: ReactNode;
    disabled?: boolean;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: CustomSelectOption[];
    placeholder?: ReactNode;
    className?: string;
    menuClassName?: string;
    disabled?: boolean;
}

export default function CustomSelect({
    value,
    onChange,
    options,
    placeholder,
    className = '',
    menuClassName = '',
    disabled = false,
}: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

    return (
        <div ref={rootRef} className={`custom-select ${className}`.trim()}>
            <button
                type="button"
                className={`custom-select-trigger ${open ? 'is-open' : ''}`.trim()}
                onClick={() => !disabled && setOpen((prev) => !prev)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="custom-select-value">{selected?.label ?? placeholder}</span>
                <span className="custom-select-caret">▾</span>
            </button>

            {open && !disabled && (
                <div className={`custom-select-menu ${menuClassName}`.trim()} role="listbox">
                    {options.map((option) => {
                        const active = option.value === value;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                className={`custom-select-option ${active ? 'active' : ''}`.trim()}
                                onClick={() => {
                                    if (option.disabled) return;
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                disabled={option.disabled}
                                role="option"
                                aria-selected={active}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
