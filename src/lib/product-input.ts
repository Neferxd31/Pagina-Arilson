import { asSource, readInteger, readText } from './fields';

export interface VariantInput {
  id: number | null;
  colorName: string;
  colorHex: string;
  imageKey: string;
  stock: number;
}

export interface ProductInput {
  title: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  shortDescription: string;
  howToUse: string;
  specs: string;
  warranty: string;
  videoUrl: string;
  tags: string[];
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  variants: VariantInput[];
}

const MAX_PRICE = 100_000_000;
const MAX_IMAGES = 10;
const MAX_VARIANTS = 20;
const IMAGE_KEY_PATTERN = /^p\/[a-f0-9-]{36}\.jpg$/;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

// categorySlugs are the categories that exist in the database right now
export function validateProductInput(
  body: unknown,
  categorySlugs: string[],
): { ok: true; value: ProductInput } | { ok: false; errors: string[] } {
  const source = asSource(body);
  const errors: string[] = [];

  const title = readText(source, 'title', 'el título', { max: 120, required: true }, errors);
  const category = String(source.category ?? '');
  if (!categorySlugs.includes(category)) errors.push('Elige una categoría válida.');

  const price = readInteger(source, 'price', 'el precio', { min: 1, max: MAX_PRICE }, errors);
  let compareAtPrice: number | null = null;
  if (source.compareAtPrice !== null && source.compareAtPrice !== undefined && source.compareAtPrice !== '') {
    compareAtPrice = readInteger(source, 'compareAtPrice', 'el precio anterior', { min: 1, max: MAX_PRICE }, errors);
    if (compareAtPrice <= price) errors.push('El precio anterior debe ser mayor que el precio actual.');
  }

  const shortDescription = readText(source, 'shortDescription', 'la descripción corta', { max: 300 }, errors);
  const howToUse = readText(source, 'howToUse', 'el texto de para qué sirve', { max: 3000 }, errors);
  const specs = readText(source, 'specs', 'las especificaciones', { max: 3000 }, errors);
  const warranty = readText(source, 'warranty', 'la garantía', { max: 1000 }, errors);

  const videoUrl = readText(source, 'videoUrl', 'el link del video', { max: 300 }, errors);
  if (videoUrl && !videoUrl.startsWith('https://')) errors.push('El link del video debe empezar por https://');

  const tags = readText(source, 'tags', 'las etiquetas', { max: 200 }, errors)
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  const images = Array.isArray(source.images) ? source.images.filter((key): key is string => typeof key === 'string') : [];
  if (images.length > MAX_IMAGES) errors.push(`Máximo ${MAX_IMAGES} fotos por producto.`);
  if (images.some((key) => !IMAGE_KEY_PATTERN.test(key))) errors.push('Hay una foto inválida; vuelve a subirla.');

  const rawVariants = Array.isArray(source.variants) ? source.variants : [];
  if (rawVariants.length === 0) errors.push('Agrega al menos un color (o "Único" si no tiene colores).');
  if (rawVariants.length > MAX_VARIANTS) errors.push(`Máximo ${MAX_VARIANTS} colores por producto.`);

  const variants = rawVariants.slice(0, MAX_VARIANTS).map((rawVariant, index) => {
    const variantSource = asSource(rawVariant);
    const label = `Color ${index + 1}`;
    const colorHex = String(variantSource.colorHex ?? '');
    if (colorHex && !HEX_PATTERN.test(colorHex)) errors.push(`${label}: el tono no es válido.`);

    const imageKey = String(variantSource.imageKey ?? '');
    if (imageKey && !images.includes(imageKey)) errors.push(`${label}: la foto elegida ya no está en el producto.`);

    const rawId = Number(variantSource.id);
    return {
      id: Number.isInteger(rawId) && rawId > 0 ? rawId : null,
      colorName: readText(variantSource, 'colorName', `el nombre del color ${index + 1}`, { max: 40, required: true }, errors),
      colorHex,
      imageKey,
      stock: readInteger(variantSource, 'stock', `el stock del color ${index + 1}`, { min: 0, max: 100_000 }, errors),
    };
  });

  const colorNames = variants.map((variant) => variant.colorName.toLowerCase());
  if (new Set(colorNames).size !== colorNames.length) errors.push('Hay colores repetidos.');

  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] };

  return {
    ok: true,
    value: {
      title,
      category,
      price,
      compareAtPrice,
      shortDescription,
      howToUse,
      specs,
      warranty,
      videoUrl,
      tags,
      images,
      isActive: source.isActive === true,
      isFeatured: source.isFeatured === true,
      isNew: source.isNew === true,
      variants,
    },
  };
}
