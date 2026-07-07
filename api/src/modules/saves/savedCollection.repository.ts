import type { Types } from 'mongoose';

import { DEFAULT_SAVE_COLLECTION_NAME, DEFAULT_SAVE_COVER } from './save.constants.js';
import SavedCollectionModel, { type SavedCollectionDocument } from './savedCollection.model.js';

class SavedCollectionRepository {
  findOwnedById(owner: string | Types.ObjectId, collectionId: string | Types.ObjectId) {
    return SavedCollectionModel.findOne({ _id: collectionId, owner });
  }

  findOwnedByIdLean(owner: string | Types.ObjectId, collectionId: string | Types.ObjectId) {
    return SavedCollectionModel.findOne({ _id: collectionId, owner }).lean();
  }

  findSelected(owner: string | Types.ObjectId) {
    return SavedCollectionModel.findOne({ owner, selected: true });
  }

  findAllByOwner(owner: string | Types.ObjectId) {
    return SavedCollectionModel.find({ owner }).sort({ createdAt: -1 }).lean();
  }

  ensureDefaultCollection(owner: string | Types.ObjectId): Promise<SavedCollectionDocument> {
    return SavedCollectionModel.findOneAndUpdate(
      { owner, isSystemGenerated: true },
      {
        $set: { selected: true },
        $setOnInsert: {
          owner,
          name: DEFAULT_SAVE_COLLECTION_NAME,
          isSystemGenerated: true,
          coverImage: DEFAULT_SAVE_COVER,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).orFail();
  }

  create(owner: string | Types.ObjectId, name: string) {
    return SavedCollectionModel.create({ name, owner, selected: true, isSystemGenerated: false });
  }

  updateName(collectionId: string | Types.ObjectId, name: string) {
    return SavedCollectionModel.findByIdAndUpdate(collectionId, { name }, { new: true, runValidators: true });
  }

  deleteById(collectionId: string | Types.ObjectId) {
    return SavedCollectionModel.findByIdAndDelete(collectionId);
  }

  selectOnly(owner: string | Types.ObjectId, collectionId: string | Types.ObjectId, coverImage?: string) {
    return Promise.all([
      SavedCollectionModel.updateOne(
        { _id: collectionId, owner },
        { selected: true, ...(coverImage ? { coverImage } : {}) },
      ),
      SavedCollectionModel.updateMany({ owner, _id: { $ne: collectionId } }, { selected: false }),
    ]);
  }

  updateCover(owner: string | Types.ObjectId, collectionId: string | Types.ObjectId, coverImage: string) {
    return SavedCollectionModel.updateOne({ _id: collectionId, owner }, { coverImage });
  }

  clearSelected(owner: string | Types.ObjectId) {
    return SavedCollectionModel.updateMany({ owner }, { selected: false });
  }
}

const savedCollectionRepository = new SavedCollectionRepository();

export { SavedCollectionRepository };
export default savedCollectionRepository;