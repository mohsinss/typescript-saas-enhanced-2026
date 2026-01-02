// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.NEXTAUTH_SECRET = 'test-secret-for-testing-only-32-characters-long';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next-Auth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getServerSession: jest.fn(),
}));

// Suppress console during tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};
