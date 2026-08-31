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

export function getSignatureUrl(className: string, sectionName?: string | null): string {
    const normalizedClass = normalizeClassName(className);
    const normalizedSection = sectionName ? sectionName.trim().toLowerCase() : '';
    
    let publicId = normalizedClass;
    if (normalizedClass !== 'principal') {
        publicId = normalizedSection ? `class_${normalizedClass}_${normalizedSection}` : `class_${normalizedClass}`;
    }

    // Use Cloudinary if configured
    if (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        return `https://res.cloudinary.com/${cloudName}/image/upload/signatures/${publicId}.png`;
    }

    // Fallback to local storage
    const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const baseUrl = rawBaseUrl.replace(/\/$/, '');
    const isLocalBaseUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(baseUrl);
    const prefix = baseUrl && !isLocalBaseUrl ? baseUrl : '';

    if (normalizedClass === 'principal') {
        return `${prefix}/signatures/principal.png`;
    }

    if (normalizedClass) {
        return `${prefix}/signatures/${publicId}.png`;
    }

    // Default to principal if class cannot be determined
    return `${prefix}/signatures/principal.png`;
}
