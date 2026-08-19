import { UserProfile } from '../types.ts';

export const PRESET_COLORS = [
  '#1e1b4b', // Deep Indigo
  '#0f172a', // Slate Dark
  '#6366f1', // Indigo Primary
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald Green
  '#eab308', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#ffffff', // White
  '#27272a', // Zinc Dark
  '#3f3f46', // Zinc Gray
  '#000000', // Pure Black
];

export const STICKY_COLORS = [
  { fill: '#fef08a', stroke: '#facc15', text: '#854d0e', name: '經典黃' },
  { fill: '#bbf7d0', stroke: '#86efac', text: '#166534', name: '清新綠' },
  { fill: '#bae6fd', stroke: '#7dd3fc', text: '#075985', name: '天空藍' },
  { fill: '#fbcfe8', stroke: '#f472b6', text: '#9d174d', name: '粉嫩紅' },
  { fill: '#ddd6fe', stroke: '#c4b5fd', text: '#5b21b6', name: '薰衣草紫' },
  { fill: '#fed7aa', stroke: '#fb923c', text: '#9a3412', name: '暖心橙' },
];

export const USER_PALETTES = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#14b8a6', // Teal
];

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'user_kevin',
    name: 'Kevin (Owner)',
    email: 'kevin820422@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    color: '#6366f1',
  },
  {
    id: 'user_alex',
    name: 'Alex UI/UX',
    email: 'alex.designer@cloudflare-d1.app',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    color: '#ec4899',
  },
  {
    id: 'user_emma',
    name: 'Emma Cloud Arch',
    email: 'emma.edge@workers.dev',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    color: '#10b981',
  },
  {
    id: 'user_developer',
    name: 'Full-stack Dev',
    email: 'dev@cloudflare-r2.io',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    color: '#f59e0b',
  },
];
