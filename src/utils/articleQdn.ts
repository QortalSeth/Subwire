import { objectToBase64, EnumCollisionStrength } from 'qapp-core';
import Compressor from 'compressorjs';
import {
  LIST_ARTICLES_FEED,
  QTUBE_VIDEO_BASE,
  SERVICE_DOCUMENT,
  SERVICE_VIDEO,
  SERVICE_AUDIO,
  SERVICE_FILE,
} from '../constants/qdn';
import ShortUniqueId from 'short-unique-id';

declare const qortalRequest: (params: any) => Promise<any>;

// Initialize ShortUniqueId instances
const uid = new ShortUniqueId({ length: 8 }); // For video IDs
const shortuid = new ShortUniqueId({ length: 5 }); // For video codes

/**
 * Convert Uint8Array to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte)
  ).join('');
  return btoa(binString);
}

/**
 * Create encryption parameters (key and IV) for video/audio encryption
 */
function createEncryptionParams() {
  // 32-byte AES-256 key
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  // 16-byte IV (CTR initial counter)
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);
  return { key, iv };
}

// Article entity identifiers
export const ENTITY_ROOT = 'SUBWIRE_ROOT';
export const ENTITY_ARTICLE = 'SUBWIRE_ARTICLE';
export const ENTITY_EPISODE = 'SUBWIRE_EPISODE';
export const ENTITY_AUDIO = 'ARTICLE_AUDIO';

// Group encrypted content identifiers
export const GROUP_PRIVATE_ARTICLE = 'GROUP_PRIVATE_ARTICLE';
export const GROUP_PRIVATE_EPISODE = 'GROUP_PRIVATE_EPISODE';
export const GROUP_VIDEO_PRIVATE = 'GROUP_VIDEO_PRIVATE';
export const GROUP_AUDIO_PRIVATE = 'GROUP_AUDIO_PRIVATE';

/**
 * Convert a File or Blob to base64 string
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Compress an image file before converting to base64
 */
export async function compressImage(
  image: File,
  quality: number = 0.75,
  maxWidth: number = 1920
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    new Compressor(image, {
      quality,
      maxWidth,
      mimeType: 'image/webp',
      success(result) {
        resolve(result);
      },
      error(err) {
        console.error('Compression error:', err);
        reject(err);
      },
    });
  }).catch((error) => {
    console.warn('Compression failed, using original image:', error);
    return image;
  });
}

/**
 * Extract image references from markdown content
 */
export function extractImageReferences(content: string): string[] {
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  const matches = [];
  let match;
  while ((match = imageRegex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

/**
 * Process images from markdown content
 * Extracts images, compresses them, and replaces blob URLs with permanent references
 */
export async function processArticleImages(
  content: string,
  uploadedImages: Map<string, string>,
  existingImages?: ArticleImage[]
): Promise<{ content: string; images: ArticleImage[] }> {
  const images: ArticleImage[] = [];
  const imageReferences = extractImageReferences(content);
  let processedContent = content;

  // First, identify which existing images are still referenced in the content
  const referencedExistingIndices = new Set<number>();

  if (existingImages && existingImages.length > 0) {
    imageReferences.forEach((ref) => {
      if (ref.startsWith('subwire-image://')) {
        const index = parseInt(ref.replace('subwire-image://', ''), 10);
        if (!isNaN(index) && index < existingImages.length) {
          referencedExistingIndices.add(index);
        }
      }
    });

    // Only preserve images that are still referenced in the content
    // and re-index them sequentially
    const oldToNewIndexMap = new Map<number, number>();

    Array.from(referencedExistingIndices)
      .sort((a, b) => a - b)
      .forEach((oldIndex) => {
        oldToNewIndexMap.set(oldIndex, images.length);
        images.push(existingImages[oldIndex]);
      });

    // Update subwire-image:// references with new indices
    oldToNewIndexMap.forEach((newIndex, oldIndex) => {
      processedContent = processedContent.replace(
        new RegExp(`subwire-image://${oldIndex}`, 'g'),
        `subwire-image://${newIndex}`
      );
    });
  }

  // Process new images (blob URLs)
  for (const imageRef of imageReferences) {
    // Skip existing subwire-image:// references - already handled above
    if (imageRef.startsWith('subwire-image://')) {
      continue;
    }

    // Skip existing data URLs - they shouldn't be reprocessed
    if (imageRef.startsWith('data:image/')) {
      continue;
    }

    // Check if this is a local blob URL (new image)
    if (imageRef.startsWith('blob:')) {
      // Find the image name from the uploaded images map
      const imageName = Array.from(uploadedImages.entries()).find(
        ([_, url]) => url === imageRef
      )?.[0];

      if (imageName) {
        // Fetch the blob and convert to base64
        const response = await fetch(imageRef);
        const blob = await response.blob();
        const file = new File([blob], imageName, { type: blob.type });

        // Compress and convert to base64
        const compressedImage = await compressImage(file);
        const base64 = await fileToBase64(compressedImage);

        // Store the image
        images.push({
          name: imageName,
          src: base64,
        });

        // Replace blob URL with permanent reference using image index
        // This allows us to reconstruct the image URLs when rendering
        processedContent = processedContent.replace(
          imageRef,
          `subwire-image://${images.length - 1}`
        );
      }
    }
  }

  return { content: processedContent, images };
}

/**
 * Restore images for rendering
 * Converts subwire-image:// references back to data URLs
 */
export function restoreImagesForDisplay(
  content: string,
  images: ArticleImage[]
): string {
  let restoredContent = content;

  images.forEach((image, index) => {
    // Create data URL from base64
    const dataUrl = `data:image/webp;base64,${image.src}`;

    // Replace subwire-image reference with actual data URL
    restoredContent = restoredContent.replace(
      `subwire-image://${index}`,
      dataUrl
    );
  });

  return restoredContent;
}

export interface ArticleImage {
  name: string;
  src: string; // Base64 encoded image
}

/**
 * Video metadata for video/audio episodes
 */
export interface VideoMetadata {
  title: string;
  description: string;
  duration?: number;
  videoImage?: string; // Compressed base64 image
  extracts?: string[]; // 4 compressed base64 images
  category: number; // Required
  subcategory?: number;
}

/**
 * Video metadata document stored on the blockchain
 */
export interface VideoMetadataDocument {
  title: string;
  version: number;
  fullDescription: string;
  htmlDescription: string;
  videoImage?: string; // base64 encoded thumbnail
  videoReference: {
    name: string;
    identifier: string;
    service: string;
  };
  extracts?: string[]; // Additional thumbnails/previews as base64
  commentsId?: string;
  category: number; // Required
  subcategory?: number;
  code?: string;
  videoType: string;
  filename: string;
  fileSize: number;
  duration: number;
}

/**
 * Audio metadata document stored on the blockchain
 */
export interface AudioMetadataDocument {
  title: string;
  version: number;
  description: string;
  audioReference: {
    name: string;
    identifier: string;
    service: string;
  };
  mimeType: string;
  filename: string;
  fileSize: number;
  duration?: number;
}

/**
 * Media attachment for episodes (video or audio)
 */
export interface MediaAttachment {
  type: 'video' | 'audio';
  file: File;
  preview?: string;
  videoMetadata?: VideoMetadata;
  // For existing media when editing (not new uploads)
  existingMedia?: ArticleMedia;
  // When true and existingMedia is set (encrypted only), publish new file/metadata to same identifier (update in place)
  replaceWithNewFile?: boolean;
}

/**
 * Media reference in an article/episode (video or audio)
 */
export interface ArticleMedia {
  identifier: string; // Reference to the media metadata document
  name: string;
  service: string;
  mimeType?: string; // MIME type of the media (e.g., 'video/mp4', 'audio/mpeg')
  key?: string; // Encryption key (base64) for encrypted media
  iv?: string; // Encryption IV (base64) for encrypted media
}

export interface Article {
  title: string;
  subtitle?: string;
  content: string; // Markdown content with subwire-image:// references
  coverImage: ArticleImage; // Required cover image for all article types
  images?: ArticleImage[]; // Additional Base64 images array from content
  media?: ArticleMedia[]; // Video/audio references for episodes
  timestamp: number;
  name: string;
  type: 'essay' | 'episode';
  published?: boolean;
  groupId?: number; // Optional group ID for encrypted articles
  encryptedContent?: string; // Encrypted article data for private group articles
}

export interface PublishArticleParams {
  title: string;
  subtitle?: string;
  content: string;
  coverImage?: File | null; // Optional when editing (existingCoverImage will be used)
  media?: MediaAttachment[]; // Video/audio attachments for episodes
  identifierOperations: any;
  userName: string;
  uploadedImages: Map<string, string>;
  type?: 'essay' | 'episode';
  publishMultipleResources: (resources: any[]) => Promise<any>;
  addNewResources: any;
  updateNewResources: (resources: any[]) => void;
  existingIdentifier?: string; // For updates
  existingImages?: ArticleImage[]; // Existing images when editing
  existingCoverImage?: string; // Existing cover image base64 when editing
  existingTimestamp?: number; // Original creation timestamp when editing
  existingMedia?: ArticleMedia[]; // Existing media when editing
  groupId?: number; // Optional group ID for encrypted articles
  encryptMetadata?: boolean; // If true, encrypt title/subtitle/coverImage (default: false - keep them public)
  decryptedContent?: {
    content: string;
    images?: ArticleImage[];
    media?: ArticleMedia[];
  }; // Decrypted content for encrypted article updates
}

/**
 * Strip HTML tags from a string to get plain text
 */
function stripHtmlTags(html: string): string {
  if (!html) return '';
  // Create a temporary div element to leverage browser's HTML parsing
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

/**
 * Truncate text to a maximum byte length
 */
function truncateByBytes(text: string, maxBytes: number): string {
  if (!text || !text.trim()) return '';

  const trimmed = text.trim();

  // Limit to maxBytes (not characters)
  const encoder = new TextEncoder();
  let byteLength = 0;
  let charIndex = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const charBytes = encoder.encode(char).length;

    if (byteLength + charBytes > maxBytes) {
      break;
    }

    byteLength += charBytes;
    charIndex = i + 1;
  }

  return trimmed.slice(0, charIndex);
}

/**
 * Publish an article to the Qortal blockchain
 *
 * This function follows the same pattern as publishPost from the example app:
 * 1. Process images and convert to base64
 * 2. Generate unique identifier (or use existing for updates)
 * 3. Create article metadata
 * 4. Publish using publishMultipleResources
 * 5. For episodes: Process video/audio files and create metadata documents
 */
export async function publishArticle({
  title,
  subtitle,
  content,
  coverImage,
  media,
  identifierOperations,
  userName,
  uploadedImages,
  type = 'essay',
  publishMultipleResources,
  addNewResources,
  updateNewResources,
  existingIdentifier,
  existingImages,
  existingCoverImage,
  existingTimestamp,
  existingMedia,
  groupId,
  encryptMetadata = false, // Default: keep title/subtitle/coverImage public for discovery
  decryptedContent,
}: PublishArticleParams): Promise<string> {
  try {
    console.log('existingMedia', existingMedia, media);
    if (!userName) {
      throw new Error('A Qortal name is required to publish');
    }

    if (!title.trim()) {
      throw new Error('Article title is required');
    }

    if (!content.trim()) {
      throw new Error('Article content is required');
    }

    if (!coverImage && !existingCoverImage) {
      throw new Error('Cover image is required');
    }

    // Process cover image - only compress if it's a new image file
    let coverImageData: ArticleImage;

    if (coverImage && coverImage.size > 0) {
      // New cover image uploaded
      const compressedCover = await compressImage(coverImage, 0.8, 1920);
      const coverBase64 = await fileToBase64(compressedCover);
      coverImageData = {
        name: coverImage.name,
        src: coverBase64,
      };
    } else if (existingCoverImage) {
      // Use existing cover image (already base64)
      coverImageData = {
        name: 'cover.webp',
        src: existingCoverImage,
      };
    } else {
      throw new Error('Cover image is required');
    }

    // Process images from content (extract, compress, and replace URLs)
    // Pass existingImages to preserve them
    const { content: processedContent, images } = await processArticleImages(
      content,
      uploadedImages,
      existingImages
    );

    // Generate unique identifier for the article or use existing for updates
    let articleIdentifier: string;

    if (existingIdentifier) {
      // Use existing identifier for updates
      articleIdentifier = existingIdentifier;
    } else {
      // Generate new identifier for new articles
      // For encrypted articles (with groupId), use appropriate GROUP_PRIVATE constant as parent
      if (groupId) {
        const groupEntity =
          type === 'episode' ? GROUP_PRIVATE_EPISODE : GROUP_PRIVATE_ARTICLE;
        const generatedIdentifier = await identifierOperations.buildIdentifier(
          groupId.toString(),
          groupEntity,
          false,
          groupEntity
        );

        if (!generatedIdentifier) {
          throw new Error('Failed to create article identifier');
        }

        articleIdentifier = generatedIdentifier;
      } else {
        // Public article
        const entityType = type === 'episode' ? ENTITY_EPISODE : ENTITY_ARTICLE;

        const generatedIdentifier = await identifierOperations.buildIdentifier(
          entityType,
          ENTITY_ROOT,
          false
        );

        if (!generatedIdentifier) {
          throw new Error('Failed to create article identifier');
        }

        articleIdentifier = generatedIdentifier;
      }
    }

    // Process video/audio attachments for episodes (same pattern as example app)
    const resources: any[] = [];
    const mediaItems: ArticleMedia[] = [];
    const videoTempResources: any[] = [];

    // Check for removed videos/audios in encrypted articles (when updating)
    // For encrypted articles, get the original media from decryptedContent
    // This needs to happen before processing new media
    if (existingIdentifier && groupId && decryptedContent) {
      const originalMedia = decryptedContent.media || [];

      if (originalMedia.length > 0) {
        // Determine which media items are being kept
        let keptMediaIdentifiers = new Set<string>();

        if (media && media.length > 0) {
          // New media provided: only kept if explicitly included with existingMedia ref
          const existingMediaAttachments = media.filter((m) => m.existingMedia);
          keptMediaIdentifiers = new Set(
            existingMediaAttachments.map((m) => m.existingMedia!.identifier)
          );
        } else {
          // No new media provided: keep all existing media (text-only update)
          keptMediaIdentifiers = new Set(
            originalMedia.map((m) => m.identifier)
          );
        }

        // Find media that were in the original article but are not being kept
        const removedMedia = originalMedia.filter(
          (item) => !keptMediaIdentifiers.has(item.identifier)
        );

        // Add removed video/audio resources (both metadata and file) to deletion list
        for (const removedItem of removedMedia) {
          // Add the metadata document deletion to resources array
          resources.push({
            name: removedItem.name,
            service: SERVICE_DOCUMENT,
            identifier: removedItem.identifier,
            data64: 'RA==', // Special value to mark resource for deletion
          });

          // For encrypted videos/audios, add the file deletion
          resources.push({
            name: removedItem.name,
            service: SERVICE_FILE, // Encrypted videos/audios use FILE service
            identifier: removedItem.identifier, // Same identifier for encrypted content
            data64: 'RA==', // Special value to mark resource for deletion
          });
        }
      }
    }

    // Check for removed videos/audios in public articles (when updating)
    // For public articles, use existingMedia parameter
    if (
      existingIdentifier &&
      !groupId &&
      existingMedia &&
      existingMedia.length > 0
    ) {
      // Determine which media items are being kept
      let keptMediaIdentifiers = new Set<string>();

      if (media && media.length > 0) {
        // New media provided: only kept if explicitly included with existingMedia ref
        const existingMediaAttachments = media.filter((m) => m.existingMedia);
        keptMediaIdentifiers = new Set(
          existingMediaAttachments.map((m) => m.existingMedia!.identifier)
        );
      } else {
        // No new media provided: keep all existing media (text-only update)
        keptMediaIdentifiers = new Set(existingMedia.map((m) => m.identifier));
      }

      // Find media that were in existingMedia but are not being kept
      const removedMedia = existingMedia.filter(
        (item) => !keptMediaIdentifiers.has(item.identifier)
      );
      console.log(
        'removedMedia',
        removedMedia,
        existingMedia,
        keptMediaIdentifiers
      );
      // Add removed video/audio resources (both metadata and file) to deletion list
      for (const removedItem of removedMedia) {
        // Add the metadata document deletion to resources array (identifier is the _metadata one for video)
        resources.push({
          name: removedItem.name,
          service: SERVICE_DOCUMENT,
          identifier: removedItem.identifier,
          data64: 'RA==', // Special value to mark resource for deletion
        });

        // For public video: file identifier has no "_metadata" suffix; for public audio: same identifier as doc
        const isAudio = removedItem.mimeType?.startsWith('audio/');
        const fileIdentifier =
          !isAudio && removedItem.identifier.endsWith('_metadata')
            ? removedItem.identifier.slice(0, -'_metadata'.length)
            : removedItem.identifier;
        resources.push({
          name: removedItem.name,
          service: isAudio ? SERVICE_AUDIO : SERVICE_VIDEO,
          identifier: fileIdentifier,
          data64: 'RA==', // Special value to mark resource for deletion
        });
      }
    }

    // Separate existing media, replacements (encrypted update-in-place), and new media uploads
    if (media && media.length > 0) {
      const existingMediaAttachments = media.filter((m) => m.existingMedia);
      const newMediaUploads = media.filter((m) => !m.existingMedia);
      // Encrypted only: same identifier, new content (DOCUMENT + FILE overwritten)
      const replacementAttachments =
        groupId &&
        existingMediaAttachments.filter(
          (m) => m.replaceWithNewFile && m.file && m.existingMedia
        );
      const keptUnchangedAttachments = existingMediaAttachments.filter(
        (m) => !m.replaceWithNewFile
      );

      // Start with existing media that is unchanged
      if (keptUnchangedAttachments.length > 0) {
        mediaItems.push(
          ...keptUnchangedAttachments.map((m) => m.existingMedia!)
        );
      }

      // Process encrypted video/audio replacements (same DOCUMENT + FILE identifier, new content)
      for (const attachment of replacementAttachments || []) {
        const existingIdentifier = attachment.existingMedia!.identifier;

        if (attachment.type === 'audio') {
          const audioTitle =
            attachment.videoMetadata?.title || attachment.file.name;
          const audioDescription = attachment.videoMetadata?.description || '';
          const audioDuration = attachment.videoMetadata?.duration;

          const audioMetadataDoc: AudioMetadataDocument = {
            title: audioTitle,
            version: 1,
            description: audioDescription,
            audioReference: {
              name: userName,
              identifier: existingIdentifier,
              service: SERVICE_FILE,
            },
            mimeType: attachment.file.type,
            filename: attachment.file.name,
            fileSize: attachment.file.size,
            duration: audioDuration,
          };

          let metadataBase64 = await objectToBase64(audioMetadataDoc);
          const { key, iv } = createEncryptionParams();
          const encryptionKey = bytesToBase64(key);
          const encryptionIv = bytesToBase64(iv);

          try {
            metadataBase64 = await qortalRequest({
              action: 'ENCRYPT_QORTAL_GROUP_DATA',
              groupId,
              base64: metadataBase64,
            });
          } catch (error: any) {
            if (error?.message?.includes('No group key found')) {
              throw new Error(
                'This group does not have encryption keys configured. Please create the group encrypted keys in Qortal Chat.'
              );
            }
            if (
              error?.message?.includes('encrypt') ||
              error?.error?.includes('encrypt')
            ) {
              throw new Error(
                'This group does not have encryption keys configured. Please use a group with encryption enabled.'
              );
            }
            throw error;
          }

          resources.push({
            identifier: existingIdentifier,
            service: SERVICE_FILE,
            file: attachment.file,
            name: userName,
            encryption: {
              encryptionType: 'streamed-v1',
              iv: encryptionIv,
              key: encryptionKey,
            },
          });

          resources.push({
            identifier: existingIdentifier,
            service: SERVICE_DOCUMENT,
            base64: metadataBase64,
            name: userName,
          });

          videoTempResources.push({
            qortalMetadata: {
              name: userName,
              service: SERVICE_DOCUMENT,
              identifier: existingIdentifier,
              created: Date.now(),
            },
            data: metadataBase64,
          });

          mediaItems.push({
            identifier: existingIdentifier,
            service: SERVICE_DOCUMENT,
            name: userName,
            mimeType: attachment.file.type,
            key: encryptionKey,
            iv: encryptionIv,
          });
        } else {
          // Video replacement
          if (!attachment.videoMetadata) {
            throw new Error('Video metadata is required');
          }

          const videoTitle =
            attachment.videoMetadata.title || attachment.file.name;
          const videoDescription = attachment.videoMetadata.description || '';

          const videoMetadataDoc: VideoMetadataDocument = {
            title: videoTitle,
            version: 1,
            htmlDescription: videoDescription,
            fullDescription: stripHtmlTags(videoDescription),
            videoReference: {
              name: userName,
              identifier: existingIdentifier,
              service: SERVICE_FILE,
            },
            videoType: attachment.file.type,
            filename: attachment.file.name,
            fileSize: attachment.file.size,
            duration: attachment.videoMetadata.duration || 0,
            category: attachment.videoMetadata.category,
            ...(attachment.videoMetadata.videoImage && {
              videoImage: attachment.videoMetadata.videoImage,
            }),
            ...(attachment.videoMetadata.extracts &&
              attachment.videoMetadata.extracts.length > 0 && {
                extracts: attachment.videoMetadata.extracts,
              }),
            ...(attachment.videoMetadata.subcategory && {
              subcategory: attachment.videoMetadata.subcategory,
            }),
          };

          let metadataBase64 = await objectToBase64(videoMetadataDoc);
          const { key, iv } = createEncryptionParams();
          const encryptionKey = bytesToBase64(key);
          const encryptionIv = bytesToBase64(iv);

          try {
            metadataBase64 = await qortalRequest({
              action: 'ENCRYPT_QORTAL_GROUP_DATA',
              groupId,
              base64: metadataBase64,
            });
          } catch (error: any) {
            if (error?.message?.includes('No group key found')) {
              throw new Error(
                'This group does not have encryption keys configured. Please create the group encrypted keys in Qortal Chat.'
              );
            }
            if (
              error?.message?.includes('encrypt') ||
              error?.error?.includes('encrypt')
            ) {
              throw new Error(
                'This group does not have encryption keys configured. Please use a group with encryption enabled.'
              );
            }
            throw error;
          }

          resources.push({
            identifier: existingIdentifier,
            service: SERVICE_FILE,
            file: attachment.file,
            name: userName,
            encryption: {
              encryptionType: 'streamed-v1',
              iv: encryptionIv,
              key: encryptionKey,
            },
          });

          resources.push({
            identifier: existingIdentifier,
            service: SERVICE_DOCUMENT,
            base64: metadataBase64,
            name: userName,
          });

          videoTempResources.push({
            qortalMetadata: {
              name: userName,
              service: SERVICE_DOCUMENT,
              identifier: existingIdentifier,
              created: Date.now(),
            },
            data: metadataBase64,
          });

          mediaItems.push({
            identifier: existingIdentifier,
            service: SERVICE_DOCUMENT,
            name: userName,
            mimeType: attachment.file.type,
            key: encryptionKey,
            iv: encryptionIv,
          });
        }
      }

      // Process new video/audio uploads
      // Videos get TWO resources: VIDEO service + DOCUMENT service (metadata)
      // Audio gets TWO resources: AUDIO service + DOCUMENT service (metadata)
      for (const attachment of newMediaUploads) {
        if (attachment.type === 'audio') {
          // Handle audio files - create identifier and metadata document
          // For encrypted audios (groupId present), use GROUP_AUDIO_PRIVATE structure
          // For public audios, use article-based identifier
          let audioIdentifier: string;

          if (groupId) {
            // Private group audio - use GROUP_AUDIO_PRIVATE structure (like example-app)
            const audioParentEntity = GROUP_AUDIO_PRIVATE;
            const audioChildEntity = groupId.toString();
            audioIdentifier = await identifierOperations.buildIdentifier(
              audioChildEntity,
              audioParentEntity,
              false,
              audioParentEntity
            );
          } else {
            // Public audio - use article-based identifier
            audioIdentifier = await identifierOperations.buildIdentifier(
              articleIdentifier,
              ENTITY_AUDIO
            );
          }

          if (!audioIdentifier) {
            throw new Error('Failed to create audio identifier');
          }

          // Use file name as default title if no metadata provided
          const audioTitle =
            attachment.videoMetadata?.title || attachment.file.name;
          const audioDescription = attachment.videoMetadata?.description || '';
          const audioDuration = attachment.videoMetadata?.duration;

          // Create audio metadata document
          const audioMetadataDoc: AudioMetadataDocument = {
            title: audioTitle,
            version: 1,
            description: audioDescription,
            audioReference: {
              name: userName,
              identifier: audioIdentifier,
              service: groupId ? SERVICE_FILE : SERVICE_AUDIO,
            },
            mimeType: attachment.file.type,
            filename: attachment.file.name,
            fileSize: attachment.file.size,
            duration: audioDuration,
          };

          // Convert metadata to base64
          let metadataBase64 = await objectToBase64(audioMetadataDoc);

          // For encrypted articles, encrypt the audio metadata and add encryption params
          let encryptionKey: string | undefined;
          let encryptionIv: string | undefined;

          if (groupId) {
            const { key, iv } = createEncryptionParams();
            encryptionKey = bytesToBase64(key);
            encryptionIv = bytesToBase64(iv);

            // Encrypt the audio metadata for private groups
            try {
              metadataBase64 = await qortalRequest({
                action: 'ENCRYPT_QORTAL_GROUP_DATA',
                groupId,
                base64: metadataBase64,
              });
            } catch (error: any) {
              if (error?.message?.includes('No group key found')) {
                throw new Error(
                  'This group does not have encryption keys configured. Please create the group encrypted keys in Qortal Chat.'
                );
              }
              if (
                error?.message?.includes('encrypt') ||
                error?.error?.includes('encrypt')
              ) {
                throw new Error(
                  'This group does not have encryption keys configured. Please use a group with encryption enabled.'
                );
              }
              throw error;
            }
          }

          // Add audio file resource to publish queue

          const audioFileResource: any = {
            identifier: audioIdentifier,
            service: groupId ? SERVICE_FILE : SERVICE_AUDIO, // Use FILE service for encrypted audios
            file: attachment.file,
            name: userName,
          };

          // Add encryption parameters for private group audio
          if (groupId && encryptionKey && encryptionIv) {
            audioFileResource.encryption = {
              encryptionType: 'streamed-v1',
              iv: encryptionIv,
              key: encryptionKey,
            };
          } else {
            audioFileResource.filename = attachment.file.name;
          }

          resources.push(audioFileResource);

          // Add metadata document resource to publish queue (uses same identifier)
          resources.push({
            identifier: audioIdentifier,
            service: SERVICE_DOCUMENT,
            base64: metadataBase64,
            name: userName,
          });

          videoTempResources.push({
            qortalMetadata: {
              name: userName,
              service: SERVICE_DOCUMENT,
              identifier: audioIdentifier,
              created: Date.now(),
            },
            data: groupId ? metadataBase64 : audioMetadataDoc,
          });

          // Store reference to the metadata document in the article
          // For encrypted articles, also store encryption key and IV
          const mediaRef: any = {
            identifier: audioIdentifier,
            service: SERVICE_DOCUMENT,
            name: userName,
            mimeType: attachment.file.type,
          };

          if (groupId && encryptionKey && encryptionIv) {
            mediaRef.key = encryptionKey;
            mediaRef.iv = encryptionIv;
          }

          mediaItems.push(mediaRef);
        } else {
          // Handle video files
          if (!attachment.videoMetadata) {
            throw new Error('Video metadata is required');
          }

          // For encrypted videos, don't publish to QTube (following example-app pattern)
          // Instead, publish as encrypted video file + metadata with the SAME identifier
          if (groupId) {
            // ENCRYPTED VIDEO: Don't use QTube, use GROUP_VIDEO_PRIVATE structure (like example-app)
            const videoParentEntity = GROUP_VIDEO_PRIVATE;
            const videoChildEntity = groupId.toString();
            const videoIdentifier = await identifierOperations.buildIdentifier(
              videoChildEntity,
              videoParentEntity,
              false,
              videoParentEntity
            );

            if (!videoIdentifier) {
              throw new Error('Failed to create video identifier');
            }

            // Use simplified metadata for encrypted videos (no QTube fields)
            const videoTitle =
              attachment.videoMetadata.title || attachment.file.name;
            const videoDescription = attachment.videoMetadata.description || '';

            // Create simplified video metadata document (no QTube-specific fields)
            const videoMetadataDoc: VideoMetadataDocument = {
              title: videoTitle,
              version: 1,
              htmlDescription: videoDescription,
              fullDescription: stripHtmlTags(videoDescription),
              videoReference: {
                name: userName,
                identifier: videoIdentifier,
                service: SERVICE_FILE, // Keep service reference for compatibility
              },
              videoType: attachment.file.type,
              filename: attachment.file.name,
              fileSize: attachment.file.size,
              duration: attachment.videoMetadata.duration || 0,
              category: attachment.videoMetadata.category,
              ...(attachment.videoMetadata.videoImage && {
                videoImage: attachment.videoMetadata.videoImage,
              }),
              ...(attachment.videoMetadata.extracts &&
                attachment.videoMetadata.extracts.length > 0 && {
                  extracts: attachment.videoMetadata.extracts,
                }),
              ...(attachment.videoMetadata.subcategory && {
                subcategory: attachment.videoMetadata.subcategory,
              }),
            };

            // Convert metadata to base64
            let metadataBase64 = await objectToBase64(videoMetadataDoc);

            // Generate encryption parameters
            const { key, iv } = createEncryptionParams();
            const encryptionKey = bytesToBase64(key);
            const encryptionIv = bytesToBase64(iv);

            // Encrypt the video metadata
            try {
              metadataBase64 = await qortalRequest({
                action: 'ENCRYPT_QORTAL_GROUP_DATA',
                groupId,
                base64: metadataBase64,
              });
            } catch (error: any) {
              if (error?.message?.includes('No group key found')) {
                throw new Error(
                  'This group does not have encryption keys configured. Please create the group encrypted keys in Qortal Chat.'
                );
              }
              if (
                error?.message?.includes('encrypt') ||
                error?.error?.includes('encrypt')
              ) {
                throw new Error(
                  'This group does not have encryption keys configured. Please use a group with encryption enabled.'
                );
              }
              throw error;
            }

            // Add encrypted video file resource (using SERVICE_FILE for encrypted videos)
            // This keeps it private and not discoverable on QTube
            resources.push({
              identifier: videoIdentifier,
              service: SERVICE_FILE,
              file: attachment.file,
              name: userName,
              encryption: {
                encryptionType: 'streamed-v1',
                iv: encryptionIv,
                key: encryptionKey,
              },
            });

            // Add encrypted metadata document
            resources.push({
              identifier: videoIdentifier,
              service: SERVICE_DOCUMENT,
              base64: metadataBase64,
              name: userName,
            });

            videoTempResources.push({
              qortalMetadata: {
                name: userName,
                service: SERVICE_DOCUMENT,
                identifier: videoIdentifier,
                created: Date.now(),
              },
              data: groupId ? metadataBase64 : videoMetadataDoc,
            });

            // Store reference with encryption keys
            mediaItems.push({
              identifier: videoIdentifier,
              service: SERVICE_DOCUMENT,
              name: userName,
              mimeType: attachment.file.type,
              key: encryptionKey,
              iv: encryptionIv,
            });
          } else {
            // PUBLIC VIDEO: Publish to QTube with full metadata
            // Sanitize the video title for use in identifier
            const sanitizeTitle = attachment.videoMetadata.title
              .replace(/[^a-zA-Z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim()
              .toLowerCase();

            // Generate a unique ID for this video
            const id = uid.rnd();

            // Create identifier for the video file
            const videoIdentifier = `${QTUBE_VIDEO_BASE}${sanitizeTitle.slice(0, 30)}_${id}`;
            const metadataIdentifier = `${videoIdentifier}_metadata`;

            // Generate a short unique code for the video (5 characters)
            const videoCode = shortuid.rnd();

            // Generate comments identifier for the video
            const commentsId = `${QTUBE_VIDEO_BASE}_cm_${id}`;

            // Create video metadata document with all QTube fields
            const videoMetadataDoc: VideoMetadataDocument = {
              title: attachment.videoMetadata.title,
              version: 1,
              htmlDescription: attachment.videoMetadata.description || '',
              fullDescription: stripHtmlTags(
                attachment.videoMetadata.description || ''
              ),
              videoReference: {
                name: userName,
                identifier: videoIdentifier,
                service: SERVICE_VIDEO,
              },
              commentsId,
              code: videoCode,
              videoType: attachment.file.type,
              filename: attachment.file.name,
              fileSize: attachment.file.size,
              duration: attachment.videoMetadata.duration || 0,
              category: attachment.videoMetadata.category,
              ...(attachment.videoMetadata.videoImage && {
                videoImage: attachment.videoMetadata.videoImage,
              }),
              ...(attachment.videoMetadata.extracts &&
                attachment.videoMetadata.extracts.length > 0 && {
                  extracts: attachment.videoMetadata.extracts,
                }),
              ...(attachment.videoMetadata.subcategory && {
                subcategory: attachment.videoMetadata.subcategory,
              }),
            };

            // Create metadata description with category info
            const subcategoryStr = attachment.videoMetadata.subcategory || '';
            const fullDescriptionText = stripHtmlTags(
              attachment.videoMetadata.description || ''
            );
            const metadescription =
              `**category:${attachment.videoMetadata.category};subcategory:${subcategoryStr};code:${videoCode}**` +
              fullDescriptionText.slice(0, 150);

            // Convert metadata to base64
            const metadataBase64 = await objectToBase64(videoMetadataDoc);

            // Add public video file resource with QTube tag
            resources.push({
              identifier: videoIdentifier,
              service: SERVICE_VIDEO,
              file: attachment.file,
              name: userName,
              title: truncateByBytes(attachment.videoMetadata.title, 75),
              description: metadescription,
              filename: attachment.file.name,
              tag1: QTUBE_VIDEO_BASE, // Makes it discoverable on QTube
            });

            // Add public metadata document resource with QTube tag
            resources.push({
              identifier: metadataIdentifier,
              service: SERVICE_DOCUMENT,
              base64: metadataBase64,
              name: userName,
              title: truncateByBytes(attachment.videoMetadata.title, 75),
              description: metadescription,
              filename: 'video_metadata.json',
              code: videoCode,
              tag1: QTUBE_VIDEO_BASE, // Makes it discoverable on QTube
            });

            videoTempResources.push({
              qortalMetadata: {
                name: userName,
                service: SERVICE_DOCUMENT,
                identifier: metadataIdentifier,
                created: Date.now(),
              },
              data: videoMetadataDoc,
            });

            // Store reference to the metadata document
            mediaItems.push({
              identifier: metadataIdentifier,
              service: SERVICE_DOCUMENT,
              name: userName,
              mimeType: attachment.file.type,
            });
          }
        }
      }
    } else if (existingMedia && existingMedia.length > 0) {
      // Use existing media when editing
      mediaItems.push(...existingMedia);
    }

    // Create article metadata
    const article: Article = {
      title,
      subtitle,
      content: processedContent, // Content with subwire-image:// references
      coverImage: coverImageData, // Required cover image for all types
      images: images.length > 0 ? images : undefined, // Additional images from content
      media: mediaItems.length > 0 ? mediaItems : undefined, // Video/audio references for episodes
      timestamp: existingTimestamp || Date.now(), // Preserve original timestamp when updating
      name: userName,
      type,
      published: true,
    };

    // Handle encryption for private group articles
    let articleDataToPublish: any;
    let encryptedContent: string | undefined;

    if (groupId) {
      try {
        // Decide what to encrypt based on encryptMetadata flag
        if (encryptMetadata) {
          // Full encryption: encrypt everything including title, subtitle, and coverImage
          const articleBase64Temp = await objectToBase64(article);

          // Encrypt the entire article content using the group's encryption keys
          encryptedContent = await qortalRequest({
            action: 'ENCRYPT_QORTAL_GROUP_DATA',
            groupId,
            base64: articleBase64Temp,
          });

          // Create encrypted article structure with no public metadata
          articleDataToPublish = {
            title: '', // Empty title for fully encrypted articles
            timestamp: article.timestamp,
            name: userName,
            groupId,
            encryptedContent,
            type,
            published: true,
          };
        } else {
          // Partial encryption (default): keep title, subtitle, and coverImage public for discovery
          // Only encrypt the sensitive content (content, images, media)
          const contentToEncrypt = {
            content: article.content,
            images: article.images,
            media: article.media,
          };

          const contentBase64 = await objectToBase64(contentToEncrypt);

          // Encrypt only the content using the group's encryption keys
          encryptedContent = await qortalRequest({
            action: 'ENCRYPT_QORTAL_GROUP_DATA',
            groupId,
            base64: contentBase64,
          });

          // Create article with public metadata but encrypted content
          articleDataToPublish = {
            title: article.title, // Keep title public
            subtitle: article.subtitle, // Keep subtitle public
            coverImage: article.coverImage, // Keep coverImage public
            timestamp: article.timestamp,
            name: userName,
            groupId,
            encryptedContent,
            type,
            published: true,
          };
        }
      } catch (error: any) {
        // Check if error is due to missing encryption keys
        if (error?.message?.includes('No group key found')) {
          throw new Error(
            'This group does not have encryption keys configured. Please create the group encrypted keys in Qortal Chat.'
          );
        }
        if (
          error?.message?.includes('encrypt') ||
          error?.error?.includes('encrypt')
        ) {
          throw new Error(
            'This group does not have encryption keys configured. Please use a group with encryption enabled.'
          );
        }
        throw error;
      }
    } else {
      // Public article - use as is
      articleDataToPublish = article;
    }

    // Build description from subtitle (max 180 bytes)
    const description = truncateByBytes(subtitle || '', 180);

    // Convert article to base64 - always use articleDataToPublish which contains encryptedContent if encrypted
    const articleBase64 = await objectToBase64(articleDataToPublish);

    // Truncate title to max 75 bytes
    const truncatedTitle = truncateByBytes(title, 75);

    // Add article resource to the resources array (videos already added above)
    resources.push({
      identifier: articleIdentifier,
      service: SERVICE_DOCUMENT,
      name: userName,
      data64: articleBase64,
      // Don't publish title/description when metadata is encrypted
      title: encryptMetadata ? '' : truncatedTitle,
      description: encryptMetadata ? '' : description,
    });
    console.log('resources', resources);
    // Publish using publishMultipleResources (same pattern as example app)
    await publishMultipleResources(resources);

    // Update local state based on whether this is a new article or an update
    if (existingIdentifier) {
      // Update existing article in local state
      const resourcesToUpdate = [
        {
          qortalMetadata: {
            name: userName,
            service: SERVICE_DOCUMENT,
            identifier: articleIdentifier,
            created: articleDataToPublish.timestamp,
            updated: Date.now(),
          },
          data: articleDataToPublish,
        },
        ...videoTempResources, // Add any new video metadata that was uploaded
      ];
      updateNewResources(resourcesToUpdate);
    } else {
      if (groupId) {
        addNewResources(`SUBSCRIPTIONS_ARTICLES`, [
          {
            qortalMetadata: {
              name: userName,
              service: SERVICE_DOCUMENT,
              identifier: articleIdentifier,
              created: articleDataToPublish.timestamp,
            },
            data: articleDataToPublish,
          },
        ]);
      } else {
        addNewResources(`ONLY_PUBLIC_ARTICLES`, [
          {
            qortalMetadata: {
              name: userName,
              service: SERVICE_DOCUMENT,
              identifier: articleIdentifier,
              created: articleDataToPublish.timestamp,
            },
            data: articleDataToPublish,
          },
        ]);
      }
      // Add new article to local state
      addNewResources(LIST_ARTICLES_FEED, [
        {
          qortalMetadata: {
            name: userName,
            service: SERVICE_DOCUMENT,
            identifier: articleIdentifier,
            created: articleDataToPublish.timestamp,
          },
          data: articleDataToPublish,
        },
      ]);
      addNewResources('ALL_ARTICLES', [
        {
          qortalMetadata: {
            name: userName,
            service: SERVICE_DOCUMENT,
            identifier: articleIdentifier,
            created: articleDataToPublish.timestamp,
          },
          data: articleDataToPublish,
        },
      ]);

      addNewResources(`user-articles-${userName}`, [
        {
          qortalMetadata: {
            name: userName,
            service: SERVICE_DOCUMENT,
            identifier: articleIdentifier,
            created: articleDataToPublish.timestamp,
          },
          data: articleDataToPublish,
        },
      ]);
      addNewResources(`user-all-${userName}`, [
        {
          qortalMetadata: {
            name: userName,
            service: SERVICE_DOCUMENT,
            identifier: articleIdentifier,
            created: articleDataToPublish.timestamp,
          },
          data: articleDataToPublish,
        },
      ]);
      if (type === 'episode') {
        addNewResources(`user-episodes-${userName}`, [
          {
            qortalMetadata: {
              name: userName,
              service: SERVICE_DOCUMENT,
              identifier: articleIdentifier,
              created: articleDataToPublish.timestamp,
            },
            data: articleDataToPublish,
          },
        ]);
      }
      if (type === 'essay') {
        addNewResources(`user-essays-${userName}`, [
          {
            qortalMetadata: {
              name: userName,
              service: SERVICE_DOCUMENT,
              identifier: articleIdentifier,
              created: articleDataToPublish.timestamp,
            },
            data: articleDataToPublish,
          },
        ]);
      }
      updateNewResources([...videoTempResources]);
    }

    return articleIdentifier;
  } catch (error) {
    console.error('Error publishing article:', error);
    throw error;
  }
}

/**
 * Delete an article from the Qortal blockchain
 *
 * This function deletes the article and any attached videos/audios (both public and encrypted).
 * The deleteResource function from lists will handle the actual deletion.
 * Note: Images are stored as base64 in the article, so they don't need separate deletion.
 *
 * @param articleMetadata - The QortalMetadata of the article to delete
 * @param article - The article data
 * @param deleteResourceFn - The deleteResource function from lists
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteArticle(
  articleMetadata: any,
  article: Article,
  deleteResourceFn: (resourcesToDelete: any[]) => Promise<boolean>
): Promise<void> {
  try {
    const resourcesToDelete: any[] = [articleMetadata];

    // For encrypted articles with videos/audios, we need to delete the media resources too
    if (article.groupId && article.encryptedContent) {
      try {
        // Decrypt the content to get the media references
        const decrypted = await qortalRequest({
          action: 'DECRYPT_QORTAL_GROUP_DATA',
          groupId: article.groupId,
          base64: article.encryptedContent,
        });

        // Parse the decrypted content
        const jsonString = decodeURIComponent(escape(atob(decrypted)));
        const parsedContent = JSON.parse(jsonString);

        // If there are media items, add them to the deletion list
        if (parsedContent.media && Array.isArray(parsedContent.media)) {
          for (const mediaItem of parsedContent.media) {
            // Add the metadata document to deletion list
            resourcesToDelete.push({
              name: mediaItem.name,
              service: SERVICE_DOCUMENT,
              identifier: mediaItem.identifier,
              created: 0,
              size: 0,
            });

            // Add the media file to deletion list
            // For encrypted videos/audios, use FILE service
            resourcesToDelete.push({
              name: mediaItem.name,
              service: SERVICE_FILE,
              identifier: mediaItem.identifier, // Same identifier for encrypted content
              created: 0,
              size: 0,
            });
          }
        }
      } catch (error) {
        // If decryption fails, just log it and continue with article deletion
        // This might happen if user no longer has access to the group
        console.error('Failed to decrypt article for media deletion:', error);
      }
    } else if (article.media && Array.isArray(article.media)) {
      // For public articles, delete all attached media (videos and audios)
      for (const mediaItem of article.media) {
        const isAudio = mediaItem.mimeType?.startsWith('audio/');

        // Add the metadata document to deletion list
        resourcesToDelete.push({
          name: mediaItem.name,
          service: SERVICE_DOCUMENT,
          identifier: mediaItem.identifier,
          created: 0,
          size: 0,
        });

        // Public video: file identifier has no "_metadata" suffix; public audio: same identifier as doc
        const fileIdentifier =
          !isAudio && mediaItem.identifier.endsWith('_metadata')
            ? mediaItem.identifier.slice(0, -'_metadata'.length)
            : mediaItem.identifier;
        resourcesToDelete.push({
          name: mediaItem.name,
          service: isAudio ? SERVICE_AUDIO : SERVICE_VIDEO,
          identifier: fileIdentifier,
          created: 0,
          size: 0,
        });
      }
    }

    // Delete the article and any associated audio resources
    await deleteResourceFn(resourcesToDelete);
  } catch (error) {
    console.error('Error deleting article:', error);
    throw error;
  }
}

/**
 * Like an article by publishing a simple "liked" resource
 *
 * @param articleIdentifier - The identifier of the article to like
 * @param identifierOperations - Operations for identifier management
 * @param userName - The name of the user liking the article
 * @param addNewResources - Function to update local state
 * @returns The identifier of the published like resource
 */
export async function likeArticle(
  articleIdentifier: string,
  identifierOperations: any,
  userName: string,
  addNewResources: any
): Promise<string> {
  try {
    if (!userName) {
      throw new Error('A Qortal name is required to like an article');
    }

    if (!articleIdentifier) {
      throw new Error('Article identifier is required');
    }

    // Create a unique identifier for the like by hashing separately and concatenating
    const likeHash = await identifierOperations.hashString(
      'like',
      EnumCollisionStrength.HIGH
    );
    const articleHash = await identifierOperations.hashString(
      articleIdentifier,
      EnumCollisionStrength.HIGH
    );

    if (!likeHash || !articleHash) {
      throw new Error('Failed to create like identifier');
    }

    const likeIdentifier = likeHash + articleHash;

    // Create simple like data
    const likeData = 'this article has been liked';

    // Convert to base64
    const likeBase64 = btoa(likeData);

    // Publish the like
    await qortalRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      service: 'DOCUMENT',
      name: userName,
      identifier: likeIdentifier,
      data64: likeBase64,
    });

    addNewResources(`${likeIdentifier}-${userName}`, [
      {
        qortalMetadata: {
          name: userName,
          service: 'DOCUMENT',
          identifier: likeIdentifier,
          size: 100,
          created: Date.now(),
        },
        data: {},
      },
    ]);
    addNewResources(likeIdentifier, [
      {
        qortalMetadata: {
          name: userName,
          service: 'DOCUMENT',
          identifier: likeIdentifier,
          size: 100,
          created: Date.now(),
        },
        data: {},
      },
    ]);
    return likeIdentifier;
  } catch (error) {
    console.error('Error liking article:', error);
    throw error;
  }
}

/**
 * Unlike an article by deleting the like resource
 *
 * @param articleIdentifier - The identifier of the article to unlike
 * @param identifierOperations - Operations for identifier management
 * @param userName - The name of the user unliking the article
 * @param deleteResourceFn - The deleteResource function from lists
 * @returns Promise that resolves when deletion is complete
 */
export async function unlikeArticle(
  articleIdentifier: string,
  identifierOperations: any,
  userName: string,
  deleteResourceFn: (resourcesToDelete: any[]) => Promise<boolean>
): Promise<void> {
  try {
    if (!userName) {
      throw new Error('A Qortal name is required to unlike an article');
    }

    if (!articleIdentifier) {
      throw new Error('Article identifier is required');
    }

    // Get the like identifier by hashing separately and concatenating
    const likeHash = await identifierOperations.hashString(
      'like',
      EnumCollisionStrength.HIGH
    );
    const articleHash = await identifierOperations.hashString(
      articleIdentifier,
      EnumCollisionStrength.HIGH
    );

    if (!likeHash || !articleHash) {
      throw new Error('Failed to create like identifier');
    }

    const likeIdentifier = likeHash + articleHash;

    // Delete the like resource
    await deleteResourceFn([
      {
        name: userName,
        service: 'DOCUMENT',
        identifier: likeIdentifier,
      },
    ]);
  } catch (error) {
    console.error('Error unliking article:', error);
    throw error;
  }
}
