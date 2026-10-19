// Productos de ejemplo para la vista previa de diseño en Netlify. Nombres genéricos; textos en lorem
const LOREM_SHORT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const LOREM_LONG =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris.';

interface SampleProduct {
  title: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  featured?: boolean;
  isNew?: boolean;
  colors: [name: string, hex: string, stock: number][];
}

export const SAMPLE_PRODUCTS: SampleProduct[] = [
  {
    title: 'Audífonos inalámbricos',
    category: 'tecnologia-personal',
    price: 89000,
    compareAtPrice: 120000,
    featured: true,
    colors: [
      ['Negro', '#1e1e28', 8],
      ['Blanco', '#f2f2f2', 5],
      ['Azul', '#3c78c8', 0],
    ],
  },
  {
    title: 'Reloj inteligente deportivo',
    category: 'tecnologia-personal',
    price: 149000,
    featured: true,
    isNew: true,
    colors: [
      ['Negro', '#1e1e28', 6],
      ['Rosa', '#f4a7b9', 3],
    ],
  },
  {
    title: 'Parlante bluetooth portátil',
    category: 'tecnologia-personal',
    price: 79000,
    colors: [
      ['Azul', '#3c78c8', 4],
      ['Negro', '#1e1e28', 7],
      ['Rojo', '#c0392b', 2],
    ],
  },
  { title: 'Báscula digital inteligente', category: 'tecnologia-personal', price: 65000, colors: [['Blanco', '#f2f2f2', 0]] },
  {
    title: 'Cargador rápido USB-C',
    category: 'celular',
    price: 45000,
    featured: true,
    colors: [
      ['Blanco', '#f2f2f2', 10],
      ['Negro', '#1e1e28', 6],
    ],
  },
  {
    title: 'Cable trenzado 2 metros',
    category: 'celular',
    price: 25000,
    colors: [
      ['Negro', '#1e1e28', 20],
      ['Rojo', '#c0392b', 0],
    ],
  },
  { title: 'Soporte magnético para carro', category: 'celular', price: 39000, compareAtPrice: 52000, colors: [['Negro', '#1e1e28', 9]] },
  {
    title: 'Power bank 10.000 mAh',
    category: 'celular',
    price: 95000,
    isNew: true,
    colors: [
      ['Negro', '#1e1e28', 5],
      ['Azul', '#3c78c8', 3],
    ],
  },
  { title: 'Lámpara LED recargable', category: 'hogar-oficina', price: 45000, featured: true, colors: [['Único', '#25284a', 12]] },
  { title: 'Organizador de escritorio', category: 'hogar-oficina', price: 35000, isNew: true, colors: [['Único', '#25284a', 7]] },
  {
    title: 'Mini ventilador USB',
    category: 'hogar-oficina',
    price: 32000,
    compareAtPrice: 40000,
    colors: [
      ['Blanco', '#f2f2f2', 6],
      ['Menta', '#a8efe2', 4],
    ],
  },
  {
    title: 'Repisa organizadora para baño',
    category: 'hogar-oficina',
    price: 119000,
    compareAtPrice: 139000,
    featured: true,
    colors: [['Blanco', '#f2f2f2', 3]],
  },
];

export const SAMPLE_TEXT = { short: LOREM_SHORT, long: LOREM_LONG };
