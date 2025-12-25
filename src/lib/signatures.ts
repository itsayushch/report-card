// Write a code to generate signature urls based on class teacher of a certain class (signs are saved in public folder)
export function getSignatureUrl(className: string): string {
    const classTeacherSignatures: { [key: string]: string } = {
        '1': '/signatures/class_1.png',
        '2': '/signatures/class_2.png',
        '3': '/signatures/class_3.png',
        '4': '/signatures/class_4.png',
        '5': '/signatures/class_5.png',
        '6': '/signatures/class_6.png',
        '7': '/signatures/class_7.png',
        '8': '/signatures/class_8.png',
        '9': '/signatures/class_9.png',
        '10': '/signatures/class_10.png',
        'principal': '/signatures/principal.png',
    };
    return process.env.NEXT_PUBLIC_BASE_URL + (classTeacherSignatures[className] || '/signatures/principal.png');
}
