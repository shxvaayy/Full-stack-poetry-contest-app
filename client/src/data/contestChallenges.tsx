
export const contestChallenges = {
    "Theme-Based": [
      {
        contestType: "Theme-Based",
        challengeTitle: "City Nights",
        description: "Write about the city after sunset - the neon lights, quiet streets, and nocturnal energy."
      },
      {
        contestType: "Theme-Based",
        challengeTitle: "Monsoon Dreams",
        description: "Capture the essence of rain, petrichor, and the emotional depth of monsoon season."
      },
      {
        contestType: "Theme-Based",
        challengeTitle: "Digital Age",
        description: "Explore poetry in the age of smartphones, social media, and virtual connections."
      },
      {
        contestType: "Theme-Based",
        challengeTitle: "Heritage Echoes",
        description: "Write about traditions, ancestral wisdom, and cultural heritage."
      },
      {
        contestType: "Theme-Based",
        challengeTitle: "Silent Moments",
        description: "Find poetry in quiet moments, solitude, and inner reflection."
      },
      {
        contestType: "Theme-Based",
        challengeTitle: "Journey Within",
        description: "Explore self-discovery, personal growth, and inner transformation."
      },
      {
        contestType: "Theme-Based",
        challengeTitle: "Nature's Canvas",
        description: "Paint with words the beauty of landscapes, seasons, and natural wonders."
      },
      {
        contestType: "Theme-Based",
        challengeTitle: "Time's Passage",
        description: "Reflect on the flow of time, memories, and life's transitions."
      }
    ],
    "Constraint-Based": [
      {
        contestType: "Constraint-Based",
        challengeTitle: "Acrostic Adventure",
        description: "Write a poem where the first letter of each line spells out a word."
      },
      {
        contestType: "Constraint-Based",
        challengeTitle: "Palindrome Poetry",
        description: "Create verses that read the same forwards and backwards."
      },
      {
        contestType: "Constraint-Based",
        challengeTitle: "No Letter E",
        description: "Write a complete poem without using the letter 'E'."
      },
      {
        contestType: "Constraint-Based",
        challengeTitle: "One Syllable Only",
        description: "Craft a poem using only one-syllable words."
      },
      {
        contestType: "Constraint-Based",
        challengeTitle: "Reverse Rhyme",
        description: "Start with the last line and work backwards, maintaining flow."
      },
      {
        contestType: "Constraint-Based",
        challengeTitle: "Color Constraint",
        description: "Every line must contain a color, weaving them into meaningful verse."
      },
      {
        contestType: "Constraint-Based",
        challengeTitle: "Number Game",
        description: "Include numbers in ascending or descending order throughout the poem."
      },
      {
        contestType: "Constraint-Based",
        challengeTitle: "Three Word Lines",
        description: "Each line must contain exactly three words, no more, no less."
      }
    ],
    "Form-Based": [
      {
        contestType: "Form-Based",
        challengeTitle: "Classic Sonnet",
        description: "Write a traditional 14-line sonnet with proper rhyme scheme."
      },
      {
        contestType: "Form-Based",
        challengeTitle: "Haiku Trilogy",
        description: "Create three connected haikus that tell a complete story."
      },
      {
        contestType: "Form-Based",
        challengeTitle: "Villanelle Challenge",
        description: "Master the villanelle form with its intricate repetition pattern."
      },
      {
        contestType: "Form-Based",
        challengeTitle: "Free Verse Freedom",
        description: "Break all rules and create powerful free verse poetry."
      },
      {
        contestType: "Form-Based",
        challengeTitle: "Ghazal Glory",
        description: "Write a traditional ghazal with proper radif and qafia."
      },
      {
        contestType: "Form-Based",
        challengeTitle: "Limerick Laughter",
        description: "Craft humorous or witty limericks with perfect AABBA rhyme."
      },
      {
        contestType: "Form-Based",
        challengeTitle: "Concrete Poetry",
        description: "Create visual poetry where the shape enhances the meaning."
      },
      {
        contestType: "Form-Based",
        challengeTitle: "Cinquain Cascade",
        description: "Write multiple cinquains that flow into each other."
      }
    ],
    "Prompt-Based": [
      {
        contestType: "Prompt-Based",
        challengeTitle: "Last Person on Earth",
        description: "You are the last person alive. Write about your final day."
      },
      {
        contestType: "Prompt-Based",
        challengeTitle: "Conversation with Past Self",
        description: "What would you tell your 10-year-old self? Write as dialogue."
      },
      {
        contestType: "Prompt-Based",
        challengeTitle: "Object's Perspective",
        description: "Write from the viewpoint of an everyday object witnessing human life."
      },
      {
        contestType: "Prompt-Based",
        challengeTitle: "Dream Sequence",
        description: "Capture the surreal logic and emotion of a vivid dream."
      },
      {
        contestType: "Prompt-Based",
        challengeTitle: "Letter Never Sent",
        description: "Write a poem as a letter you could never actually send."
      },
      {
        contestType: "Prompt-Based",
        challengeTitle: "Invisible Friend",
        description: "An adult encounters their childhood imaginary friend again."
      },
      {
        contestType: "Prompt-Based",
        challengeTitle: "Recipe for Emotion",
        description: "Write instructions for creating a specific feeling or mood."
      },
      {
        contestType: "Prompt-Based",
        challengeTitle: "Time Traveler's Regret",
        description: "A time traveler realizes they've changed something they shouldn't have."
      }
    ]
  };
  
  export const contestTypes = ["Theme-Based", "Constraint-Based", "Form-Based", "Prompt-Based"];
  
  export function getCurrentContestType(): string {
    const currentMonth = new Date().getMonth(); // Jan = 0
    return contestTypes[currentMonth % 4];
  }
  
  export function getCurrentChallenges() {
    const currentType = getCurrentContestType();
    return contestChallenges[currentType];
  }
  
  export function getContestTypeForMonth(month: number): string {
    return contestTypes[month % 4];
  }
  
  export function getChallengesForType(type: string) {
    return contestChallenges[type] || [];
  }
  