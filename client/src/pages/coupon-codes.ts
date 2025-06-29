
// Free tier unlock codes (top 50)
const FREE_CODES = [
    "FREEPASS100", "WRITORYWINNER", "WRITORYFREE1", "WRITORYFREE2", "WRITORYNEW",
    "WRITORY2025", "WRITORYWELCOME", "WRITORYGIFT", "WRITORYLITE", "WRITORYOPEN",
    "FREEROUND25", "FREEROUND50", "FREEROUND75", "FREEROUND100", "WRITEFORFREE",
    "WINWITHWORDS", "POEMPOWER", "VERSETICKET", "MAGICLINES", "WRITEFREE23",
    "PENFREEDOM", "RHYMESFLY", "VERSEPASS", "STANZAWIN", "LYRICALENTRY",
    "FREESONNET", "HAIKUPASS", "RHYMERUSH", "WRITEROFF", "WITTYCODE",
    "STORYGO", "PROSEGIFT", "WORDWAVE", "WRITEFLOW", "IMAGICODE",
    "INKPASS", "MUSEENTRY", "WORDBONUS", "POETWIN", "LITPASS25",
    "CRAFTYWIN", "PASSIONWRITE", "INKFREE50", "LITDISCOUNT", "VERSESURGE",
    "STANZAFREE", "FREEMUSE", "WITGATEWAY", "PENWAY25", "CRAFTCOUPON"
  ];
  
  // Discount codes (bottom 50) - 10% discount
  const DISCOUNT_CODES = [
    "WONWITHINK", "LETTERSUNLOCK", "FREE2ROUNDS", "ROUNDONUS", "WRITERGLOW",
    "VERSECODE", "PENUP2025", "FLOWPASS", "RHYMEWIN", "WINNERGATE",
    "MUSICALWORDS", "WRTYOPEN100", "WINNERTICKET", "INKSTORM", "VERSETOKEN",
    "FREELINES", "PENPASS100", "LITERARYLOVE", "WRITERDOOR", "WORDTRAIL",
    "INKSURGE", "POETRYPROMO", "FREEINK23", "WRTYENTRY", "MUSECRAFT",
    "WRITEAWAY10", "WRTYFEST25", "LOVETOWRITE", "LYRICLOVE", "ARTISTICWIN",
    "VERSELIGHT", "MUSETOUCH", "CLEANSTANZA", "NARRATETICKET", "PROSEKEY",
    "WRTYCODE23", "POETGATE", "PENUNLOCK", "INKPULSE", "VERSEBEAT",
    "POETICENTRY", "WRTYHERO", "FREESTANZA", "WRTYPOEM10", "POETRYGATEWAY",
    "WORDSACCESS", "WRITORYCROWN", "FREEDRAFT", "DREAMWRITE", "WRTYPASS50"
  ];
  
  export const validateCouponCode = (code: string): { isValid: boolean; type: 'free' | 'discount' | null; discountPercentage?: number } => {
    const upperCode = code.toUpperCase().trim();
    
    if (FREE_CODES.includes(upperCode)) {
      return { isValid: true, type: 'free' };
    }
    
    if (DISCOUNT_CODES.includes(upperCode)) {
      return { isValid: true, type: 'discount', discountPercentage: 10 };
    }
    
    return { isValid: false, type: null };
  };
  
  export const calculateDiscountAmount = (originalAmount: number, discountPercentage: number): number => {
    return Math.round(originalAmount * (discountPercentage / 100));
  };
  