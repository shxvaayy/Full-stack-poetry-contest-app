// Coupon codes configuration
export const IS_FIRST_MONTH = false; // Change this to false for second month onwards
export const FREE_ENTRY_ENABLED = false; // Set to false to disable free entry tier completely

// Free tier control - Set to false to disable free tier for everyone
export const ENABLE_FREE_TIER = false; // Change this to false to disable free tier completely

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

// NOTE: All coupon validation and usage tracking is now handled server-side
// through the database. This file only contains configuration constants.
// The validateCouponCode and markCodeAsUsed functions have been removed
// as they were client-side only and posed security risks.