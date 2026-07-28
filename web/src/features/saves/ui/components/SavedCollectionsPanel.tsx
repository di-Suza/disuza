import { Bookmark, Check, FolderOpen, ImageIcon, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { memo, useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  useCreateCollectionMutation,
  useDeleteCollectionMutation,
  useGetSavedCollectionPostsQuery,
  useGetSavedPostsCollectionsQuery,
  useUpdateCollectionMutation,
} from '@/features/posts/api/post.api';
import type { SavedCollection } from '@/features/posts/model/post.types';
import PostList from '@/features/posts/ui/components/PostList';
import Image from '@/shared/components/Image/Image';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import Input from '@/shared/ui/Input';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './Saves.css';

const EMPTY_COLLECTIONS: SavedCollection[] = [];

type SavedCollectionsPanelProps = {
  viewerId?: string;
};

type EditingState = {
  id: string;
  name: string;
} | null;

const getPreferredCollectionId = (collections: SavedCollection[], currentId: string) => {
  if (collections.some((collection) => collection._id === currentId)) return currentId;
  return collections.find((collection) => collection.selected)?._id || collections[0]?._id || '';
};

const SavedCollectionsPanel = ({ viewerId }: SavedCollectionsPanelProps) => {
  const { showError, showSuccess } = useToast();
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollection, setEditingCollection] = useState<EditingState>(null);
  const [collectionPendingDelete, setCollectionPendingDelete] = useState<SavedCollection | null>(null);
  const { data, isError, isFetching, isLoading, refetch } = useGetSavedPostsCollectionsQuery();
  const [createCollection, { isLoading: isCreating }] = useCreateCollectionMutation();
  const [updateCollection, { isLoading: isUpdating }] = useUpdateCollectionMutation();
  const [deleteCollection, { isLoading: isDeleting }] = useDeleteCollectionMutation();

  const collections = data?.collections || EMPTY_COLLECTIONS;
  const selectedCollection = useMemo(
    () => collections.find((collection) => collection._id === selectedCollectionId),
    [collections, selectedCollectionId],
  );
  const {
    data: savedPostsData,
    isError: isPostsError,
    isFetching: isPostsFetching,
    isLoading: isPostsLoading,
    refetch: refetchSavedPosts,
  } = useGetSavedCollectionPostsQuery(
    { collectionId: selectedCollectionId, page: 1, limit: 12 },
    { skip: !selectedCollectionId },
  );

  useEffect(() => {
    if (collections.length === 0) return;
    setSelectedCollectionId((currentId) => getPreferredCollectionId(collections, currentId));
  }, [collections]);

  const handleCreateCollection = async (event: FormEvent) => {
    event.preventDefault();
    const name = newCollectionName.trim();

    if (!name) {
      showError('Collection name is required');
      return;
    }

    try {
      const result = await createCollection({ name }).unwrap();
      setSelectedCollectionId(result.collection._id);
      setNewCollectionName('');
      showSuccess('Collection created');
    } catch (error) {
      showError(getErrorMessage(error, 'Collection not created'));
    }
  };

  const handleUpdateCollection = async () => {
    if (!editingCollection) return;
    const name = editingCollection.name.trim();

    if (!name) {
      showError('Collection name is required');
      return;
    }

    try {
      await updateCollection({ collectionId: editingCollection.id, name }).unwrap();
      setEditingCollection(null);
      showSuccess('Collection updated');
    } catch (error) {
      showError(getErrorMessage(error, 'Collection not updated'));
    }
  };

  const handleDeleteCollection = async (collection: SavedCollection) => {
    if (collection.isSystemGenerated) return;

    try {
      await deleteCollection(collection._id).unwrap();
      setCollectionPendingDelete(null);
      showSuccess('Collection deleted');
    } catch (error) {
      showError(getErrorMessage(error, 'Collection not deleted'));
    }
  };

  return (
    <section className="profile-card profile-card--full saved-panel">
      <header className="profile-card__header saved-panel__header">
        <div>
          <h2>Saved Collections</h2>
          <p>Organize posts you want to revisit.</p>
        </div>
        <Button variant="ghost" className="button--icon" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh saved collections">
          {isFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
        </Button>
      </header>

      <form className="saved-panel__create" onSubmit={handleCreateCollection}>
        <Input
          value={newCollectionName}
          onChange={(event) => setNewCollectionName(event.target.value)}
          placeholder="New collection name"
          maxLength={50}
        />
        <Button type="submit" isLoading={isCreating} loadingLabel="Creating collection">
          <Plus size={17} aria-hidden="true" />
          Create
        </Button>
      </form>

      {isLoading ? (
        <LoadingSpinner className="post-empty-state" label="Loading saved collections" />
      ) : isError ? (
        <div className="post-empty-state">
          <FolderOpen size={24} aria-hidden="true" />
          <p>Saved collections could not be loaded.</p>
        </div>
      ) : (
        <div className="saved-panel__layout">
          <div className="saved-panel__collections" aria-label="Saved collections">
            {collections.map((collection) => {
              const isSelected = collection._id === selectedCollectionId;
              const isEditing = editingCollection?.id === collection._id;

              return (
                <article className={cn('saved-panel__collection', isSelected && 'is-selected')} key={collection._id}>
                  <button type="button" className="saved-panel__collection-main" onClick={() => setSelectedCollectionId(collection._id)}>
                    <span className="saved-panel__collection-cover">
                      {collection.coverImage ? <Image src={collection.coverImage} type="thumbnail" alt="" /> : <ImageIcon size={22} aria-hidden="true" />}
                    </span>
                    <span>
                      <strong>{collection.name}</strong>
                      <small>{Number(collection.postsCount || 0)} posts</small>
                    </span>
                  </button>

                  {isEditing ? (
                    <div className="saved-panel__edit-row">
                      <Input
                        value={editingCollection.name}
                        onChange={(event) => setEditingCollection({ id: collection._id, name: event.target.value })}
                        autoFocus
                        maxLength={50}
                      />
                      <Button className="button--icon" onClick={handleUpdateCollection} isLoading={isUpdating} loadingLabel="Saving collection name" aria-label="Save collection name">
                        <Check size={16} aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" className="button--icon" onClick={() => setEditingCollection(null)} aria-label="Cancel rename">
                        <X size={16} aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    !collection.isSystemGenerated && (
                      <div className="saved-panel__collection-actions">
                        <Button variant="ghost" className="button--icon" onClick={() => setEditingCollection({ id: collection._id, name: collection.name })} aria-label="Rename collection">
                          <Pencil size={15} aria-hidden="true" />
                        </Button>
                        <Button variant="danger" className="button--icon" onClick={() => setCollectionPendingDelete(collection)} disabled={isDeleting} aria-label="Delete collection">
                          <Trash2 size={15} aria-hidden="true" />
                        </Button>
                      </div>
                    )
                  )}
                </article>
              );
            })}
          </div>

          <div className="saved-panel__posts">
            <div className="saved-panel__posts-header">
              <span>
                <Bookmark size={18} aria-hidden="true" />
                <strong>{selectedCollection?.name || 'Saved posts'}</strong>
              </span>
              <Button variant="ghost" className="button--icon" onClick={() => refetchSavedPosts()} disabled={!selectedCollectionId} isLoading={isPostsFetching} loadingLabel="Refreshing saved posts" aria-label="Refresh saved posts">
                <RefreshCw size={17} aria-hidden="true" />
              </Button>
            </div>

            {isPostsLoading ? (
              <LoadingSpinner className="post-empty-state" label="Loading saved posts" />
            ) : isPostsError ? (
              <div className="post-empty-state">
                <FolderOpen size={24} aria-hidden="true" />
                <p>Saved posts could not be loaded.</p>
              </div>
            ) : (
              <PostList
                posts={savedPostsData?.posts || []}
                viewerId={viewerId}
                emptyText="No saved posts in this collection."
                compact
              />
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(collectionPendingDelete)}
        isBusy={isDeleting}
        title="Delete collection?"
        description={`"${collectionPendingDelete?.name || 'This collection'}" will be removed and saved posts inside it will be unsaved.`}
        confirmLabel="Delete"
        onCancel={() => setCollectionPendingDelete(null)}
        onConfirm={() => {
          if (collectionPendingDelete) void handleDeleteCollection(collectionPendingDelete);
        }}
      />
    </section>
  );
};

export default memo(SavedCollectionsPanel);
