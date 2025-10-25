/**
 * Icon Configuration for Naruto NPC Importer
 * Edit this file to customize icons for jutsu, weapons, and NPCs
 */

const NarutoIconConfig = {
  /**
   * JUTSU/SPELL ICONS
   * Priority: nature > keyword > clan > default
   * NOTE: Nature (chakra nature) ALWAYS has highest priority!
   */
  jutsu: {
    // Elemental nature icons (HIGHEST PRIORITY - always wins!)
    nature: {
      "Fire": "systems/n5eb/assets/Icons & Images/Icons/Fire.png",
      "Water": "systems/n5eb/assets/Icons & Images/Icons/Water.png",
      "Wind": "systems/n5eb/assets/Icons & Images/Icons/Wind.png",
      "Earth": "systems/n5eb/assets/Icons & Images/Icons/Earth.png",
      "Lightning": "systems/n5eb/assets/Icons & Images/Icons/Lightning.png",
      "Wood": "systems/n5eb/assets/Icons & Images/Icons/Wood.png",
      "Ice": "systems/n5eb/assets/Icons & Images/Icons/Lunar Slayer.webp",
      "Lava": "systems/n5eb/assets/Icons & Images/Icons/Typhoon Release.png",
      "Scorch": "systems/n5eb/assets/Icons & Images/Icons/Scorch.png",
      "Boil": "systems/n5eb/assets/Icons & Images/Icons/Boil Release.png",
      "Storm": "systems/n5eb/assets/Icons & Images/Icons/Swift.png",
      "Explosive": "systems/n5eb/assets/Icons & Images/Icons/Explosive Release.png",
      "Dark": "systems/n5eb/assets/Icons & Images/Icons/Dark Release.png",
      // Add more natures here
    },
    
    // Keyword-based icons (third priority)
    keyword: {
      "Ninjutsu": "systems/n5eb/assets/Icons & Images/Icons/NonElemental.png",
      "Taijutsu": "systems/n5eb/assets/Icons & Images/Icons/Taijutsu.png",
      "Genjutsu": "systems/n5eb/assets/Icons & Images/Icons/Genjutsu.png",
      "Hijutsu": "systems/n5eb/assets/Icons & Images/Icons/Non Elemental.png",
      "Kinjutsu": "systems/n5eb/assets/Icons & Images/Icons/Toxic.png",
      "Fuinjutsu": "systems/n5eb/assets/Icons & Images/Icons/Matrix.jpg",
      "Senjutsu": "systems/n5eb/assets/Icons & Images/Icons/Sage_Mode.webp",
      "Medical": "systems/n5eb/assets/Icons & Images/Icons/Medical.png",
      "Bukijutsu": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
      // Add more keywords here
    },
    
    // Default fallback icon
    default: "systems/n5eb/assets/Icons & Images/Icons/Jujutsu Sorcerer.webp"
  },

  /**
   * WEAPON ICONS
   * Maps weapon type/name to icon
   */
  weapons: {
    // Specific weapon types
    "Kunai": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Shuriken": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Fuma-Shuriken": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Senbon": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Katana": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Tanto": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Wakizashi": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Naginata": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Bo Staff": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    "Kusarigama": "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png",
    
    // Default fallback
    default: "systems/n5eb/assets/Icons & Images/Icons/Bukijutsu.png"
  },

  /**
   * NPC/ACTOR ICONS
   * Maps clan to portrait icon
   */
  actors: {
    clan: {
      "Aburame": "systems/n5eb/assets/Icons & Images/Icons/Jinchuuriki.jpg",
      "Uchiha": "systems/n5eb/assets/Icons & Images/Icons/Mangekyo Sharingan.webp",
      "Hyuga": "systems/n5eb/assets/Icons & Images/Icons/Otsutsuki.png",
      "Nara": "systems/n5eb/assets/Icons & Images/Icons/Shadow_Clone.webp",
      "Shakuton": "systems/n5eb/assets/Icons & Images/Icons/Scorch.png",
      // Add more clans here
    },
    
    // Rank-based fallbacks (if no clan icon)
    rank: {
      "Genin": "systems/n5eb/assets/Icons & Images/Icons/NonElemental.png",
      "Chunin": "systems/n5eb/assets/Icons & Images/Icons/Jujutsu Sorcerer.webp",
      "Jonin": "systems/n5eb/assets/Icons & Images/Icons/inner-gates.jpg",
      "ANBU": "systems/n5eb/assets/Icons & Images/Icons/Shadow_Clone.webp",
      "Kage": "systems/n5eb/assets/Icons & Images/Icons/7th-inner-gate.jpg",
    },
    
    // Default fallback
    default: "icons/svg/mystery-man.svg"
  },

  /**
   * FEATURE/FEAT ICONS
   * Maps feature names or patterns to icons
   */
  features: {
    // Pattern-based matching (regex)
    patterns: {
      "Chakra": "systems/n5eb/assets/Icons & Images/Icons/NonElemental.png",
      "Byakugan": "systems/n5eb/assets/Icons & Images/Icons/Otsutsuki.png",
      "Sharingan": "systems/n5eb/assets/Icons & Images/Icons/Mangekyo Sharingan.webp",
      "Rinnegan": "systems/n5eb/assets/Icons & Images/Icons/Otsutsuki.png",
      "Sage Mode": "systems/n5eb/assets/Icons & Images/Icons/Sage_Mode.webp",
      "Kekkei Genkai": "systems/n5eb/assets/Icons & Images/Icons/Non Elemental.png",
      "Inner Gate": "systems/n5eb/assets/Icons & Images/Icons/inner-gates.jpg",
      "Eight Gates": "systems/n5eb/assets/Icons & Images/Icons/7th-inner-gate.jpg",
    },
    
    // Default fallback
    default: "systems/n5eb/assets/Icons & Images/Icons/NonElemental.png"
  }
};

/**
 * Helper function to get jutsu icon
 * @param {Object} jutsu - Jutsu data
 * @returns {string} Icon path
 */
function getJutsuIcon(jutsu) {
  const config = NarutoIconConfig.jutsu;
  
  // Priority 1: Check nature FIRST (HIGHEST PRIORITY)
  if (jutsu.nature && config.nature[jutsu.nature]) {
    return config.nature[jutsu.nature];
  }
  
  // Priority 2: Check keywords
  if (jutsu.keywords && Array.isArray(jutsu.keywords)) {
    for (const keyword of jutsu.keywords) {
      if (config.keyword[keyword]) {
        return config.keyword[keyword];
      }
    }
  }
  
  // Priority 3: Check clan
  if (jutsu.clan && config.clan[jutsu.clan]) {
    return config.clan[jutsu.clan];
  }
  
  // Default fallback
  return config.default;
}

/**
 * Helper function to get weapon icon
 * @param {string} weaponType - Weapon type or name
 * @returns {string} Icon path
 */
function getWeaponIcon(weaponType) {
  const config = NarutoIconConfig.weapons;
  
  // Check exact match
  if (config[weaponType]) {
    return config[weaponType];
  }
  
  // Check partial match (case insensitive)
  const normalized = weaponType.toLowerCase();
  for (const [key, value] of Object.entries(config)) {
    if (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Default fallback
  return config.default;
}

/**
 * Helper function to get actor icon
 * @param {string} clan - Clan name
 * @param {string} rank - Rank name
 * @returns {string} Icon path
 */
function getActorIcon(clan, rank) {
  const config = NarutoIconConfig.actors;
  
  // Priority 1: Check clan
  if (clan && config.clan[clan]) {
    return config.clan[clan];
  }
  
  // Priority 2: Check rank
  if (rank && config.rank[rank]) {
    return config.rank[rank];
  }
  
  // Default fallback
  return config.default;
}

/**
 * Helper function to get feature icon
 * @param {string} featureName - Feature name
 * @returns {string} Icon path
 */
function getFeatureIcon(featureName) {
  const config = NarutoIconConfig.features;
  
  // Check pattern matching
  for (const [pattern, icon] of Object.entries(config.patterns)) {
    if (featureName.includes(pattern)) {
      return icon;
    }
  }
  
  // Default fallback
  return config.default;
}

// Export configuration
window.NarutoIconConfig = NarutoIconConfig;
window.getJutsuIcon = getJutsuIcon;
window.getWeaponIcon = getWeaponIcon;
window.getActorIcon = getActorIcon;
window.getFeatureIcon = getFeatureIcon;
