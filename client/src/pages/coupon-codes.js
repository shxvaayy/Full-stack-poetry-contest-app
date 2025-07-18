// Coupon codes configuration
export const IS_FIRST_MONTH = true; // Change this to false for second month onwards

// FREE TIER VISIBILITY CONTROLS
// Set BOTH to false to completely hide the free tier option from all users
export const FREE_ENTRY_ENABLED = true; // Master control for free tier visibility
export const ENABLE_FREE_TIER = true; // Secondary control for free tier availability

// Note: If either FREE_ENTRY_ENABLED or ENABLE_FREE_TIER is false, 
// the free tier will not be visible to users at all

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

// 10% discount codes for all paid tiers (reusable)
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

// 10% discount codes - ONE-TIME USE GLOBALLY (like 100% codes)
// Each code can only be used once by any user, then becomes invalid for everyone
export const RESTRICTED_DISCOUNT_CODES = [
  'ZLY93DKA1T', 'BQC27XRMP8', 'HNF85VZEKQ', 'TRX49MJDSL', 'WPE18UAKOY',
  'XKZ07YGMBD', 'FDN63TOIXV', 'MAQ92BLRZH', 'VJG56EMCUW', 'UYT13PLDXQ',
  'KSD71OWYAG', 'LMF84CZVNB', 'NYJ28RXOQT', 'TBK95DSUEH', 'RXP47GLMJA',
  'VHW39KUBTL', 'QEM60CZNWF', 'ZJA74TQXVP', 'GDT05MRKLE', 'HPY62NXWUB',
  'MCL31QZJRY', 'KXP89VMTLC', 'NWF47ODKJB', 'YRA02MGZTS', 'SHQ80ULVXN',
  'DKT56ZYFOW', 'BQY14LJAVN', 'TXN92KGZCE', 'ZUP37MWFYL', 'HME40RCXAV'
];

// NOTE: All coupon validation and usage tracking is now handled server-side
// through the database. This file only contains configuration constants.
// The validateCouponCode and markCodeAsUsed functions have been removed
// as they were client-side only and posed security risks.