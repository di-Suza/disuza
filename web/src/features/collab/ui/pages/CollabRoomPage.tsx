import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as Y from 'yjs';

import { useGetCollabRoomQuery } from '@/features/collab/api/collab.api';
import {
  useRunProblemMutation,
  useUnselectProblemMutation,
  useUpdateProblemLanguageMutation,
} from '@/features/collab/api/problem.api';
import ChatPanel from '@/features/collab/ui/components/ChatPanel';
import CodeEditor from '@/features/collab/ui/components/CodeEditor';
import ProblemStatement from '@/features/collab/ui/components/ProblemStatement';
import ProblemsPanel from '@/features/collab/ui/components/ProblemsPanel';
import ResultsPanel from '@/features/collab/ui/components/ResultsPanel';
import UsersPanel from '@/features/collab/ui/components/UsersPanel';
import useAudioCall from '@/features/collab/ui/hooks/useAudioCall';
import useCollabRoom from '@/features/collab/ui/hooks/useCollabRoom';
import type { CodeExecutionPayload, CodeRunResult, ProblemLanguage, RoomSyncPayload } from '@/features/collab/model/collab.types';
import { useAppSelector } from '@/app/store/hooks';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import FullPageLoader from '@/shared/components/FullPageLoader/FullPageLoader';
import { useToast } from '@/shared/hooks/useToast';
import { getSocket } from '@/shared/services/socket';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './CollabRoomPage.css';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isRoomSyncPayload = (payload: unknown): payload is RoomSyncPayload => (
  typeof payload === 'object'
  && payload !== null
  && typeof (payload as RoomSyncPayload).type === 'string'
  && typeof (payload as RoomSyncPayload).roomId === 'string'
);

const isCodeExecutionPayload = (payload: unknown): payload is CodeExecutionPayload => (
  typeof payload === 'object'
  && payload !== null
  && typeof (payload as CodeExecutionPayload).status === 'string'
  && typeof (payload as CodeExecutionPayload).roomId === 'string'
);

const toNumberArray = (value: unknown) => (
  Array.isArray(value) && value.every((item) => typeof item === 'number')
    ? value
    : null
);

const syncYTextWithCode = (yText: Y.Text, nextCode: string, origin: 'local' | 'remote') => {
  const currentCode = yText.toString();
  if (currentCode === nextCode) return;

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

  const deleteLength = currentSuffixIndex - prefixLength + 1;
  const insertText = nextCode.slice(prefixLength, nextSuffixIndex + 1);

  yText.doc?.transact(() => {
    if (deleteLength > 0) yText.delete(prefixLength, deleteLength);
    if (insertText) yText.insert(prefixLength, insertText);
  }, origin);
};

const CollabRoomPage = () => {
  const [code, setCode] = useState('// Write your code here...');
  const [activeLanguage, setActiveLanguage] = useState<ProblemLanguage>('javascript');
  const [results, setResults] = useState<CodeRunResult | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [problemPanelHeight, setProblemPanelHeight] = useState(280);
  const [resultsPanelHeight, setResultsPanelHeight] = useState(208);
  const [runState, setRunState] = useState<{ isRunning: boolean; roomProblemId: string | null }>({
    isRunning: false,
    roomProblemId: null,
  });
  const roomShellRef = useRef<HTMLDivElement | null>(null);
  const centerPanelRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedCodeRef = useRef('');
  const yDocRef = useRef<Y.Doc | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const pendingYUpdatesRef = useRef<Uint8Array[]>([]);
  const codeRef = useRef('// Write your code here...');
  const { roomId } = useParams();
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const [unselectProblem, { isLoading: isUnselecting }] = useUnselectProblemMutation();
  const [updateProblemLanguage] = useUpdateProblemLanguageMutation();
  const [runProblem] = useRunProblemMutation();
  const { showError } = useToast();
  const {
    data: room,
    error: roomError,
    isError,
    isLoading,
    refetch,
  } = useGetCollabRoomQuery(roomId || '', {
    skip: !roomId,
    refetchOnMountOrArgChange: true,
  });
  const roomDetails = room?.data?.roomDetails || null;
  const problems = room?.data?.problems || [];
  const selectedRoomProblem = roomDetails?.currentlySelectedProblem || null;
  const isSoloRoom = !roomDetails || roomDetails.roomType === 'personal' || roomDetails.realtimeDisabled;
  const usersData = isSoloRoom ? [] : roomDetails.conversationId?.participants || [];
  const { usersWithPresence } = useCollabRoom({ roomId: isSoloRoom ? undefined : roomId, usersData, currentUserId });
  const audioCall = useAudioCall({ roomId: isSoloRoom ? null : roomId, usersData: usersWithPresence, currentUserId });
  const otherUser = isSoloRoom ? null : usersData.find((item) => item._id !== currentUserId)?._id || null;

  const getAvailableSideWidth = (panel: 'left' | 'right') => {
    const shellWidth = roomShellRef.current?.clientWidth || window.innerWidth;
    const centerMinWidth = 320;
    const resizeHandlesWidth = 8;
    const collapsedRailWidth = 48;
    const oppositePanelWidth = panel === 'left'
      ? isSoloRoom || isRightPanelCollapsed ? collapsedRailWidth : rightPanelWidth
      : isLeftPanelCollapsed ? collapsedRailWidth : leftPanelWidth;

    return Math.max(220, shellWidth - oppositePanelWidth - centerMinWidth - resizeHandlesWidth);
  };

  const startHorizontalResize = (panel: 'left' | 'right', event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startLeftWidth = leftPanelWidth;
    const startRightWidth = rightPanelWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      if (panel === 'left') {
        setLeftPanelWidth(clamp(startLeftWidth + deltaX, 220, getAvailableSideWidth('left')));
        return;
      }
      setRightPanelWidth(clamp(startRightWidth - deltaX, 240, getAvailableSideWidth('right')));
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const startVerticalResize = (section: 'problem' | 'results', event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startProblemHeight = problemPanelHeight;
    const startResultsHeight = resultsPanelHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const centerHeight = centerPanelRef.current?.clientHeight || 720;
      const deltaY = moveEvent.clientY - startY;
      const editorMinHeight = 140;
      const resizeHandlesHeight = 12;
      const maxProblemHeight = Math.max(150, centerHeight - resultsPanelHeight - editorMinHeight - resizeHandlesHeight);
      const maxResultsHeight = Math.max(120, centerHeight - problemPanelHeight - editorMinHeight - resizeHandlesHeight);

      if (section === 'problem') {
        setProblemPanelHeight(clamp(startProblemHeight + deltaY, 130, maxProblemHeight));
        return;
      }
      setResultsPanelHeight(clamp(startResultsHeight - deltaY, 110, maxResultsHeight));
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  useEffect(() => {
    const syncResponsivePanels = () => {
      const width = window.innerWidth;
      if (width < 1100) setIsRightPanelCollapsed(true);
      if (width < 900) setIsLeftPanelCollapsed(true);
      setLeftPanelWidth((currentWidth) => clamp(currentWidth, 220, getAvailableSideWidth('left')));
      setRightPanelWidth((currentWidth) => clamp(currentWidth, 240, getAvailableSideWidth('right')));
    };

    syncResponsivePanels();
    window.addEventListener('resize', syncResponsivePanels);
    return () => window.removeEventListener('resize', syncResponsivePanels);
  }, []);

  useEffect(() => {
    if (!selectedRoomProblem?._id) return undefined;
    const initialCode = selectedRoomProblem.currentCode || '';
    const yDoc = new Y.Doc();
    const yText = yDoc.getText('code');
    yDocRef.current = yDoc;
    yTextRef.current = yText;
    pendingYUpdatesRef.current = [];
    codeRef.current = initialCode;
    setCode(initialCode);
    setActiveLanguage(selectedRoomProblem.language || 'javascript');
    setResults(null);
    lastEmittedCodeRef.current = initialCode;
    yDoc.transact(() => {
      yText.insert(0, initialCode);
    }, 'init');

    const handleYTextChange = (event: Y.YTextEvent) => {
      if (event.transaction.origin === 'local') return;
      const nextCode = yText.toString();
      codeRef.current = nextCode;
      setCode((previousCode) => (previousCode === nextCode ? previousCode : nextCode));
    };

    const handleYDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return;
      pendingYUpdatesRef.current.push(update);
    };

    yText.observe(handleYTextChange);
    yDoc.on('update', handleYDocUpdate);

    return () => {
      yText.unobserve(handleYTextChange);
      yDoc.off('update', handleYDocUpdate);
      yDoc.destroy();
      if (yDocRef.current === yDoc) {
        yDocRef.current = null;
        yTextRef.current = null;
      }
      pendingYUpdatesRef.current = [];
    };
  }, [selectedRoomProblem?._id]);

  useEffect(() => {
    if (!selectedRoomProblem?.language) return;
    setActiveLanguage(selectedRoomProblem.language);
  }, [selectedRoomProblem?.language]);

  useEffect(() => {
    const socket = getSocket();
    const handleYjsCodeUpdate = (payload: unknown) => {
      if (
        !isRoomSyncPayload(payload)
        || payload.roomId !== roomId
        || (payload.type !== 'YJS_CODE_UPDATE' && payload.type !== 'CODE_CHANGE')
      ) return;
      const data = payload.data || {};
      if (data.roomProblemId !== selectedRoomProblem?._id) return;

      const yText = yTextRef.current;
      const incomingCode = typeof data.code === 'string' ? data.code : null;
      const update = toNumberArray(data.update);

      if (payload.type === 'YJS_CODE_UPDATE' && update && yDocRef.current) {
        Y.applyUpdate(yDocRef.current, Uint8Array.from(update), 'remote');
        const currentYText = yTextRef.current;
        if (incomingCode !== null && currentYText && currentYText.toString() !== incomingCode) {
          syncYTextWithCode(currentYText, incomingCode, 'remote');
        }
      } else if (incomingCode !== null && yText) {
        syncYTextWithCode(yText, incomingCode, 'remote');
      }

      const nextCode = incomingCode ?? yTextRef.current?.toString() ?? '';
      codeRef.current = nextCode;
      setCode((previousCode) => (previousCode === nextCode ? previousCode : nextCode));
    };

    socket.on('room_sync', handleYjsCodeUpdate);
    return () => {
      socket.off('room_sync', handleYjsCodeUpdate);
    };
  }, [roomId, selectedRoomProblem?._id]);

  useEffect(() => {
    const socket = getSocket();
    const handleCodeExecution = (payload: unknown) => {
      if (!isCodeExecutionPayload(payload) || payload.roomId !== roomId) return;

      if (payload.status === 'running') {
        setRunState({ isRunning: true, roomProblemId: payload.roomProblemId });
        return;
      }

      if (payload.status === 'completed') {
        setRunState({ isRunning: false, roomProblemId: null });
        if (payload.roomProblemId === selectedRoomProblem?._id && payload.result) setResults(payload.result);
        return;
      }

      if (payload.status === 'failed') {
        setRunState({ isRunning: false, roomProblemId: null });
        showError(payload.error || 'Code execution failed.');
      }
    };

    socket.on('code_execution', handleCodeExecution);
    return () => {
      socket.off('code_execution', handleCodeExecution);
    };
  }, [roomId, selectedRoomProblem?._id, showError]);

  const emitYjsCodeChange = () => {
    if (!roomId || !selectedRoomProblem?._id) return;
    const codeToEmit = codeRef.current;
    if (lastEmittedCodeRef.current === codeToEmit) return;
    if (pendingYUpdatesRef.current.length === 0) return;

    lastEmittedCodeRef.current = codeToEmit;
    const mergedUpdate = Y.mergeUpdates(pendingYUpdatesRef.current);
    pendingYUpdatesRef.current = [];
    getSocket().emit('yjs_code_update', {
      roomId,
      roomProblemId: selectedRoomProblem._id,
      update: Array.from(mergedUpdate),
      code: codeToEmit,
      language: activeLanguage,
    });
  };

  const handleCodeChange = (newCode: string) => {
    if (newCode === codeRef.current) return;
    codeRef.current = newCode;
    setCode(newCode);
    const yText = yTextRef.current;
    if (!yText) return;

    syncYTextWithCode(yText, newCode, 'local');
    emitYjsCodeChange();
  };

  const handleLanguageChange = async (language: ProblemLanguage) => {
    if (!roomId || !selectedRoomProblem?._id) return;

    const previousLanguage = activeLanguage;
    setActiveLanguage(language);

    try {
      await updateProblemLanguage({ roomId, roomProblemId: selectedRoomProblem._id, language }).unwrap();
    } catch (error) {
      setActiveLanguage(previousLanguage);
      showError(getErrorMessage(error, 'Language could not be updated. Please try again.'));
    }
  };

  const handleRunCode = async () => {
    if (!roomId || !selectedRoomProblem?._id || runState.isRunning) return;

    try {
      setRunState({ isRunning: true, roomProblemId: selectedRoomProblem._id });
      const response = await runProblem({
        roomId,
        roomProblemId: selectedRoomProblem._id,
        code,
        language: activeLanguage,
      }).unwrap();
      setResults(response.data.result || null);
      setRunState({ isRunning: false, roomProblemId: null });
    } catch (error) {
      setRunState({ isRunning: false, roomProblemId: null });
      showError(getErrorMessage(error, 'Code execution failed.'));
    }
  };

  const handleUnselectProblem = async () => {
    if (!roomId || isUnselecting) return;

    try {
      await unselectProblem({ roomId }).unwrap();
    } catch (error) {
      showError(getErrorMessage(error, 'Problem could not be unselected. Please try again.'));
    }
  };

  if (isError) {
    return (
      <main className="collab-error-page">
        <section>
          <h1>Collaboration room could not be loaded</h1>
          <p>{getErrorMessage(roomError, 'Maybe this room does not exist or you do not have access.')}</p>
          <button type="button" onClick={() => refetch()}>Retry</button>
        </section>
      </main>
    );
  }

  if (isLoading) return <FullPageLoader label="Opening collaboration room" />;

  return (
    <main className="collab-room-page">
      <div ref={roomShellRef} className="collab-room-shell">
        {isLeftPanelCollapsed ? (
          <div className="collab-collapse-rail is-left">
            <button type="button" className="collab-icon-button" onClick={() => setIsLeftPanelCollapsed(false)} aria-label="Open problems panel">
              <PanelLeftOpen size={18} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <div className="collab-left-panel" style={{ width: clamp(leftPanelWidth, 220, getAvailableSideWidth('left')) }}>
              <ErrorBoundary variant="section" title="Problems panel could not be rendered." resetKeys={[roomId, selectedRoomProblem?._id]} showReload={false}>
                <ProblemsPanel problems={problems} selectedProblem={selectedRoomProblem} roomId={roomId} onCollapse={() => setIsLeftPanelCollapsed(true)} />
              </ErrorBoundary>
            </div>
            <div role="separator" aria-orientation="vertical" className="collab-resize-handle is-vertical" onPointerDown={(event) => startHorizontalResize('left', event)} />
          </>
        )}

        <div ref={centerPanelRef} className="collab-center-panel">
          {selectedRoomProblem ? (
            <>
              <section className="collab-statement-region" style={{ height: problemPanelHeight }}>
                <header className="collab-active-problem-header">
                  <div>
                    <p>Active Problem</p>
                  </div>
                  <button type="button" onClick={handleUnselectProblem} disabled={isUnselecting}>
                    {isUnselecting ? 'Unselecting...' : 'Unselect Problem'}
                  </button>
                </header>
                <ErrorBoundary variant="section" title="Problem details could not be rendered." resetKeys={[selectedRoomProblem._id]} showReload={false}>
                  <ProblemStatement problem={selectedRoomProblem} />
                </ErrorBoundary>
              </section>
              <div role="separator" aria-orientation="horizontal" className="collab-resize-handle is-horizontal" onPointerDown={(event) => startVerticalResize('problem', event)} />
              <section className="collab-editor-region">
                <ErrorBoundary variant="section" title="Code editor could not be rendered." resetKeys={[selectedRoomProblem._id]} showReload={false}>
                  <CodeEditor
                    code={code}
                    language={activeLanguage}
                    onCodeChange={handleCodeChange}
                    onLanguageChange={handleLanguageChange}
                    onRun={handleRunCode}
                    isRunning={runState.isRunning}
                  />
                </ErrorBoundary>
              </section>
              <div role="separator" aria-orientation="horizontal" className="collab-resize-handle is-horizontal" onPointerDown={(event) => startVerticalResize('results', event)} />
              <section className="collab-results-region" style={{ height: resultsPanelHeight }}>
                <ErrorBoundary variant="section" title="Run results could not be rendered." resetKeys={[selectedRoomProblem._id, results?.status]} showReload={false}>
                  <ResultsPanel results={results} isRunning={runState.isRunning} />
                </ErrorBoundary>
              </section>
            </>
          ) : (
            <div className="collab-empty-editor">
              <section>
                <p>Select any problem you want to solve</p>
                <span>Add or choose a problem from the left panel to open the editor.</span>
              </section>
            </div>
          )}
        </div>

        {!isSoloRoom && isRightPanelCollapsed ? (
          <div className="collab-collapse-rail is-right">
            <button type="button" className="collab-icon-button" onClick={() => setIsRightPanelCollapsed(false)} aria-label="Open chat panel">
              <PanelRightOpen size={18} aria-hidden="true" />
            </button>
          </div>
        ) : !isSoloRoom ? (
          <>
            <div role="separator" aria-orientation="vertical" className="collab-resize-handle is-vertical" onPointerDown={(event) => startHorizontalResize('right', event)} />
            <aside className="collab-right-panel" style={{ width: clamp(rightPanelWidth, 220, getAvailableSideWidth('right')) }}>
              <ErrorBoundary variant="section" title="Participants panel could not be rendered." resetKeys={[roomId]} showReload={false}>
                <UsersPanel usersData={audioCall.usersWithVoice} onCollapse={() => setIsRightPanelCollapsed(true)} {...audioCall} />
              </ErrorBoundary>
              <div className="collab-chat-region">
                <ErrorBoundary variant="section" title="Room chat could not be rendered." resetKeys={[roomDetails?.conversationId?._id, roomId]} showReload={false}>
                  <ChatPanel conversationId={roomDetails?.conversationId?._id || null} otherUser={otherUser} roomId={roomId} />
                </ErrorBoundary>
              </div>
            </aside>
          </>
        ) : null}
      </div>
    </main>
  );
};

export default CollabRoomPage;
