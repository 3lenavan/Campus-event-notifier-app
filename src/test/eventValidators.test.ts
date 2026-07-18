import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeForModeration, isProfane, validateEventInput, getDefaultDenylist } from '../lib/eventValidators';
import { getLS, setLS } from '../lib/localStorage';
import { getEventPolicy } from '../lib/eventPolicy';

// Mock the dependencies. Rate limits read existing events through
// eventsService.listEvents, so that's what gets mocked — not storage directly.
vi.mock('../lib/localStorage');
vi.mock('../lib/eventPolicy');
vi.mock('../services/eventsService', () => ({
  listEvents: vi.fn(),
}));

const { listEvents } = await import('../services/eventsService');

describe('Event Validators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listEvents).mockResolvedValue([]);
  });

  describe('normalizeForModeration', () => {
    it('should convert to lowercase', () => {
      expect(normalizeForModeration('HELLO WORLD')).toBe('hello world');
    });

    it('should strip accents and diacritics', () => {
      expect(normalizeForModeration('café résumé naïve')).toBe('cafe resume naive');
    });

    it('should replace unicode homoglyphs', () => {
      expect(normalizeForModeration('аpple bаnаnа')).toBe('apple banana');
    });

    it('should normalize leetspeak', () => {
      expect(normalizeForModeration('$h1t 4ppl3 0n3')).toBe('shit apple one');
    });

    it('should handle mixed content', () => {
      expect(normalizeForModeration('H3ll0 W0rld! @ppl3')).toBe('hello world apple');
    });

    it('should remove special characters and normalize spaces', () => {
      expect(normalizeForModeration('Hello!!!   World???')).toBe('hello world');
    });
  });

  describe('isProfane', () => {
    const denylist = ['spam', 'scam', 'fake', 'bot', 'shit', 'damn'];

    it('should detect direct profanity', () => {
      expect(isProfane('This is spam content', denylist)).toBe(true);
      expect(isProfane('This is clean content', denylist)).toBe(false);
    });

    it('should detect leetspeak profanity', () => {
      expect(isProfane('$h1t this is bad', denylist)).toBe(true);
      expect(isProfane('4ppl3 this is good', denylist)).toBe(false);
    });

    it('should detect unicode homoglyph profanity', () => {
      expect(isProfane('аpple is good', denylist)).toBe(false);
      expect(isProfane('$h1t is bad', denylist)).toBe(true);
    });

    it('should detect word boundary matches', () => {
      expect(isProfane('spam is bad', denylist)).toBe(true);
      expect(isProfane('this spam content', denylist)).toBe(true);
      expect(isProfane('antispam is good', denylist)).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isProfane('SPAM content', denylist)).toBe(true);
      expect(isProfane('SpAm content', denylist)).toBe(true);
    });

    it('should handle empty strings', () => {
      expect(isProfane('', denylist)).toBe(false);
    });

    it('should handle empty denylist', () => {
      expect(isProfane('spam content', [])).toBe(false);
    });
  });

  describe('validateEventInput', () => {
    const mockPolicy = {
      enabledGlobal: true,
      enabledByClub: {},
      moderationMode: 'off' as const,
      limits: {
        maxPerClubPerDay: 3,
        userCooldownMinutes: 60,
        allowImages: true,
        maxImageMB: 5,
        maxTitleLen: 100,
        maxDescLen: 500,
      },
    };

    beforeEach(() => {
      vi.mocked(getEventPolicy).mockResolvedValue(mockPolicy);
      vi.mocked(getLS).mockResolvedValue([]);
    });

    describe('Title validation', () => {
      it('should reject empty title', async () => {
        const result = await validateEventInput({
          title: '',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Title is required');
      });

      it('should reject title over limit', async () => {
        const longTitle = 'a'.repeat(101);
        const result = await validateEventInput({
          title: longTitle,
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Title must be 100 characters or less');
      });

      it('should reject profane title', async () => {
        const result = await validateEventInput({
          title: 'This is spam content',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Title contains inappropriate content');
      });

      it('should accept valid title at limit', async () => {
        const titleAtLimit = 'a'.repeat(100);
        const result = await validateEventInput({
          title: titleAtLimit,
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(true);
      });
    });

    describe('Description validation', () => {
      it('should reject empty description', async () => {
        const result = await validateEventInput({
          title: 'Valid title',
          description: '',
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Description is required');
      });

      it('should reject description over limit', async () => {
        const longDesc = 'a'.repeat(501);
        const result = await validateEventInput({
          title: 'Valid title',
          description: longDesc,
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Description must be 500 characters or less');
      });

      it('should reject profane description', async () => {
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'This is $h1t content',
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['shit']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Description contains inappropriate content');
      });
    });

    describe('Location validation', () => {
      it('should reject empty location', async () => {
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: '',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Location is required');
      });

      it('should reject profane location', async () => {
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2024-12-25T14:30:00Z',
          location: 'Spam location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Location contains inappropriate content');
      });
    });

    describe('Date validation', () => {
      it('should reject missing date', async () => {
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Date is required');
      });

      it('should reject invalid date format', async () => {
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: 'invalid-date',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Invalid date format');
      });

      it('should reject past date', async () => {
        const pastDate = '2020-01-01T10:00:00Z';
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: pastDate,
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Event date must be in the future');
      });

      it('should accept future date', async () => {
        const futureDate = '2025-12-25T14:30:00Z';
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: futureDate,
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(true);
      });
    });

    describe('Image validation', () => {
      it('should reject image when not allowed', async () => {
        const policyWithoutImages = { ...mockPolicy, limits: { ...mockPolicy.limits, allowImages: false } };
        vi.mocked(getEventPolicy).mockResolvedValue(policyWithoutImages);

        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2025-12-25T14:30:00Z',
          location: 'Test Location',
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Images are not allowed for events');
      });

      it('should reject wrong MIME type', async () => {
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2025-12-25T14:30:00Z',
          location: 'Test Location',
          image: 'data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Image must be PNG, JPEG, or WebP format');
      });

      it('should reject oversized image', async () => {
        // Create a large base64 string (simulating 6MB image)
        const largeImage = 'data:image/png;base64,' + 'A'.repeat(8 * 1024 * 1024); // ~6MB
        
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2025-12-25T14:30:00Z',
          location: 'Test Location',
          image: largeImage,
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Image size must be 5MB or less');
      });

      it('should accept valid image', async () => {
        const validImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2025-12-25T14:30:00Z',
          location: 'Test Location',
          image: validImage,
        }, 'user123', ['spam']);

        expect(result.ok).toBe(true);
      });
    });

    describe('Rate limits', () => {
      it('should reject when exceeding per-club daily limit', async () => {
        const existingEvents = [
          { id: '1', clubId: 'test-club', createdAt: Date.now() - 1000 },
          { id: '2', clubId: 'test-club', createdAt: Date.now() - 2000 },
          { id: '3', clubId: 'test-club', createdAt: Date.now() - 3000 },
        ];
        vi.mocked(listEvents).mockResolvedValue(existingEvents as any);

        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2025-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Maximum 3 events per club per day allowed');
      });

      it('should reject when user is in cooldown', async () => {
        const userEvents = [
          { id: '1', createdBy: 'user123', createdAt: Date.now() - 30 * 60 * 1000 }, // 30 minutes ago
        ];
        vi.mocked(listEvents).mockResolvedValue(userEvents as any);

        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2025-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Please wait 30 more minutes before creating another event');
      });

      it('should accept when within limits', async () => {
        const existingEvents = [
          { id: '1', clubId: 'test-club', createdAt: Date.now() - 1000 },
        ];
        vi.mocked(listEvents).mockResolvedValue(existingEvents as any);

        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: 'test-club',
          dateISO: '2025-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(true);
      });
    });

    describe('Club ID validation', () => {
      it('should reject missing club ID', async () => {
        const result = await validateEventInput({
          title: 'Valid title',
          description: 'Valid description',
          clubId: '',
          dateISO: '2025-12-25T14:30:00Z',
          location: 'Test Location',
        }, 'user123', ['spam']);

        expect(result.ok).toBe(false);
        expect(result.errors).toContain('Club selection is required');
      });
    });
  });

  describe('getDefaultDenylist', () => {
    it('should return array of default profanity words', () => {
      const denylist = getDefaultDenylist();
      expect(Array.isArray(denylist)).toBe(true);
      expect(denylist.length).toBeGreaterThan(0);
      expect(denylist).toContain('spam');
    });
  });
});
