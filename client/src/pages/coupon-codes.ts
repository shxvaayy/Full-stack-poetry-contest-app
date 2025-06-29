
// Coupon codes configuration
export const IS_FIRST_MONTH = false; // Change this to false for second month onwards

// Free tier unlock codes (top 50) - these unlock the Free Entry form
export const FREE_TIER_CODES = [
  "FREEPASS100", "WRITORYWINNER", "WRITORYFREE1", "WRITORYFREE2", "WRITORYNEW",
  "WRITORY2025", "WRITORYWELCOME", "POETRYFREE", "WINNERFREE", "WRITORVIP",
  "FREEENTRY1", "FREEENTRY2", "FREEENTRY3", "FREEENTRY4", "FREEENTRY5",
  "UNLOCKFREE", "FREECODE1", "FREECODE2", "FREECODE3", "FREECODE4",
  "WRITORYFREE5", "WRITORYFREE6", "WRITORYFREE7", "WRITORYFREE8", "WRITORYFREE9",
  "POETRYWIN1", "POETRYWIN2", "POETRYWIN3", "POETRYWIN4", "POETRYWIN5",
  "CHAMPION1", "CHAMPION2", "CHAMPION3", "CHAMPION4", "CHAMPION5",
  "WINNER2025", "FREEVIP1", "FREEVIP2", "FREEVIP3", "FREEVIP4",
  "UNLOCK1", "UNLOCK2", "UNLOCK3", "UNLOCK4", "UNLOCK5",
  "WRITORYFREE10", "WRITORYFREE11", "WRITORYFREE12", "WRITORYFREE13", "WRITORYFREE14",
  "WRITORYFREE15", "WRITORYFREE16", "WRITORYFREE17", "WRITORYFREE18", "WRITORYFREE19"
];

// Discount codes (bottom 50) - these provide 10% discount on paid tiers
export const DISCOUNT_CODES = [
  "POEMDEAL50", "DISCOUNT10", "SAVE10", "POETRY10", "WRITORY10",
  "DEAL2025", "OFFER10", "SPECIAL10", "SAVE2025", "DISCOUNT1",
  "DISCOUNT2", "DISCOUNT3", "DISCOUNT4", "DISCOUNT5", "DISCOUNT6",
  "DEAL1", "DEAL2", "DEAL3", "DEAL4", "DEAL5",
  "OFFER1", "OFFER2", "OFFER3", "OFFER4", "OFFER5",
  "SAVE1", "SAVE2", "SAVE3", "SAVE4", "SAVE5",
  "POETRY1", "POETRY2", "POETRY3", "POETRY4", "POETRY5",
  "WRITORY1", "WRITORY2", "WRITORY3", "WRITORY4", "WRITORY5",
  "SPECIAL1", "SPECIAL2", "SPECIAL3", "SPECIAL4", "SPECIAL5",
  "CODE10A", "CODE10B", "CODE10C", "CODE10D", "CODE10E",
  "SAVE10A", "SAVE10B", "SAVE10C", "SAVE10D", "SAVE10E"
];

// Used codes storage (in real app, this should be stored in database)
let usedCodes: string[] = [];

export function validateCouponCode(code: string): { 
  isValid: boolean; 
  type: 'free' | 'discount' | null; 
  discount?: number;
  message: string;
} {
  const upperCode = code.toUpperCase();
  
  // Check if code is already used
  if (usedCodes.includes(upperCode)) {
    return {
      isValid: false,
      type: null,
      message: "This coupon code has already been used."
    };
  }
  
  // Check free tier codes
  if (FREE_TIER_CODES.includes(upperCode)) {
    return {
      isValid: true,
      type: 'free',
      message: "Valid free tier unlock code! You can now submit for free."
    };
  }
  
  // Check discount codes
  if (DISCOUNT_CODES.includes(upperCode)) {
    return {
      isValid: true,
      type: 'discount',
      discount: 10,
      message: "Valid discount code! 10% discount applied."
    };
  }
  
  return {
    isValid: false,
    type: null,
    message: "Invalid coupon code. Please check and try again."
  };
}

export function markCodeAsUsed(code: string): void {
  const upperCode = code.toUpperCase();
  if (!usedCodes.includes(upperCode)) {
    usedCodes.push(upperCode);
  }
}

export function getUsedCodes(): string[] {
  return [...usedCodes];
}