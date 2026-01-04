import { useState, useEffect } from 'react';

declare const qortalRequest: (params: any) => Promise<any>;

interface ArticleData {
  title?: string;
  subtitle?: string;
  content?: string;
  coverImage?: any;
  images?: any[];
  media?: any[];
  tags?: string[];
  groupId?: number;
  encryptedContent?: string;
  [key: string]: any;
}

interface DecryptedArticleContent {
  content?: string;
  images?: any[];
  media?: any[];
  tags?: string[];
  title?: string;
  subtitle?: string;
  coverImage?: any;
}

interface UseDecryptArticleResult {
  decryptedContent: DecryptedArticleContent | null;
  isDecrypting: boolean;
  decryptionFailed: boolean;
  decryptionError: string | null;
}

/**
 * Hook to decrypt encrypted article content
 * Follows the same pattern as example-app's Post decryption
 */
export function useDecryptArticle(
  article: ArticleData | null
): UseDecryptArticleResult {
  const [decryptedContent, setDecryptedContent] =
    useState<DecryptedArticleContent | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionFailed, setDecryptionFailed] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  useEffect(() => {
    const attemptDecryption = async () => {
      // Reset state when article changes
      setDecryptedContent(null);
      setDecryptionFailed(false);
      setDecryptionError(null);

      // Check if this is an encrypted article
      if (!article?.encryptedContent || !article?.groupId) {
        return;
      }

      setIsDecrypting(true);
      try {
        // Decrypt the content using Qortal Core's decryption action
        const decrypted = await qortalRequest({
          action: 'DECRYPT_QORTAL_GROUP_DATA',
          groupId: article.groupId,
          base64: article.encryptedContent,
        });

        // Parse the decrypted content
        // The decrypted content is base64 encoded JSON
        const jsonString = decodeURIComponent(escape(atob(decrypted)));
        const parsedContent = JSON.parse(jsonString);

        setDecryptedContent(parsedContent);
        setDecryptionFailed(false);
      } catch (error: any) {
        console.error('Failed to decrypt article content:', error);
        setDecryptionFailed(true);

        // Set user-friendly error message
        if (
          error?.message?.includes('No group key found') ||
          error?.message?.includes('not a member')
        ) {
          setDecryptionError(
            'You are not a member of this subscription group.'
          );
        } else {
          setDecryptionError(
            'Failed to decrypt content. You may not have access to this group.'
          );
        }
      } finally {
        setIsDecrypting(false);
      }
    };

    attemptDecryption();
  }, [article?.encryptedContent, article?.groupId]);

  return {
    decryptedContent,
    isDecrypting,
    decryptionFailed,
    decryptionError,
  };
}
