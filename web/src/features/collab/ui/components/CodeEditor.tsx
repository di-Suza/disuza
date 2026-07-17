import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { Play } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';

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

const getMinimalEdit = (currentCode: string, nextCode: string) => {
  let prefixLength = 0;
  const minLength = Math.min(currentCode.length, nextCode.length);

  while (prefixLength < minLength && currentCode[prefixLength] === nextCode[prefixLength]) {
    prefixLength += 1;
  }

  let currentSuffixIndex = currentCode.length - 1;
  let nextSuffixIndex = nextCode.length - 1;

  while (
    currentSuffixIndex >= prefixLength
    && nextSuffixIndex >= prefixLength
    && currentCode[currentSuffixIndex] === nextCode[nextSuffixIndex]
  ) {
    currentSuffixIndex -= 1;
    nextSuffixIndex -= 1;
  }

  return {
    endOffset: currentSuffixIndex + 1,
    startOffset: prefixLength,
    text: nextCode.slice(prefixLength, nextSuffixIndex + 1),
  };
};

const CodeEditor = ({ code, language, onCodeChange, onLanguageChange, onRun, isRunning }: CodeEditorProps) => {
  const monacoLanguage = languageOptions.find((item) => item.value === language)?.monacoLanguage || 'javascript';
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const isApplyingExternalUpdateRef = useRef(false);

  const handleMount = useCallback<OnMount>((editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;
    monacoRef.current = monacoInstance;
  }, []);

  useEffect(() => {
    const editorInstance = editorRef.current;
    const monacoInstance = monacoRef.current;
    const model = editorInstance?.getModel();

    if (!editorInstance || !monacoInstance || !model) return;

    const currentValue = model.getValue();
    if (currentValue === code) return;

    const { endOffset, startOffset, text } = getMinimalEdit(currentValue, code);
    const selection = editorInstance.getSelection();
    const selectionStartOffset = selection ? model.getOffsetAt(selection.getStartPosition()) : null;
    const selectionEndOffset = selection ? model.getOffsetAt(selection.getEndPosition()) : null;
    const delta = text.length - (endOffset - startOffset);
    const mapOffset = (offset: number) => {
      if (offset <= startOffset) return offset;
      if (offset >= endOffset) return Math.max(0, offset + delta);
      return startOffset + text.length;
    };

    isApplyingExternalUpdateRef.current = true;
    editorInstance.executeEdits('collab-remote-sync', [{
      forceMoveMarkers: true,
      range: new monacoInstance.Range(
        model.getPositionAt(startOffset).lineNumber,
        model.getPositionAt(startOffset).column,
        model.getPositionAt(endOffset).lineNumber,
        model.getPositionAt(endOffset).column,
      ),
      text,
    }]);

    if (selection && selectionStartOffset !== null && selectionEndOffset !== null) {
      const nextStartPosition = model.getPositionAt(mapOffset(selectionStartOffset));
      const nextEndPosition = model.getPositionAt(mapOffset(selectionEndOffset));
      editorInstance.setSelection(new monacoInstance.Selection(
        nextStartPosition.lineNumber,
        nextStartPosition.column,
        nextEndPosition.lineNumber,
        nextEndPosition.column,
      ));
    }

    queueMicrotask(() => {
      isApplyingExternalUpdateRef.current = false;
    });
  }, [code]);

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
          defaultValue={code}
          height="100%"
          language={monacoLanguage}
          onChange={(value) => {
            if (isApplyingExternalUpdateRef.current) return;
            onCodeChange(value || '');
          }}
          onMount={handleMount}
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
