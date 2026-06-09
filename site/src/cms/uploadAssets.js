export const CMS_UPLOAD_PUBLIC_PREFIX = '/images/uploads/';
export const CMS_UPLOAD_PUBLIC_DIR = 'images/uploads';
export const CMS_UPLOAD_TARGET_DIR = 'site/public/images/uploads';

const CMS_UPLOAD_MIME_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export function cmsUploadExtensionForMime(mimeType) {
  return CMS_UPLOAD_MIME_EXTENSIONS.get((mimeType ?? '').toString().toLowerCase()) || '';
}

export function normalizeCmsUploadFileName(value, fallback = 'upload') {
  const base = (value ?? '').toString()
    .replace(/\.[a-z0-9]+$/i, '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || fallback;
}

export function cmsUploadPublicPath({ fileName, id, mimeType }) {
  const extension = cmsUploadExtensionForMime(mimeType);
  if (!extension) return '';
  return `${CMS_UPLOAD_PUBLIC_PREFIX}${normalizeCmsUploadFileName(fileName || id)}.${extension}`;
}

export function cmsUploadTargetPath(src) {
  return (src ?? '').toString().startsWith(CMS_UPLOAD_PUBLIC_PREFIX) ? src.slice(1) : '';
}

export function createCmsUploadAsset({
  fileName,
  mimeType,
  width,
  height,
  size,
  dataUrl,
  alt = '',
  originalUrl = '',
  id = '',
}) {
  const src = cmsUploadPublicPath({ fileName, id, mimeType });
  const assetId = normalizeCmsUploadFileName(id || fileName);
  return normalizeCmsUploadAsset({
    id: assetId,
    src,
    targetPath: cmsUploadTargetPath(src),
    originalUrl,
    width,
    height,
    mimeType,
    alt,
    source: 'upload',
    size,
    dataUrl,
  });
}

export function normalizeCmsUploadAsset(asset) {
  const mimeType = (asset?.mimeType ?? '').toString().toLowerCase();
  const src = asset?.src || cmsUploadPublicPath({
    fileName: asset?.fileName,
    id: asset?.id,
    mimeType,
  });
  const targetPath = asset?.targetPath || cmsUploadTargetPath(src);
  return {
    ...asset,
    id: normalizeCmsUploadFileName(asset?.id || asset?.fileName),
    src,
    targetPath,
    width: Number(asset?.width) || undefined,
    height: Number(asset?.height) || undefined,
    mimeType,
    source: 'upload',
  };
}

export function collectCmsUploadAssets(state) {
  return (state?.assets || [])
    .filter(asset => asset?.source === 'upload' || asset?.src?.startsWith?.(CMS_UPLOAD_PUBLIC_PREFIX))
    .map(normalizeCmsUploadAsset);
}

export function collectCmsUploadAssetIssues(asset, { requireData = false } = {}) {
  const normalized = normalizeCmsUploadAsset(asset);
  const issues = [];
  if (!normalized.id) issues.push({ code: 'upload-asset-id-missing', message: '上传资源缺少 ID' });
  if (!cmsUploadExtensionForMime(normalized.mimeType)) {
    issues.push({ code: 'upload-asset-mime-unsupported', message: `${normalized.id}: 不支持的图片类型 ${normalized.mimeType || '(empty)'}` });
  }
  if (!normalized.src?.startsWith(CMS_UPLOAD_PUBLIC_PREFIX)) {
    issues.push({ code: 'upload-asset-path-invalid', message: `${normalized.id}: 上传资源路径必须在 ${CMS_UPLOAD_PUBLIC_PREFIX} 下` });
  }
  if (!normalized.targetPath?.startsWith(CMS_UPLOAD_PUBLIC_DIR + '/')) {
    issues.push({ code: 'upload-asset-target-invalid', message: `${normalized.id}: 上传资源目标路径必须在 ${CMS_UPLOAD_PUBLIC_DIR}/ 下` });
  }
  if (!normalized.width || !normalized.height) {
    issues.push({ code: 'upload-asset-dimensions-missing', message: `${normalized.id}: 上传资源缺少宽高` });
  }
  if (requireData && !normalized.dataUrl && !normalized.originalUrl) {
    issues.push({ code: 'upload-asset-data-missing', message: `${normalized.id}: 上传资源缺少可发布数据` });
  }
  if (normalized.dataUrl && !normalized.dataUrl.startsWith(`data:${normalized.mimeType};base64,`)) {
    issues.push({ code: 'upload-asset-data-invalid', message: `${normalized.id}: 上传资源 data URL 与 MIME 不匹配` });
  }
  return issues;
}
