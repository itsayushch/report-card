// Write a code to generate signature urls based on class teacher of a certain class (signs are saved in public folder)
export function getSignatureUrl(className: string): string {
    const classTeacherSignatures: { [key: string]: string } = {
        '1': '/signatures/class1.png',
        '2': '/signatures/class2.png',
        '3': '/signatures/class3.png',
        '4': '/signatures/class4.png',
        '5': '/signatures/class5.png',
        '6': '/signatures/class6.png',
        '7': '/signatures/class7.png',
        '8': '/signatures/class8.png',
        '9': '/signatures/class9.png',
        '10': '/signatures/class10.png',
        'principal': '/signatures/principal.png',
    };
    return process.env.NEXT_PUBLIC_BASE_URL + (classTeacherSignatures[className] || '/signatures/principal.png');
}
