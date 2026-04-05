export const normalizeIndianPhone = (phone: string): string => {
    const digits = (phone || '').replace(/\D/g, '');

    if (digits.length === 10) {
        return `+91${digits}`;
    }

    if (digits.length === 11 && digits.startsWith('0')) {
        return `+91${digits.slice(1)}`;
    }

    if (digits.length === 12 && digits.startsWith('91')) {
        return `+${digits}`;
    }

    if (phone?.startsWith('+') && digits.length >= 10 && digits.length <= 13) {
        return `+${digits}`;
    }

    throw new Error('Invalid phone number format');
};
