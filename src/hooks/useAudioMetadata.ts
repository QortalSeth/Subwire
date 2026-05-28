import { useState, useEffect, useMemo } from 'react';
import { base64ToObject, usePublish } from 'qapp-core';

declare const qortalRequest: (params: any) => Promise<any>;

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

export interface AudioWithMetadata {
  audioUrl: string;
  metadata: AudioMetadataDocument;
  metadataIdentifier: string;
  metadataName: string;
  key?: string;
  iv?: string;
  mimeType?: string;
}

/**
 * Hook to fetch audio metadata documents and return audio URLs with metadata
 * @param audios - Array of audio references with metadata identifiers
 * @param groupId - Optional group ID for encrypted audios
 * @returns Array of audios with fetched metadata
 */
export function useAudioMetadata(
  audios:
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
): { audiosWithMetadata: AudioWithMetadata[]; isLoading: boolean } {
  const [audiosWithMetadata, setAudiosWithMetadata] = useState<
    AudioWithMetadata[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const { fetchPublish: fetchPublishBase64 } = usePublish(3, 'BASE64');
  const { fetchPublish } = usePublish();

  // Create stable identifiers string for dependency array
  const audioIdentifiers = useMemo(
    () =>
      audios
        ?.map(
          (a) =>
            `${a.name}-${a.identifier}-${a.service}-${a.key || ''}-${a.iv || ''}`
        )
        .join('|') || '',
    [audios]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchMetadata = async () => {
      try {
        // No audios to fetch
        if (!audios || audios.length === 0) {
          if (isMounted) {
            setAudiosWithMetadata([]);
          }
          return;
        }

        setIsLoading(true);
        const results: AudioWithMetadata[] = [];

        for (const audio of audios) {
          try {
            let response = null;

            if (groupId) {
              // For encrypted audios, fetch as base64
              response = await fetchPublishBase64({
                name: audio.name,
                service: audio.service as any, // Should be 'DOCUMENT'
                identifier: audio.identifier,
              });
            } else {
              // For non-encrypted audios, fetch normally
              response = await fetchPublish({
                name: audio.name,
                service: audio.service as any, // Should be 'DOCUMENT'
                identifier: audio.identifier,
              });
            }

            if (
              isMounted &&
              response &&
              response.hasResource &&
              response?.resource?.data
            ) {
              let metadata: AudioMetadataDocument;

              // Check if this is an encrypted audio metadata (has groupId)
              if (groupId) {
                try {
                  // The response.resource.data is base64 encoded encrypted data for encrypted audios
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
                    'Failed to decrypt audio metadata:',
                    decryptError
                  );
                  // Skip this audio if decryption fails
                  continue;
                }
              } else {
                // For non-encrypted audios, data is already parsed
                metadata = response.resource.data as AudioMetadataDocument;
              }

              // Construct the audio URL from the audioReference
              const audioUrl = `/arbitrary/${metadata.audioReference.service}/${metadata.audioReference.name}/${metadata.audioReference.identifier}`;

              results.push({
                audioUrl,
                metadata,
                metadataIdentifier: audio.identifier,
                metadataName: audio.name,
                ...(audio.key && { key: audio.key }),
                ...(audio.iv && { iv: audio.iv }),
                ...(audio.mimeType && { mimeType: audio.mimeType }),
              });
            } else {
              // Silently handle missing metadata - it's expected for some media items
              // Only log in development for debugging
              if (import.meta.env.DEV) {
                console.debug(
                  'useAudioMetadata: No metadata found for audio:',
                  audio.identifier
                );
              }
            }
          } catch (error) {
            console.error('Error fetching audio metadata:', error);
            // Continue fetching other audios even if one fails
          }
        }

        if (isMounted) {
          setAudiosWithMetadata(results);
        }
      } catch (error) {
        console.error('Error in audio metadata fetch:', error);
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
  }, [audioIdentifiers, groupId, fetchPublish, fetchPublishBase64]);

  return { audiosWithMetadata, isLoading };
}

