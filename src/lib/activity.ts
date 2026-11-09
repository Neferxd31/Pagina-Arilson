export type ActivityAction =
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'order.confirmed'
  | 'order.cancelled'
  | 'images.cleanup';

const ACTION_LABELS: Record<ActivityAction, string> = {
  'product.create': 'Creó el producto',
  'product.update': 'Editó el producto',
  'product.delete': 'Eliminó el producto',
  'category.create': 'Creó la categoría',
  'category.update': 'Editó la categoría',
  'category.delete': 'Eliminó la categoría',
  'order.confirmed': 'Confirmó el pedido',
  'order.cancelled': 'Canceló el pedido',
  'images.cleanup': 'Limpió fotos sin usar',
};

export function describeActivity(action: string): string {
  return ACTION_LABELS[action as ActivityAction] ?? action;
}
