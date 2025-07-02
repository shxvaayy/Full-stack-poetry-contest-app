// Coupon codes configuration
export const IS_FIRST_MONTH = true; // Change this to false for second month onwards

// Free tier control - Set to false to disable free tier for everyone
export const ENABLE_FREE_TIER = true; // Change this to false to disable free tier completely

// Free tier unlock codes (now work as 100% discount on ₹50 tier only)
export const FREE_TIER_CODES = [
  'INKWIN100', 'VERSEGIFT', 'WRITEFREE', 'WRTYGRACE', 'LYRICSPASS',
  'ENTRYBARD', 'QUILLPASS', 'PENJOY100', 'LINESFREE', 'PROSEPERK',
  'STANZAGIFT', 'FREELYRICS', 'RHYMEGRANT', 'SONNETKEY', 'ENTRYVERSE',
  'PASSWRTY1', 'PASSWRTY2', 'GIFTPOEM', 'WORDSOPEN', 'STAGEPASS',
  'LITERUNLOCK', 'PASSINKED', 'WRTYGENIUS', 'UNLOCKINK', 'ENTRYMUSE',
  'WRTYSTAR', 'FREEQUILL', 'PENPASS100', 'POEMKEY', 'WRITEACCESS',
  'PASSFLARE', 'WRITERJOY', 'MUSE100FREE', 'PASSCANTO', 'STANZAOPEN',
  'VERSEUNLOCK', 'QUILLEDPASS', 'FREEMUSE2025', 'WRITYSTREAK', 'RHYMESMILE',
  'PENMIRACLE', 'GIFTOFVERSE', 'LYRICALENTRY', 'WRTYWAVE', 'MUSEDROP',
  'POEMHERO', 'OPENPOETRY', 'FREEVERSE21', 'POETENTRY', 'UNLOCK2025'
];

// 10% discount codes for all paid tiers
export const DISCOUNT_CODES = [
  'FLOWRHYME10', 'VERSETREAT', 'WRITEJOY10', 'CANTODEAL', 'LYRICSPARK',
  'INKSAVER10', 'WRTYBRIGHT', 'PASSPOETRY', 'MUSEDISCOUNT', 'SONNETSAVE',
  'QUILLFALL10', 'PENSPARKLE', 'LINESLOVE10', 'VERSELIGHT', 'RHYMEBOOST',
  'WRITORSAVE', 'PROSEJOY10', 'POETPOWER10', 'WRTYDREAM', 'MUSESAVER10',
  'POEMSTARS', 'WRITERSHADE', 'LYRICLOOT10', 'SONNETBLISS', 'INKBREEZE',
  'VERSECHILL', 'PASSHUES', 'WRITERFEST', 'CANTOFEEL', 'POEMDISCOUNT',
  'MIRACLEMUSE', 'LYRICSTORY10', 'POEMCUP10', 'WRTYFEAST10', 'PASSMIRROR',
  'INKRAYS10', 'WRTYFLY', 'DISCOUNTINK', 'QUILLFLASH', 'WRITGLOW10',
  'FREESHADE10', 'WRTYJUMP', 'BARDGIFT10', 'POETRAYS', 'LIGHTQUILL',
  'RHYMERUSH', 'WRTYSOUL', 'STORYDROP10', 'POETWISH10', 'WRTYWONDER'
];

// Define types for better TypeScript support
interface ValidationResult {
  valid: boolean;
  type?: 'free' | 'discount';
  discount?: number;
  message: string;
}

export function validateCouponCode(code: string, tier: string): ValidationResult {
  const upperCode = code.toUpperCase();
  
  // Check for 100% discount codes (only work on ₹50 tier)
  if (FREE_TIER_CODES.includes(upperCode)) {
    if (tier !== 'single') {
      return { 
        valid: false, 
        message: '100% discount codes only work on the ₹50 tier.' 
      };
    }
    return { 
      valid: true, 
      type: 'free', 
      discount: 100, 
      message: 'Valid 100% discount code! This tier is now free.' 
    };
  }
  
  // Check for 10% discount codes (work on all paid tiers)
  if (DISCOUNT_CODES.includes(upperCode)) {
    return { 
      valid: true, 
      type: 'discount', 
      discount: 10, 
      message: 'Valid discount code! 10% discount applied.' 
    };
  }
  
  return { 
    valid: false, 
    message: 'Invalid coupon code.' 
  };
}

// Note: Used codes are now tracked in database, not in memory
// This function is kept for backward compatibility but not used
export function markCodeAsUsed(code: string): void {
  // This function is deprecated - coupon usage is now tracked in database
  console.log(`⚠️ markCodeAsUsed called for ${code} - this is now handled by database`);
}