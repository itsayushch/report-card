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

// Helper to get max marks for each term based on class
export function getTermsForClass(classAssigned: string, termFilter?: string) {
    const classNum = parseInt(classAssigned, 10);
    let terms = classNum >= 6 ? termsListHigher : termsList;
    if (termFilter) {
        terms = terms.filter(term => term.name === termFilter);
    }
    return terms;
}