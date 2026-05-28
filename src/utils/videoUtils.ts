import Compressor from 'compressorjs';

/**
 * Compress an image (base64 or File) using compressorjs
 * @param input - Base64 data URL or File object
 * @returns Compressed base64 data URL
 */
export async function compressImage(input: string | File): Promise<string> {
  // Convert base64 to File if needed
  let file: File;
  if (typeof input === 'string') {
    // Extract base64 data and mime type
    const matches = input.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 data URL');
    }
    const mimeType = matches[1];
    const base64Data = matches[2];

    // Convert base64 to blob
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    file = new File([blob], 'image.webp', { type: mimeType });
  } else {
    file = input;
  }

  // Compress using compressorjs
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      mimeType: 'image/webp',
      success(result) {
        // Convert compressed blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(result);
      },
      error(err) {
        console.error('Compression error:', err);
        reject(err);
      },
    });
  });
}

/**
 * Compress a cover image for profile use
 * Optimized for wide banner images
 * @param input - Base64 data URL or File object
 * @returns Compressed base64 data URL
 */
export async function compressCoverImage(
  input: string | File
): Promise<string> {
  // Convert base64 to File if needed
  let file: File;
  if (typeof input === 'string') {
    // Extract base64 data and mime type
    const matches = input.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 data URL');
    }
    const mimeType = matches[1];
    const base64Data = matches[2];

    // Convert base64 to blob
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    file = new File([blob], 'cover.webp', { type: mimeType });
  } else {
    file = input;
  }

  // Compress using compressorjs with settings optimized for cover images
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 500, // Cover images are typically wide but not tall
      mimeType: 'image/webp',
      success(result) {
        // Convert compressed blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(result);
      },
      error(err) {
        console.error('Cover image compression error:', err);
        reject(err);
      },
    });
  });
}

/**
 * Generate a thumbnail from a video file
 * @param file - The video file
 * @param seekTo - Time in seconds to capture the thumbnail (default: 1)
 * @returns Base64 encoded WebP image
 */
export async function generateVideoThumbnail(
  file: File,
  seekTo: number = 1
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Seek to the specified time
      video.currentTime = Math.min(seekTo, video.duration);
    };

    video.onseeked = () => {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to WebP base64
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(`data:image/webp;base64,${base64}`);
              // Clean up
              URL.revokeObjectURL(video.src);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/webp',
        0.8
      );
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
      URL.revokeObjectURL(video.src);
    };

    // Start loading the video
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Generate 4 frame extracts from a video file using random times per section
 * Divides video into 4 sections and picks a random time from each section
 * @param file - The video file
 * @returns Object with duration and array of 4 base64 encoded WebP images
 */
export async function generateVideoExtracts(
  file: File
): Promise<{ duration: number; extracts: string[] }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const duration = video.duration;

      if (!isFinite(duration)) {
        resolve({ duration: 0, extracts: [] });
        URL.revokeObjectURL(video.src);
        return;
      }

      // Divide duration into 4 sections and pick random time from each
      const section = duration / 4;
      const timestamps: number[] = [];
      for (let i = 0; i < 4; i++) {
        const randomTime = Math.random() * section + i * section;
        timestamps.push(randomTime);
      }

      const captureFrame = async (time: number): Promise<string> => {
        return new Promise((resolveFrame, rejectFrame) => {
          video.currentTime = time;

          video.onseeked = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
              rejectFrame(new Error('Failed to get canvas context'));
              return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolveFrame(`data:image/webp;base64,${base64}`);
                  };
                  reader.onerror = rejectFrame;
                  reader.readAsDataURL(blob);
                } else {
                  rejectFrame(new Error('Failed to create blob'));
                }
              },
              'image/webp',
              0.7
            );
          };
        });
      };

      try {
        const extracts: string[] = [];
        for (const timestamp of timestamps) {
          const extract = await captureFrame(timestamp);
          extracts.push(extract);
        }
        resolve({ duration, extracts });
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
}
type ByteFormat = 'Decimal' | 'Binary';
export function formatBytes(
  bytes: number,
  decimals = 2,
  format: ByteFormat = 'Binary'
) {
  if (bytes === 0) return '0 Bytes';

  const k = format === 'Binary' ? 1024 : 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

