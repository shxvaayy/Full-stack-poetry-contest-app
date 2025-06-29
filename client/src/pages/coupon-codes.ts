
export interface CouponCode {
    code: string;
    type: 'free' | 'discount';
    discount?: number;
  }
  
  export const COUPON_CODES: CouponCode[] = [
    // Free tier unlock codes (50 codes)
    { code: 'FREEPASS100', type: 'free' },
    { code: 'WRITORYWINNER', type: 'free' },
    { code: 'WRITORYFREE1', type: 'free' },
    { code: 'WRITORYFREE2', type: 'free' },
    { code: 'WRITORYNEW', type: 'free' },
    { code: 'WRITORY2025', type: 'free' },
    { code: 'WRITORYWELCOME', type: 'free' },
    { code: 'WRITORYGIFT', type: 'free' },
    { code: 'WRITORYLITE', type: 'free' },
    { code: 'WRITORYOPEN', type: 'free' },
    { code: 'FREEROUND25', type: 'free' },
    { code: 'FREEROUND50', type: 'free' },
    { code: 'FREEROUND75', type: 'free' },
    { code: 'FREEROUND100', type: 'free' },
    { code: 'WRITEFORFREE', type: 'free' },
    { code: 'WINWITHWORDS', type: 'free' },
    { code: 'POEMPOWER', type: 'free' },
    { code: 'VERSETICKET', type: 'free' },
    { code: 'MAGICLINES', type: 'free' },
    { code: 'WRITEFREE23', type: 'free' },
    { code: 'PENFREEDOM', type: 'free' },
    { code: 'RHYMESFLY', type: 'free' },
    { code: 'VERSEPASS', type: 'free' },
    { code: 'STANZAWIN', type: 'free' },
    { code: 'LYRICALENTRY', type: 'free' },
    { code: 'FREESONNET', type: 'free' },
    { code: 'HAIKUPASS', type: 'free' },
    { code: 'RHYMERUSH', type: 'free' },
    { code: 'WRITEROFF', type: 'free' },
    { code: 'WITTYCODE', type: 'free' },
    { code: 'STORYGO', type: 'free' },
    { code: 'PROSEGIFT', type: 'free' },
    { code: 'WORDWAVE', type: 'free' },
    { code: 'WRITEFLOW', type: 'free' },
    { code: 'IMAGICODE', type: 'free' },
    { code: 'INKPASS', type: 'free' },
    { code: 'MUSEENTRY', type: 'free' },
    { code: 'WORDBONUS', type: 'free' },
    { code: 'POETWIN', type: 'free' },
    { code: 'LITPASS25', type: 'free' },
    { code: 'CRAFTYWIN', type: 'free' },
    { code: 'PASSIONWRITE', type: 'free' },
    { code: 'INKFREE50', type: 'free' },
    { code: 'LITDISCOUNT', type: 'free' },
    { code: 'VERSESURGE', type: 'free' },
    { code: 'STANZAFREE', type: 'free' },
    { code: 'FREEMUSE', type: 'free' },
    { code: 'WITGATEWAY', type: 'free' },
    { code: 'PENWAY25', type: 'free' },
    { code: 'CRAFTCOUPON', type: 'free' },
  
    // Discount codes (50 codes) - 10% discount
    { code: 'WONWITHINK', type: 'discount', discount: 10 },
    { code: 'LETTERSUNLOCK', type: 'discount', discount: 10 },
    { code: 'FREE2ROUNDS', type: 'discount', discount: 10 },
    { code: 'ROUNDONUS', type: 'discount', discount: 10 },
    { code: 'WRITERGLOW', type: 'discount', discount: 10 },
    { code: 'VERSECODE', type: 'discount', discount: 10 },
    { code: 'PENUP2025', type: 'discount', discount: 10 },
    { code: 'FLOWPASS', type: 'discount', discount: 10 },
    { code: 'RHYMEWIN', type: 'discount', discount: 10 },
    { code: 'WINNERGATE', type: 'discount', discount: 10 },
    { code: 'MUSICALWORDS', type: 'discount', discount: 10 },
    { code: 'WRTYOPEN100', type: 'discount', discount: 10 },
    { code: 'WINNERTICKET', type: 'discount', discount: 10 },
    { code: 'INKSTORM', type: 'discount', discount: 10 },
    { code: 'VERSETOKEN', type: 'discount', discount: 10 },
    { code: 'FREELINES', type: 'discount', discount: 10 },
    { code: 'PENPASS100', type: 'discount', discount: 10 },
    { code: 'LITERARYLOVE', type: 'discount', discount: 10 },
    { code: 'WRITERDOOR', type: 'discount', discount: 10 },
    { code: 'WORDTRAIL', type: 'discount', discount: 10 },
    { code: 'INKSURGE', type: 'discount', discount: 10 },
    { code: 'POETRYPROMO', type: 'discount', discount: 10 },
    { code: 'FREEINK23', type: 'discount', discount: 10 },
    { code: 'WRTYENTRY', type: 'discount', discount: 10 },
    { code: 'MUSECRAFT', type: 'discount', discount: 10 },
    { code: 'WRITEAWAY10', type: 'discount', discount: 10 },
    { code: 'WRTYFEST25', type: 'discount', discount: 10 },
    { code: 'LOVETOWRITE', type: 'discount', discount: 10 },
    { code: 'LYRICLOVE', type: 'discount', discount: 10 },
    { code: 'ARTISTICWIN', type: 'discount', discount: 10 },
    { code: 'VERSELIGHT', type: 'discount', discount: 10 },
    { code: 'MUSETOUCH', type: 'discount', discount: 10 },
    { code: 'CLEANSTANZA', type: 'discount', discount: 10 },
    { code: 'NARRATETICKET', type: 'discount', discount: 10 },
    { code: 'PROSEKEY', type: 'discount', discount: 10 },
    { code: 'WRTYCODE23', type: 'discount', discount: 10 },
    { code: 'POETGATE', type: 'discount', discount: 10 },
    { code: 'PENUNLOCK', type: 'discount', discount: 10 },
    { code: 'INKPULSE', type: 'discount', discount: 10 },
    { code: 'VERSEBEAT', type: 'discount', discount: 10 },
    { code: 'POETICENTRY', type: 'discount', discount: 10 },
    { code: 'WRTYHERO', type: 'discount', discount: 10 },
    { code: 'FREESTANZA', type: 'discount', discount: 10 },
    { code: 'WRTYPOEM10', type: 'discount', discount: 10 },
    { code: 'POETRYGATEWAY', type: 'discount', discount: 10 },
    { code: 'WORDSACCESS', type: 'discount', discount: 10 },
    { code: 'WRITORYCROWN', type: 'discount', discount: 10 },
    { code: 'FREEDRAFT', type: 'discount', discount: 10 },
    { code: 'DREAMWRITE', type: 'discount', discount: 10 },
    { code: 'WRTYPASS50', type: 'discount', discount: 10 },
  ];
  
  export function validateCouponCode(code: string): CouponCode | null {
    const upperCode = code.toUpperCase().trim();
    return COUPON_CODES.find(coupon => coupon.code === upperCode) || null;
  }
  
  export function calculateDiscountedPrice(originalPrice: number, discount: number): number {
    return Math.round(originalPrice * (1 - discount / 100));
  }
  
  // Configuration: Set to false after first month to disable free tier without codes
  export const IS_FIRST_MONTH = true;
  