import { vi } from 'vitest';

// React Native's Metro bundler injects this global; vitest runs in plain Node/jsdom
// so anything imported at module scope that reads __DEV__ (e.g. data/supabaseClient.tsx)
// throws ReferenceError without it.
(global as any).__DEV__ = true;

// Mock Local Storage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock AsyncStorage for React Native
vi.mock('@react-native-async-storage/async-storage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  getAllKeys: vi.fn(),
  multiGet: vi.fn(),
  multiSet: vi.fn(),
  multiRemove: vi.fn(),
}));

// Mock Notification API
Object.defineProperty(window, 'Notification', {
  value: vi.fn().mockImplementation(() => ({
    close: vi.fn(),
  })),
  writable: true,
});

Object.defineProperty(window.Notification, 'permission', {
  value: 'default',
  writable: true,
});

Object.defineProperty(window.Notification, 'requestPermission', {
  value: vi.fn().mockResolvedValue('granted'),
  writable: true,
});

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  value: vi.fn().mockReturnValue('blob:mock-url'),
  writable: true,
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
});

// Mock document.createElement for calendar download
Object.defineProperty(document, 'createElement', {
  value: vi.fn().mockImplementation((tagName) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        click: vi.fn(),
      };
    }
    return {};
  }),
  writable: true,
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  },
  writable: true,
});

// Mock Blob constructor
global.Blob = vi.fn().mockImplementation((content, options) => ({
  size: content[0].length,
  type: options?.type || 'text/plain',
}));

// Mock crypto for hashing
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
  writable: true,
});

// Mock TextEncoder
global.TextEncoder = vi.fn().mockImplementation(() => ({
  encode: vi.fn().mockReturnValue(new Uint8Array()),
}));

// Mock Date.now for consistent testing
const mockDate = new Date('2024-01-15T10:00:00Z');
vi.setSystemTime(mockDate);
