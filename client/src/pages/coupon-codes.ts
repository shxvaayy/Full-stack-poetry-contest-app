
// Coupon configuration
export const IS_FIRST_MONTH = true; // Change to false for second month onwards

export interface CouponCode {
  code: string;
  type: 'free_unlock' | 'discount';
  discountPercent?: number;
  applicableTiers?: string[];
  used?: boolean;
}

export const COUPON_CODES: CouponCode[] = [
  // 100% discount codes (only for ₹50 tier)
  { code: "FREEPASS100", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYWINNER", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE1", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE2", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE3", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE4", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE5", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE6", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE7", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE8", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE9", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE10", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE11", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE12", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE13", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE14", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE15", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE16", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE17", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE18", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE19", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE20", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE21", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE22", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE23", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE24", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  { code: "WRITORYFREE25", type: "discount", discountPercent: 100, applicableTiers: ["single"] },
  
  // Free tier unlock codes (for when free form is disabled)
  { code: "FREEUNLOCK1", type: "free_unlock" },
  { code: "FREEUNLOCK2", type: "free_unlock" },
  { code: "FREEUNLOCK3", type: "free_unlock" },
  { code: "FREEUNLOCK4", type: "free_unlock" },
  { code: "FREEUNLOCK5", type: "free_unlock" },
  { code: "FREEUNLOCK6", type: "free_unlock" },
  { code: "FREEUNLOCK7", type: "free_unlock" },
  { code: "FREEUNLOCK8", type: "free_unlock" },
  { code: "FREEUNLOCK9", type: "free_unlock" },
  { code: "FREEUNLOCK10", type: "free_unlock" },
  { code: "FREEUNLOCK11", type: "free_unlock" },
  { code: "FREEUNLOCK12", type: "free_unlock" },
  { code: "FREEUNLOCK13", type: "free_unlock" },
  { code: "FREEUNLOCK14", type: "free_unlock" },
  { code: "FREEUNLOCK15", type: "free_unlock" },
  { code: "FREEUNLOCK16", type: "free_unlock" },
  { code: "FREEUNLOCK17", type: "free_unlock" },
  { code: "FREEUNLOCK18", type: "free_unlock" },
  { code: "FREEUNLOCK19", type: "free_unlock" },
  { code: "FREEUNLOCK20", type: "free_unlock" },
  { code: "FREEUNLOCK21", type: "free_unlock" },
  { code: "FREEUNLOCK22", type: "free_unlock" },
  { code: "FREEUNLOCK23", type: "free_unlock" },
  { code: "FREEUNLOCK24", type: "free_unlock" },
  { code: "FREEUNLOCK25", type: "free_unlock" },
  
  // 10% discount codes (applicable to all paid tiers)
  { code: "WRITER10", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "POETRY10", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "CONTEST10", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10A", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10B", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10C", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10D", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10E", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10F", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10G", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10H", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10I", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10J", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10K", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10L", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10M", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10N", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10O", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10P", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10Q", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10R", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10S", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10T", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10U", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10V", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] },
  { code: "WRITORY10W", type: "discount", discountPercent: 10, applicableTiers: ["single", "double", "triple"] }
];

// Used coupon codes tracking (in production, this should be stored in database)
export const USED_COUPON_CODES: Set<string> = new Set();

export function validateCouponCode(code: string, tier: string): { valid: boolean; message: string; discount?: number; unlocksFree?: boolean } {
  const upperCode = code.toUpperCase();
  
  // Check if code was already used
  if (USED_COUPON_CODES.has(upperCode)) {
    return { valid: false, message: "This coupon code has already been used." };
  }
  
  const coupon = COUPON_CODES.find(c => c.code === upperCode);
  
  if (!coupon) {
    return { valid: false, message: "Invalid coupon code." };
  }
  
  if (coupon.type === 'free_unlock') {
    return { valid: true, message: "Free tier unlocked!", unlocksFree: true };
  }
  
  if (coupon.type === 'discount') {
    if (coupon.applicableTiers && !coupon.applicableTiers.includes(tier)) {
      return { valid: false, message: `This coupon is not applicable to the ${tier} tier.` };
    }
    
    return { 
      valid: true, 
      message: `${coupon.discountPercent}% discount applied!`, 
      discount: coupon.discountPercent 
    };
  }
  
  return { valid: false, message: "Invalid coupon code." };
}

export function markCouponAsUsed(code: string): void {
  USED_COUPON_CODES.add(code.toUpperCase());
}
