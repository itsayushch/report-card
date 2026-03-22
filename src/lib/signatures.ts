// Generate signature URLs for class teachers and principal. Signatures live under public/signatures/class_[1-10].png
function normalizeClassName(className: string): string {
    if (!className) return '';
    const trimmed = className.trim().toLowerCase();
    if (trimmed === 'principal') return 'principal';

    // Prefer numeric in string (e.g., "Class 5", "5A")
    const digitMatch = className.match(/\d+/);
    if (digitMatch) return digitMatch[0];

    // Handle simple Roman numerals I-X
    const romanToNumber: Record<string, string> = {
        i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10'
    };
    return romanToNumber[trimmed] || '';
}

export function getSignatureUrl(className: string): string {
    const normalized = normalizeClassName(className);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';

    if (normalized === 'principal') {
        return `${baseUrl}/signatures/principal.png`;
    }

    if (normalized) {
        return `${baseUrl}/signatures/class_${normalized}.png`;
    }

    // Default to principal if class cannot be determined
    return `${baseUrl}/signatures/principal.png`;
}
