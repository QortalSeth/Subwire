import { objectToBase64 } from 'qapp-core';
import {
  ENTITY_POST,
  ENTITY_ROOT,
  SERVICE_DOCUMENT,
  useTestIdentifiers,
} from '../constants/qdn';
import { compressImage, fileToBase64 } from './articleQdn';

const quitterAppName = useTestIdentifiers ? 'test-social-2-dev2' : 'quitter';
const quitterPublicSalt = '6hMqDBxky6j1G2wZEHgIiOeApj3x3CP8LQwg0Ok0RVc=';
export interface PublishQuitterPostParams {
  text: string;
  coverImage?: File;
  identifierOperations: any;
  userName: string;
  publishMultipleResources: (resources: any[]) => Promise<any>;
}

export interface QuitterPost {
  text: string;
  timestamp: number;
  name: string;
  images?: Array<{ src: string }>;
}

/**
 * Build a simple announcement text for sharing a Perennial article on Quitter.
 */
export function buildQuitterArticleShareText(params: {
  title: string;
  authorName: string;
  identifier: string;
}): string {
  const title = (params.title || '').trim();
  const articleUrl = `qortal://APP/Perennial/article/${encodeURIComponent(params.authorName)}/${encodeURIComponent(params.identifier)}`;

  const base = `New publication: ${title}`;
  return `${base}\n\n${articleUrl}`.trim();
}

/**
 * Publish a simple text-only post to Quitter (Qortal's twitter-like app).
 *
 * This mirrors the example app's identifier strategy (ENTITY_POST under ENTITY_ROOT),
 * but keeps the payload minimal since we only need a share announcement.
 */
export async function publishQuitterPost({
  text,
  coverImage,
  identifierOperations,
  userName,
  publishMultipleResources,
}: PublishQuitterPostParams): Promise<string> {
  if (!userName)
    throw new Error('A Qortal name is required to publish to Quitter');
  if (!identifierOperations)
    throw new Error('identifierOperations is required');

  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Post text is required');

  const postIdentifier = await identifierOperations.buildIdentifierFromRaw(
    quitterAppName,
    quitterPublicSalt,
    ENTITY_POST,
    ENTITY_ROOT,
    false
  );
  if (!postIdentifier) {
    throw new Error('Failed to create Quitter post identifier');
  }

  const post: QuitterPost = {
    text: trimmed,
    timestamp: Date.now(),
    name: userName,
  };

  // Include cover image as an inline image in the Quitter post (base64, no data URL prefix)
  if (coverImage) {
    const compressed = await compressImage(coverImage, 0.7, 1024);
    const base64 = await fileToBase64(compressed);
    post.images = [{ src: base64 }];
  }

  const postBase64 = await objectToBase64(post);

  await publishMultipleResources([
    {
      identifier: postIdentifier,
      service: SERVICE_DOCUMENT,
      name: userName,
      data64: postBase64,
    },
  ]);

  return postIdentifier;
}
