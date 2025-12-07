// Class 1 to 5 subjects list
const subjectsList1 = [
  { id: 'ENG-LANG-1', name: "English Language", dataType: "number" },
  { id: 'ENG-LIT-1', name: "English Literature", dataType: "number" },
  { id: 'SEC-LANG-1', name: "Second Language", dataType: "number" },
  { id: 'MATH-1', name: "Mathematics", dataType: "number" },
  { id: 'SCI-1', name: "Science", dataType: "number" },
  { id: 'SOC-STUD-1', name: "Social Studies", dataType: "number" },
  { id: 'HIST-CIV-1', name: "History & Civics", dataType: "number" },
  { id: 'GEOG-1', name: "Geography", dataType: "number" },
  { id: 'COMP-1', name: "Computer", dataType: "number" },
  { id: 'SPELL-DICT-1', name: "Spelling Dictation", dataType: "number" },
  { id: 'GK-1', name: "G.K.", dataType: "number" },

  { id: 'VALUE-FAITH-1', name: "Value / Faith Education", dataType: "string" },
  { id: 'READING-1', name: "Reading", dataType: "string" },
  { id: 'WRITING-1', name: "Writing", dataType: "string" },
  { id: 'RECITATION-1', name: "Recitation", dataType: "string" },
  { id: 'PE-1', name: "P.E.", dataType: "string" },
  { id: 'ART-CRAFT-1', name: "Art / Craft", dataType: "string" },
  { id: 'DRAWING-1', name: "Drawing", dataType: "string" },
  { id: 'SINGING-1', name: "Singing", dataType: "string" },
];

// Class 6 to 8 subjects list
const subjectsList2 = [
  { id: 'ENG-LANG-2', name: "English Language", dataType: "number" },
  { id: 'ENG-LIT-2', name: "English Literature", dataType: "number" },
  { id: 'SEC-LANG-2', name: "Second Language", dataType: "number" },
  { id: 'HIST-CIV-2', name: "History & Civics", dataType: "number" },
  { id: 'GEOG-2', name: "Geography", dataType: "number" },
  { id: 'MATH-2', name: "Mathematics", dataType: "number" },
  { id: 'PHYS-2', name: "Physics", dataType: "number" },
  { id: 'CHEM-2', name: "Chemistry", dataType: "number" },
  { id: 'BIOL-2', name: "Biology", dataType: "number" },
  { id: 'COMP-2', name: "Computer", dataType: "number" },
  { id: 'VALUE-FAITH-2', name: "Value / Faith Education", dataType: "string" },
  { id: 'THIRD-LANG-2', name: "Third Language", dataType: "string" },
  { id: 'GK-2', name: "G.K.", dataType: "string" },
  { id: 'ART-CRAFT-2', name: "Art / Craft", dataType: "string" },
  { id: 'PE-2', name: "P.E.", dataType: "string" }
];

// Class 9 and 10 subjects list
const subjectsList3 = [
  { id: 'ENG-LANG-3', name: "English Language", dataType: "number" },
  { id: 'ENG-LIT-3', name: "English Literature", dataType: "number" },
  { id: 'SEC-LANG-3', name: "Second Language", dataType: "number" },
  { id: 'HIST-CIV-3', name: "History & Civics", dataType: "number" },
  { id: 'GEOG-3', name: "Geography", dataType: "number" },
  { id: 'MATH-3', name: "Mathematics", dataType: "number" },
  { id: 'PHYS-3', name: "Physics", dataType: "number" },
  { id: 'CHEM-3', name: "Chemistry", dataType: "number" },
  { id: 'BIOL-3', name: "Biology", dataType: "number" },
  { id: 'ECO-COMP-3', name: "6 Subjects : Eco Apps / Comp Apps", dataType: "number" },
  { id: 'VALUE-FAITH-3', name: "Value / Faith Education", dataType: "string" },
  { id: 'SUPW-3', name: "S.U.P.W", dataType: "string" },
  { id: 'PE-3', name: "P.E.", dataType: "string" }
];

export const subjectsByClass: { [key: string]: Array<{ id: string; name: string; dataType: string }> } = {
    '1': subjectsList1,
    '2': subjectsList1,
    '3': subjectsList1,
    '4': subjectsList1,
    '5': subjectsList1,
    '6': subjectsList2,
    '7': subjectsList2,
    '8': subjectsList2,
    '9': subjectsList3,
    '10': subjectsList3,
};

// Helper function to get subjects for multiple classes (removes duplicates)
export function getSubjectsForClasses(classes: string[]): Array<{ id: string; name: string; dataType: string }> {
  const subjectsMap = new Map<string, { id: string; name: string; dataType: string }>();
  
  classes.forEach(cls => {
    const subjects = subjectsByClass[cls] || [];
    subjects.forEach(subject => {
      // Use subject name as key to avoid duplicates
      if (!subjectsMap.has(subject.name)) {
        subjectsMap.set(subject.name, subject);
      }
    });
  });
  
  return Array.from(subjectsMap.values());
}

// Helper function to get all unique subject names
export function getAllSubjectNames(): string[] {
  const allSubjects = new Set<string>();
  Object.values(subjectsByClass).forEach(subjects => {
    subjects.forEach(subject => allSubjects.add(subject.name));
  });
  return Array.from(allSubjects);
} 

export function getSubjectById(classAssigned: string, subjectId: string): { id: string; name: string; dataType: string } | null {
  const subjects = subjectsByClass[classAssigned];
  if (!subjects) return null;
  return subjects.find(subj => subj.id === subjectId) || null;
}


