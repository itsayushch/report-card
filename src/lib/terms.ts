// For Class 1-5
const termsList = [
    { name: '1st Unit Test', maxMarks: 50 },
    { name: 'Mid Term', maxMarks: 50 },
    { name: '2nd Unit Test', maxMarks: 50 },
    { name: 'Final Term', maxMarks: 100 },
];

// For Class 6-10
const termsListHigher = [
    { name: '1st Unit Test', maxMarks: 50},
    { name: 'Mid Term', maxMarks: 100 },
    { name: '2nd Unit Test', maxMarks: 50 },
    { name: 'Final Term', maxMarks: 100 },
];

export function getTermsForClass(classValue: string): { name: string; maxMarks: number }[] {
    const numClass = parseInt(classValue);
    if (numClass >= 1 && numClass <= 5) {
        return termsList;
    } else if (numClass >= 6 && numClass <= 10) {
        return termsListHigher;
    }

    return [];
}  

export const allTerms = Array.from(new Set([...termsList, ...termsListHigher].map(term => term.name)));

export function getTermMaxMarks(classValue: string, termName: string): number | null {
    const terms = getTermsForClass(classValue);
    const term = terms.find(t => t.name === termName);
    return term ? term.maxMarks : null;
}

