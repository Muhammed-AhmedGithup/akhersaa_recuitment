/**
 * Egyptian National ID parser and validator
 * 14-digit format:
 * C YY MM DD GG SSS X C
 * C: 2 = 1900-1999, 3 = 2000-2099
 * YYMMDD: Birth date
 * GG: Governorate code
 * SSS: Sequence (odd: Male, even: Female)
 */

const GOVERNORATES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج الجمهورية',
};

export interface NationalIdInfo {
  isValid: boolean;
  birthDate?: string;
  age?: number;
  governorate?: string;
  gender?: 'ذكر' | 'أنثى';
}

export function parseEgyptianNationalId(id: string): NationalIdInfo {
  const cleaned = (id || '').trim();
  if (cleaned.length !== 14 || !/^\d{14}$/.test(cleaned)) {
    return { isValid: false };
  }

  const centuryCode = cleaned.charAt(0);
  let century = 1900;
  if (centuryCode === '3') century = 2000;
  else if (centuryCode !== '2') return { isValid: false };

  const year = century + parseInt(cleaned.substring(1, 3), 10);
  const month = parseInt(cleaned.substring(3, 5), 10);
  const day = parseInt(cleaned.substring(5, 7), 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { isValid: false };
  }

  const govCode = cleaned.substring(7, 9);
  const governorate = GOVERNORATES[govCode] || 'غير محدد';

  const genderDigit = parseInt(cleaned.charAt(12), 10);
  const gender: 'ذكر' | 'أنثى' = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى';

  const birthDateObj = new Date(year, month - 1, day);
  const today = new Date();
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const m = today.getMonth() - birthDateObj.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }

  const formattedDate = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

  return {
    isValid: true,
    birthDate: formattedDate,
    age,
    governorate,
    gender,
  };
}
