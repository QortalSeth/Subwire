// QDN constants for Perennial
export const SERVICE_DOCUMENT = 'DOCUMENT';
export const SERVICE_VIDEO = 'VIDEO';
export const SERVICE_AUDIO = 'AUDIO';
export const SERVICE_FILE = 'FILE';

// List identifiers
export const LIST_ARTICLES_FEED = 'LIST_ARTICLES_FEED';

// Video publishing constants
export const useTestIdentifiers = true;

export const QTUBE_VIDEO_BASE = useTestIdentifiers
  ? 'MYTEST3_vid_'
  : 'qtube_vid_';

export const QTUBE_PLAYLIST_BASE = useTestIdentifiers
  ? 'MYTEST3_playlist_'
  : 'qtube_playlist_';
