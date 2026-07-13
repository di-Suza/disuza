import { Plus, X, type LucideIcon } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

type PortfolioTagEditorProps = {
  actionNoun?: string;
  countLabel: string;
  countSuffix?: string;
  icon?: LucideIcon;
  isSaving: boolean;
  label: string;
  onCommit: () => void;
  onValueChange: (value: string) => void;
  placeholder: string;
  showSuggestionsBelow: number;
  suggestionLabel: string;
  suggestions: string[];
  value: string;
};

const getTags = (value: string): string[] => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const PortfolioTagEditor = ({
  actionNoun = '',
  countLabel,
  countSuffix = '',
  icon: Icon,
  isSaving,
  label,
  onCommit,
  onValueChange,
  placeholder,
  showSuggestionsBelow,
  suggestionLabel,
  suggestions,
  value,
}: PortfolioTagEditorProps) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tags = useMemo(() => getTags(value), [value]);

  const setTags = (nextTags: string[]) => {
    onValueChange(nextTags.join(', '));
    onCommit();
  };

  const addTag = (tagValue: string) => {
    const nextTag = tagValue.trim();
    if (!nextTag || tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) return;

    setTags([...tags, nextTag]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_tag, tagIndex) => tagIndex !== index));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ',' || event.key === 'Enter') {
      event.preventDefault();
      addTag(inputValue);
      return;
    }

    if (event.key === 'Backspace' && !inputValue && tags.length > 0) {
      event.preventDefault();
      removeTag(tags.length - 1);
    }
  };

  const visibleSuggestions = suggestions
    .filter((suggestion) => !tags.some((tag) => tag.toLowerCase() === suggestion.toLowerCase()));

  return (
    <div className="portfolio-section-v1">
      <div className="portfolio-section-v1__label-row">
        <label htmlFor={`portfolio-${label.toLowerCase()}`}>
          {label}<span>*</span>
        </label>
        <small>{isSaving ? 'saving...' : 'Up to date!'}</small>
      </div>

      <div
        className="portfolio-tag-editor-v1"
        onClick={() => inputRef.current?.focus()}
        role="presentation"
      >
        <div className="portfolio-tag-editor-v1__tags">
          {tags.map((tag, index) => (
            <span className="portfolio-tag-v1" key={`${tag}-${index}`}>
              {tag}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeTag(index);
                }}
                aria-label={`Remove ${tag}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>

        <div className="portfolio-tag-editor-v1__input-row">
          <Plus size={20} aria-hidden="true" />
          <input
            ref={inputRef}
            id={`portfolio-${label.toLowerCase()}`}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : `Add more ${countLabel}...`}
          />
        </div>
      </div>

      <div className="portfolio-tag-editor-v1__meta">
        <p>
          Press <kbd>comma</kbd> or <kbd>enter</kbd> to add{actionNoun}
        </p>
        <p>{tags.length} {tags.length === 1 ? countLabel.replace(/s$/, '') : countLabel}{countSuffix}</p>
      </div>

      {tags.length < showSuggestionsBelow && visibleSuggestions.length > 0 && (
        <div className="portfolio-suggestions-v1">
          <p>{Icon && <Icon size={14} aria-hidden="true" />}{suggestionLabel}</p>
          <div>
            {visibleSuggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => addTag(suggestion)}>
                + {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioTagEditor;
