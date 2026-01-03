import { useState, useEffect, useMemo } from 'react';
import { base64ToObject, usePublish } from 'qapp-core';

declare const qortalRequest: (params: any) => Promise<any>;

export interface VideoMetadataDocument {
  title: string;
  version: number;
  fullDescription: string;
  htmlDescription: string;
  videoImage?: string;
  videoReference: {
    name: string;
    identifier: string;
    service: string;
  };
  extracts?: string[];
  commentsId?: string;
  category: number;
  subcategory?: number;
  code?: string;
  videoType: string;
  filename: string;
  fileSize: number;
  duration: number;
}

export interface VideoWithMetadata {
  videoUrl: string;
  metadata: VideoMetadataDocument;
  metadataIdentifier: string;
  metadataName: string;
  key?: string;
  iv?: string;
  mimeType?: string;
}

/**
 * Hook to fetch video metadata documents and return video URLs with metadata
 * Works similar to useOriginalPostData for reposts
 * @param videos - Array of video references with metadata identifiers
 * @param groupId - Optional group ID for encrypted videos
 * @returns Array of videos with fetched metadata
 */
export function useVideoMetadata(
  videos:
    | Array<{
        identifier: string;
        name: string;
        service: string;
        key?: string;
        iv?: string;
        mimeType?: string;
      }>
    | undefined,
  groupId?: number
): { videosWithMetadata: VideoWithMetadata[]; isLoading: boolean } {
  const [videosWithMetadata, setVideosWithMetadata] = useState<
    VideoWithMetadata[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchPublish: fetchPublishBase64 } = usePublish(3, 'BASE64');
  const { fetchPublish } = usePublish();

  // Create stable identifiers string for dependency array (similar to useOriginalPostData pattern)
  const videoIdentifiers = useMemo(
    () =>
      videos
        ?.map(
          (v) =>
            `${v.name}-${v.identifier}-${v.service}-${v.key || ''}-${v.iv || ''}`
        )
        .join('|') || '',
    [videos]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchMetadata = async () => {
      try {
        // No videos to fetch
        if (!videos || videos.length === 0) {
          if (isMounted) {
            setVideosWithMetadata([]);
          }
          return;
        }

        setIsLoading(true);
        const results: VideoWithMetadata[] = [];

        for (const video of videos) {
          try {
            let response = null;

            if (groupId) {
              // For encrypted videos, fetch as base64
              response = await fetchPublishBase64({
                name: video.name,
                service: video.service as any, // Should be 'DOCUMENT'
                identifier: video.identifier,
              });
            } else {
              // For non-encrypted videos, fetch normally
              response = await fetchPublish({
                name: video.name,
                service: video.service as any, // Should be 'DOCUMENT'
                identifier: video.identifier,
              });
            }

            if (
              isMounted &&
              response &&
              response.hasResource &&
              response?.resource?.data
            ) {
              let metadata: VideoMetadataDocument;

              // Check if this is an encrypted video metadata (has groupId)
              if (groupId) {
                try {
                  // The response.resource.data is base64 encoded encrypted data for encrypted videos
                  // We need to decrypt it first
                  const encryptedBase64 = response.resource.data as string;
                  const decrypted = await qortalRequest({
                    action: 'DECRYPT_QORTAL_GROUP_DATA',
                    groupId,
                    base64: encryptedBase64,
                  });

                  // Parse the decrypted content
                  metadata = await base64ToObject(decrypted);
                } catch (decryptError) {
                  console.error(
                    'Failed to decrypt video metadata:',
                    decryptError
                  );
                  // Skip this video if decryption fails
                  continue;
                }
              } else {
                // For non-encrypted videos, data is already parsed
                metadata = response.resource.data as VideoMetadataDocument;
              }

              // Construct the video URL from the videoReference
              const videoUrl = `/arbitrary/${metadata.videoReference.service}/${metadata.videoReference.name}/${metadata.videoReference.identifier}`;

              results.push({
                videoUrl,
                metadata,
                metadataIdentifier: video.identifier,
                metadataName: video.name,
                ...(video.key && { key: video.key }),
                ...(video.iv && { iv: video.iv }),
                ...(video.mimeType && { mimeType: video.mimeType }),
              });
            } else {
              console.warn(
                'useVideoMetadata: No resource found or invalid response:',
                response
              );
            }
          } catch (error) {
            console.error('Error fetching video metadata:', error);
            // Continue fetching other videos even if one fails
          }
        }

        if (isMounted) {
          setVideosWithMetadata(results);
        }
      } catch (error) {
        console.error('Error in video metadata fetch:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [videoIdentifiers, groupId, fetchPublish, fetchPublishBase64]);

  return { videosWithMetadata, isLoading };
}
