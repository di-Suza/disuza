import Editor from '@monaco-editor/react';
import { Play } from 'lucide-react';

import type { ProblemLanguage } from '@/features/collab/model/collab.types';

type CodeEditorProps = {
  code: string;
  language: ProblemLanguage;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: ProblemLanguage) => void;
  onRun: () => void;
  isRunning: boolean;
};

const languageOptions: Array<{ label: string; value: ProblemLanguage; monacoLanguage: string }> = [
  { label: 'JavaScript', value: 'javascript', monacoLanguage: 'javascript' },
  { label: 'Python', value: 'python', monacoLanguage: 'python' },
  { label: 'C++', value: 'cpp', monacoLanguage: 'cpp' },
];

const CodeEditor = ({ code, language, onCodeChange, onLanguageChange, onRun, isRunning }: CodeEditorProps) => {
  const monacoLanguage = languageOptions.find((item) => item.value === language)?.monacoLanguage || 'javascript';

  return (
    <section className="collab-code-editor">
      <header>
        <div>
          <span>Code Editor</span>
          <select value={language} onChange={(event) => onLanguageChange(event.target.value as ProblemLanguage)}>
            {languageOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <button type="button" onClick={onRun} disabled={isRunning}>
          <Play size={16} aria-hidden="true" />
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
      </header>

      <div className="collab-code-editor__monaco">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          onChange={(value) => onCodeChange(value || '')}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            fontFamily: "'Fira Code', 'Courier New', monospace",
          }}
        />
      </div>
    </section>
  );
};

export default CodeEditor;
