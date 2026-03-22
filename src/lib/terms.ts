// For Class 1-4
const termsList = [
    { name: '1st Unit Test', maxMarks: 50 },
    { name: 'Mid Term', maxMarks: 50 },
    { name: '2nd Unit Test', maxMarks: 50 },
    { name: 'Final Term', maxMarks: 50 },
];

// For Class 5-10
const termsListHigher = [
    { name: '1st Unit Test', maxMarks: 50},
    { name: 'Mid Term', maxMarks: 100 },
    { name: '2nd Unit Test', maxMarks: 50 },
    { name: 'Final Term', maxMarks: 100 },
];

export function getTermsForClass(classValue: string | number | null | undefined): { name: string; maxMarks: number }[] {
    // Coerce to string so we can handle numbers or other types safely
    const raw = classValue == null ? '' : String(classValue)

    // Extract numeric part from class value (handles "Class 1", "1", "10A", etc.)
    const match = raw.match(/\d+/)
    if (!match) {
        return []
    }

    const numClass = parseInt(match[0], 10)
    if (Number.isNaN(numClass)) return []

    if (numClass >= 1 && numClass <= 4) {
        return termsList
    } else if (numClass >= 5 && numClass <= 10) {
        return termsListHigher
    }

    return []
}

export const allTerms = Array.from(new Set([...termsList, ...termsListHigher].map(term => term.name)));

export function getTermMaxMarks(classValue: string | number | null | undefined, termName: string): number | null {
    const terms = getTermsForClass(classValue)
    const term = terms.find((t) => t.name === termName)
    return term ? term.maxMarks : null
}

