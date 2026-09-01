export function getSignatureUrl(teacherIdOrPrincipal: string): string {
    if (!teacherIdOrPrincipal) return '';
    
    const isPrincipal = teacherIdOrPrincipal.trim().toLowerCase() === 'principal';
    const publicId = isPrincipal ? 'principal' : `teacher_${teacherIdOrPrincipal}`;

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

    return `${prefix}/signatures/${publicId}.png`;
}
