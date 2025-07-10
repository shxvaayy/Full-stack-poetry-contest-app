
export const CONTEST_TYPES = ["Theme-Based", "Constraint-Based", "Form-Based", "Prompt-Based"];

export const CHALLENGE_DATA = {
  "Theme-Based": [
    {
      title: "Urban Symphony",
      description: "Write a poem capturing the rhythm and sounds of city life"
    },
    {
      title: "Digital Age Romance",
      description: "Explore love and relationships in the era of social media and technology"
    },
    {
      title: "Climate Awakening",
      description: "Express the urgency and beauty of environmental consciousness"
    },
    {
      title: "Memory Palace",
      description: "Create a poem about a specific childhood memory and its lasting impact"
    },
    {
      title: "Cultural Fusion",
      description: "Celebrate the blending of different cultures and traditions"
    },
    {
      title: "Night Shift Workers",
      description: "Honor the unsung heroes who work while the world sleeps"
    }
  ],
  "Constraint-Based": [
    {
      title: "Limerick Laughter",
      description: "Craft humorous or witty limericks with perfect AABBA rhyme"
    },
    {
      title: "Sonnet Revival",
      description: "Write a traditional 14-line sonnet about modern struggles"
    },
    {
      title: "Palindrome Poetry",
      description: "Create a poem where each line reads the same forwards and backwards"
    },
    {
      title: "Acrostic Adventure",
      description: "Use the word JOURNEY to create an acrostic poem about life's path"
    },
    {
      title: "Single Syllable",
      description: "Write a meaningful poem using only one-syllable words"
    },
    {
      title: "Reverse Rhyme",
      description: "Create a poem where the last words of each stanza rhyme with the first"
    }
  ],
  "Form-Based": [
    {
      title: "Haiku Garden",
      description: "Compose three connected haikus about seasons changing"
    },
    {
      title: "Ballad of Today",
      description: "Write a modern ballad about current social issues"
    },
    {
      title: "Free Verse Freedom",
      description: "Express raw emotion through unstructured free verse poetry"
    },
    {
      title: "Cinquain Cascade",
      description: "Create a series of cinquains that tell a complete story"
    },
    {
      title: "Villanelle Voyage",
      description: "Craft a villanelle about overcoming personal challenges"
    },
    {
      title: "Concrete Creation",
      description: "Design a concrete poem where the shape reflects the meaning"
    }
  ],
  "Prompt-Based": [
    {
      title: "If Colors Had Voices",
      description: "Imagine what different colors would say if they could speak"
    },
    {
      title: "The Last Library",
      description: "Write about the final library on Earth and its last visitor"
    },
    {
      title: "Conversations with Time",
      description: "Create a dialogue between yourself and the concept of time"
    },
    {
      title: "The Weight of Words",
      description: "Explore how a single word can change everything"
    },
    {
      title: "Invisible Threads",
      description: "Write about the unseen connections between strangers"
    },
    {
      title: "After the Applause",
      description: "Capture the moment when the spotlight fades and silence returns"
    }
  ]
};

export function getCurrentContestType(): string {
  const currentMonth = new Date().getMonth(); // 0-11
  return CONTEST_TYPES[currentMonth % 4];
}

export function getRandomChallenge(contestType: string) {
  const challenges = CHALLENGE_DATA[contestType as keyof typeof CHALLENGE_DATA];
  if (!challenges || challenges.length === 0) {
    return {
      title: "Free Expression",
      description: "Write a poem expressing your thoughts and feelings"
    };
  }
  
  const randomIndex = Math.floor(Math.random() * challenges.length);
  return challenges[randomIndex];
}

export function getChallengesForType(contestType: string) {
  return CHALLENGE_DATA[contestType as keyof typeof CHALLENGE_DATA] || [];
}

