/**
 * 媒體路徑工具函數
 * 用於處理 GitHub Pages 等需要 base URL 的部署環境
 */

// 取得 Vite 的 base URL（build 時會自動注入）
const BASE_URL = import.meta.env.BASE_URL || '/';

/**
 * 將相對於 public 資料夾的路徑轉換為完整路徑
 * @param path - 相對路徑，例如 '/media/webp/image.webp'
 * @returns 包含 base URL 的完整路徑
 *
 * @example
 * // 本地開發 (base = '/')
 * getAssetPath('/media/webp/image.webp') => '/media/webp/image.webp'
 *
 * // GitHub Pages (base = '/my-portfolio/')
 * getAssetPath('/media/webp/image.webp') => '/my-portfolio/media/webp/image.webp'
 */
export function getAssetPath(path: string): string {
  // 移除開頭的斜線，避免重複
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // 確保 base URL 結尾有斜線
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  return `${base}${cleanPath}`;
}

/**
 * 批量轉換路徑陣列
 * @param paths - 路徑陣列
 * @returns 轉換後的路徑陣列
 */
export function getAssetPaths(paths: string[]): string[] {
  return paths.map(getAssetPath);
}

/**
 * 取得 base URL
 * @returns Vite 設定的 base URL
 */
export function getBaseUrl(): string {
  return BASE_URL;
}
