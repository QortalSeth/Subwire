import localforage from 'localforage';

// Configure localforage for draft storage
const draftDB = localforage.createInstance({
  name: 'Beacon-App',
  storeName: 'drafts',
  description: 'Stores article drafts with auto-save',
});

export interface ArticleDraft {
  id: string; // unique draft identifier
  userName: string; // The Qortal name of the author
  type: 'essay' | 'episode';
  title: string;
  subtitle: string;
  content: string;
  coverImagePreview?: string; // Data URL for preview display
  coverImageData?: string; // Base64 encoded cover image (without data URL prefix)
  coverImageFilename?: string; // Original filename
  coverImageMimeType?: string; // MIME type for reconstruction
  uploadedImages?: Record<
    string,
    {
      // Content images as base64
      data: string; // Base64 encoded image data
      filename: string;
      mimeType: string;
    }
  >;
  // Note: Video/audio files are NOT saved in drafts - user must re-select them
  createdAt: number;
  updatedAt: number;
  isEdit?: boolean; // true if editing an existing article
  originalIdentifier?: string; // identifier of the article being edited
}

/**
 * Gets the storage key for a specific user's drafts
 */
export function getDraftsStorageKey(userName: string): string {
  return `drafts_${userName}`;
}

/**
 * Load all drafts for a specific user
 */
export async function loadDrafts(userName: string): Promise<ArticleDraft[]> {
  try {
    const key = getDraftsStorageKey(userName);
    const drafts = await draftDB.getItem<ArticleDraft[]>(key);
    return drafts || [];
  } catch (error) {
    console.error('Error loading drafts:', error);
    return [];
  }
}

/**
 * Save a draft for a specific user
 */
export async function saveDraft(
  userName: string,
  draft: Omit<ArticleDraft, 'updatedAt'>
): Promise<void> {
  try {
    const drafts = await loadDrafts(userName);
    const existingIndex = drafts.findIndex((d) => d.id === draft.id);

    const updatedDraft: ArticleDraft = {
      ...draft,
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = updatedDraft;
    } else {
      drafts.push(updatedDraft);
    }

    const key = getDraftsStorageKey(userName);
    await draftDB.setItem(key, drafts);
  } catch (error) {
    console.error('Error saving draft:', error);
    throw error;
  }
}

/**
 * Delete a specific draft
 */
export async function deleteDraft(
  userName: string,
  draftId: string
): Promise<void> {
  try {
    const drafts = await loadDrafts(userName);
    const filteredDrafts = drafts.filter((d) => d.id !== draftId);

    const key = getDraftsStorageKey(userName);
    await draftDB.setItem(key, filteredDrafts);
  } catch (error) {
    console.error('Error deleting draft:', error);
    throw error;
  }
}

/**
 * Get a specific draft by ID
 */
export async function getDraft(
  userName: string,
  draftId: string
): Promise<ArticleDraft | null> {
  try {
    const drafts = await loadDrafts(userName);
    return drafts.find((d) => d.id === draftId) || null;
  } catch (error) {
    console.error('Error getting draft:', error);
    return null;
  }
}

/**
 * Clear all drafts for a user
 */
export async function clearAllDrafts(userName: string): Promise<void> {
  try {
    const key = getDraftsStorageKey(userName);
    await draftDB.removeItem(key);
  } catch (error) {
    console.error('Error clearing drafts:', error);
    throw error;
  }
}

/**
 * Generate a unique draft ID
 */
export function generateDraftId(
  type: 'essay' | 'episode',
  isEdit: boolean = false,
  identifier?: string
): string {
  if (isEdit && identifier) {
    return `edit_${identifier}`;
  }
  return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
