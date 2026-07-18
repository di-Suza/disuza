import { Check, FolderOpen, ImageIcon, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import {
  useChangeSavedPostCollectionMutation,
  useCreateCollectionMutation,
  useGetSavedPostsCollectionsQuery,
} from '@/features/posts/api/post.api';
import type { SavedCollection } from '@/features/posts/model/post.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './Saves.css';

type ManageSaveCollectionsModalProps = {
  isOpen: boolean;
  postId: string;
  onClose: () => void;
  onSaved?: () => void;
};

const getSelectedCollectionId = (collections: SavedCollection[]) => (
  collections.find((collection) => collection.selected)?._id || collections[0]?._id || ''
);

const ManageSaveCollectionsModal = ({ isOpen, onClose, onSaved, postId }: ManageSaveCollectionsModalProps) => {
  const { showError, showSuccess } = useToast();
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const { data, isError, isFetching, isLoading, refetch } = useGetSavedPostsCollectionsQuery(undefined, { skip: !isOpen });
  const [createCollection, { isLoading: isCreating }] = useCreateCollectionMutation();
  const [changeSavedPostCollection, { isLoading: isChanging }] = useChangeSavedPostCollectionMutation();

  useLockBodyScroll(isOpen);

  const collections = useMemo(() => data?.collections || [], [data?.collections]);

  useEffect(() => {
    if (!isOpen || collections.length === 0) return;

    const selectedStillExists = collections.some((collection) => collection._id === selectedCollectionId);
    if (!selectedCollectionId || !selectedStillExists) {
      setSelectedCollectionId(getSelectedCollectionId(collections));
    }
  }, [collections, isOpen, selectedCollectionId]);

  if (!isOpen) return null;

  const handleCreateCollection = async (event?: FormEvent) => {
    event?.preventDefault();
    const name = newCollectionName.trim();

    if (!name) {
      showError('Collection name is required');
      return;
    }

    try {
      const result = await createCollection({ name }).unwrap();
      setSelectedCollectionId(result.collection._id);
      setNewCollectionName('');
      setIsAdding(false);
      showSuccess('Collection created');
    } catch (error) {
      showError(getErrorMessage(error, 'Collection not created'));
    }
  };

  const handleSaveToCollection = async () => {
    if (!selectedCollectionId) {
      showError('Select a collection first');
      return;
    }

    try {
      await changeSavedPostCollection({ postId, collectionId: selectedCollectionId }).unwrap();
      onSaved?.();
      showSuccess('Post saved');
      onClose();
    } catch (error) {
      showError(getErrorMessage(error, 'Post not saved'));
    }
  };

  return createPortal(
    <div className="modal-backdrop saves-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="modal-card saves-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header">
          <div>
            <p className="state-panel__eyebrow">Collections</p>
            <h1>Save post</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={onClose} aria-label="Close collections modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        <div className="saves-modal__body">
          {!isAdding ? (
            <Button variant="secondary" className="saves-modal__new" onClick={() => setIsAdding(true)}>
              <Plus size={17} aria-hidden="true" />New collection
            </Button>
          ) : (
            <form className="saves-modal__create" onSubmit={handleCreateCollection}>
              <Input
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                placeholder="Collection name"
                autoFocus
                maxLength={50}
              />
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
                Create
              </Button>
              <Button variant="ghost" className="button--icon" onClick={() => setIsAdding(false)} aria-label="Cancel collection create">
                <X size={17} aria-hidden="true" />
              </Button>
            </form>
          )}

          {isLoading || isFetching ? (
            <LoadingSpinner className="post-empty-state saves-modal__state" label="Loading collections" />
          ) : isError ? (
            <div className="post-empty-state saves-modal__state">
              <FolderOpen size={22} aria-hidden="true" />
              <p>Collections could not be loaded.</p>
              <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : collections.length === 0 ? (
            <div className="post-empty-state saves-modal__state">
              <FolderOpen size={22} aria-hidden="true" />
              <p>No collections yet.</p>
            </div>
          ) : (
            <div className="saves-collection-grid">
              {collections.map((collection) => {
                const isSelected = collection._id === selectedCollectionId;

                return (
                  <button
                    type="button"
                    key={collection._id}
                    className={cn('saves-collection-card', isSelected && 'is-selected')}
                    onClick={() => setSelectedCollectionId(collection._id)}
                    aria-pressed={isSelected}
                  >
                    <span className="saves-collection-card__image">
                      {collection.coverImage ? <img src={collection.coverImage} alt="" /> : <ImageIcon size={24} aria-hidden="true" />}
                    </span>
                    <span className="saves-collection-card__meta">
                      <strong>{collection.name}</strong>
                      <small>{Number(collection.postsCount || 0)} posts</small>
                    </span>
                    {isSelected && <Check size={18} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className="saves-modal__footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveToCollection} disabled={isChanging || !selectedCollectionId}>
            {isChanging ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
            Save
          </Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default ManageSaveCollectionsModal;
