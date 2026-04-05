import { normalizeIndianPhone } from '../phone';

describe('normalizeIndianPhone', () => {
    it('normalizes plain 10-digit number', () => {
        expect(normalizeIndianPhone('9876543210')).toBe('+919876543210');
    });

    it('normalizes number with leading zero', () => {
        expect(normalizeIndianPhone('09876543210')).toBe('+919876543210');
    });

    it('keeps +91 formatted number', () => {
        expect(normalizeIndianPhone('+91 98765 43210')).toBe('+919876543210');
    });

    it('throws for invalid numbers', () => {
        expect(() => normalizeIndianPhone('123')).toThrow('Invalid phone number format');
    });
});
