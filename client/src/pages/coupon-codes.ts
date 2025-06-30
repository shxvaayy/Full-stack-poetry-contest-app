
// Coupon codes configuration
export const IS_FIRST_MONTH = true; // Change this to false for second month onwards

// Free tier unlock codes (now work as 100% discount on ₹50 tier only)
export const FREE_TIER_CODES = [
  'FREEPASS100', 'WRITORYWINNER', 'WRITORYFREE1', 'WRITORYFREE2', 'WRITORYNEW',
  'WRITORY2025', 'WRITORYWELCOM', 'WRITORYFIRST', 'WRITORYSTART', 'FREEENTRY1',
  'FREEENTRY2', 'FREEENTRY3', 'FREEENTRY4', 'FREEENTRY5', 'WRITORYFREE6',
  'WRITORYFREE7', 'WRITORYFREE8', 'WRITORYFREE9', 'WRITORYFREE10', 'WRITORYFREE11',
  'WRITORYFREE12', 'WRITORYFREE13', 'WRITORYFREE14', 'WRITORYFREE15', 'WRITORYFREE16',
  'WRITORYFREE17', 'WRITORYFREE18', 'WRITORYFREE19', 'WRITORYFREE20', 'WRITORYFREE21',
  'WRITORYFREE22', 'WRITORYFREE23', 'WRITORYFREE24', 'WRITORYFREE25', 'WRITORYFREE26',
  'WRITORYFREE27', 'WRITORYFREE28', 'WRITORYFREE29', 'WRITORYFREE30', 'WRITORYFREE31',
  'WRITORYFREE32', 'WRITORYFREE33', 'WRITORYFREE34', 'WRITORYFREE35', 'WRITORYFREE36',
  'WRITORYFREE37', 'WRITORYFREE38', 'WRITORYFREE39', 'WRITORYFREE40', 'WRITORYFREE41',
  'WRITORYFREE42', 'WRITORYFREE43', 'WRITORYFREE44', 'WRITORYFREE45', 'WRITORYFREE46',
  'WRITORYFREE47', 'WRITORYFREE48', 'WRITORYFREE49', 'WRITORYFREE50'
];

// 10% discount codes for all paid tiers
export const DISCOUNT_CODES = [
  'POEMDEAL50', 'POETRY10', 'WRITER10', 'VERSE10', 'RHYME10',
  'DISCOUNT1', 'DISCOUNT2', 'DISCOUNT3', 'DISCOUNT4', 'DISCOUNT5',
  'DISCOUNT6', 'DISCOUNT7', 'DISCOUNT8', 'DISCOUNT9', 'DISCOUNT10',
  'DISCOUNT11', 'DISCOUNT12', 'DISCOUNT13', 'DISCOUNT14', 'DISCOUNT15',
  'DISCOUNT16', 'DISCOUNT17', 'DISCOUNT18', 'DISCOUNT19', 'DISCOUNT20',
  'DISCOUNT21', 'DISCOUNT22', 'DISCOUNT23', 'DISCOUNT24', 'DISCOUNT25',
  'DISCOUNT26', 'DISCOUNT27', 'DISCOUNT28', 'DISCOUNT29', 'DISCOUNT30',
  'DISCOUNT31', 'DISCOUNT32', 'DISCOUNT33', 'DISCOUNT34', 'DISCOUNT35',
  'DISCOUNT36', 'DISCOUNT37', 'DISCOUNT38', 'DISCOUNT39', 'DISCOUNT40',
  'DISCOUNT41', 'DISCOUNT42', 'DISCOUNT43', 'DISCOUNT44', 'DISCOUNT45',
  'DISCOUNT46', 'DISCOUNT47', 'DISCOUNT48', 'DISCOUNT49', 'DISCOUNT50'
];

// Used codes storage (in production, this should be stored in database)
export const USED_CODES = new Set<string>();

export function validateCouponCode(code: string, tier: string): { valid: boolean; type?: 'free' | 'discount'; discount?: number; message?: string } {
  const upperCode = code.toUpperCase();
  
  // Check if code was already used
  if (USED_CODES.has(upperCode)) {
    return { valid: false, message: 'This coupon code has already been used.' };
  }
  
  // Check for 100% discount codes (only work on ₹50 tier)
  if (FREE_TIER_CODES.includes(upperCode)) {
    if (tier !== 'single') {
      return { valid: false, message: '100% discount codes only work on the ₹50 tier.' };
    }
    return { valid: true, type: 'free', discount: 100, message: 'Valid 100% discount code! This tier is now free.' };
  }
  
  // Check for 10% discount codes (work on all paid tiers)
  if (DISCOUNT_CODES.includes(upperCode)) {
    return { valid: true, type: 'discount', discount: 10, message: 'Valid discount code! 10% discount applied.' };
  }
  
  return { valid: false, message: 'Invalid coupon code.' };
}

export function markCodeAsUsed(code: string): void {
  USED_CODES.add(code.toUpperCase());
}
