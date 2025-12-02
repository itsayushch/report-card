/**
 * Convert number to Roman numeral
 */
export function toRoman(num: number): string {
  const romanNumerals: [number, string][] = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ]

  let result = ''
  for (const [value, numeral] of romanNumerals) {
    while (num >= value) {
      result += numeral
      num -= value
    }
  }
  return result
}

/**
 * Convert Roman numeral to number
 */
export function fromRoman(roman: string): number {
  const romanMap: { [key: string]: number } = {
    'I': 1,
    'IV': 4,
    'V': 5,
    'IX': 9,
    'X': 10
  }

  let result = 0
  for (let i = 0; i < roman.length; i++) {
    const current = romanMap[roman[i]]
    const next = romanMap[roman[i + 1]]
    if (next && current < next) {
      result -= current
    } else {
      result += current
    }
  }
  return result
}

/**
 * Format class display (converts number to Roman numeral)
 * Examples: "10" -> "X", "9" -> "IX", "5" -> "V"
 */
export function formatClass(classValue: string | number): string {
  const num = typeof classValue === 'string' ? parseInt(classValue) : classValue
  return toRoman(num)
}

/**
 * Parse class value (handles both numeric and Roman numeral inputs)
 */
export function parseClass(classValue: string): number {
  // If it's already a number
  const num = parseInt(classValue)
  if (!isNaN(num)) return num
  
  // Try to parse as Roman numeral
  return fromRoman(classValue.toUpperCase())
}
