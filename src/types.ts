export interface Post {
  id: number;
  title: string;
  type: 'Offer' | 'Request';
  author: string;
  location: string;
  description: string;
  date: string;
  category: string;
}