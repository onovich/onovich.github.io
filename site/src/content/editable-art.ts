import rawAnimations from './gifs.json';
import rawGraphics from './graphics.json';
import rawIllustrations from './illustrations.json';
import rawPixel from './pixel.json';
import { editorText } from './editor';

type ArtItem = {
  id: string;
  title?: string;
  year?: string;
};

function withEditableText<T extends ArtItem>(items: readonly T[], collection: string): T[] {
  return items.map(item => ({
    ...item,
    ...(typeof item.title === 'string'
      ? { title: editorText(`art.${collection}.${item.id}.title`, item.title) }
      : {}),
    ...(typeof item.year === 'string'
      ? { year: editorText(`art.${collection}.${item.id}.year`, item.year) }
      : {}),
  }));
}

export const pixel = withEditableText(rawPixel, 'pixel');
export const illustrations = withEditableText(rawIllustrations, 'illustration');
export const animations = withEditableText(rawAnimations, 'animation');
export const graphics = withEditableText(rawGraphics, 'graphic');
