export interface Category {
  id: string;
  name: string;
  image: string;
  productCount: number;
  slug: string;
  description?: string;
  isActive?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
