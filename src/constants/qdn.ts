// QDN constants for Perennial
export const SERVICE_DOCUMENT = 'DOCUMENT';
export const SERVICE_VIDEO = 'VIDEO';
export const SERVICE_AUDIO = 'AUDIO';
export const SERVICE_FILE = 'FILE';

// List identifiers
export const LIST_ARTICLES_FEED = 'LIST_ARTICLES_FEED';

// Quitter (Qortal social) identifiers
// These are used by Qortal's "Quitter" app for posts/replies/reposts.
export const ENTITY_ROOT = 'ROOT';
export const ENTITY_POST = 'POST';
export const ENTITY_REPLY = 'REPLY';
export const ENTITY_REPLY_PRIVATE = 'REPLY_PRIVATE';
export const ENTITY_REPOST = 'REPOST';
export const LIST_POSTS_FEED = 'LIST_POSTS_FEED';
export const LIST_POSTS_FEED_FOLLOWING_SUB = 'LIST_POSTS_FEED_FOLLOWING_SUB';
export const GROUP_PRIVATE = 'GROUP_PRIVATE';
export const GROUP_VIDEO_PRIVATE = 'GROUP_VIDEO_PRIVATE';

// Video publishing constants
export const useTestIdentifiers = true;

export const QTUBE_VIDEO_BASE = useTestIdentifiers
  ? 'MYTEST3_vid_'
  : 'qtube_vid_';

export const QTUBE_PLAYLIST_BASE = useTestIdentifiers
  ? 'MYTEST3_playlist_'
  : 'qtube_playlist_';
