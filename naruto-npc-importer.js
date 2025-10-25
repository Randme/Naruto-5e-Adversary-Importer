/**
 * Naruto 5e NPC Importer for Foundry VTT - Enhanced Version
 * Now searches compendiums for existing items before creating new ones
 */

class NarutoNPCImporter {
  constructor() {
    this.systemId = "n5eb";
    this.compendiumCache = null;
  }

  /**
   * Build index of all items in compendiums for fast searching
   */
  async buildCompendiumIndex() {
    if (this.compendiumCache) return this.compendiumCache;
    
    console.log("Building compendium index...");
    const packs = game.packs.filter(p => (p.documentName || p.metadata?.documentName) === "Item");
    
    const indices = await Promise.all(
      packs.map(async (pack) => {
        try {
          const index = await pack.getIndex({ fields: ["name", "type"] });
          return { pack, index };
        } catch (e) {
          console.warn(`Failed to index ${pack.metadata.label}:`, e);
          return null;
        }
      })
    );
    
    this.compendiumCache = indices.filter(Boolean);
    console.log(`Indexed ${this.compendiumCache.length} compendiums`);
    return this.compendiumCache;
  }

  /**
   * Normalize name for comparison (remove non-letters, lowercase)
   */
  normalizeName(name) {
    if (!name) return "";
    return name.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /**
   * Find item by name in world and compendiums
   */
  async findItemByName(name, itemType = null) {
    const normalizedTarget = this.normalizeName(name);
    
    // Search world items first
    for (const item of game.items) {
      if (itemType && item.type !== itemType) continue;
      if (this.normalizeName(item.name) === normalizedTarget) {
        return { item, source: "world" };
      }
    }
    
    // Search compendiums
    const indices = await this.buildCompendiumIndex();
    for (const { pack, index } of indices) {
      const match = index.find(entry => {
        if (itemType && entry.type !== itemType) return false;
        return this.normalizeName(entry.name) === normalizedTarget;
      });
      
      if (match) {
        try {
          const item = await pack.getDocument(match._id);
          return { item, source: `compendium:${pack.metadata.label}` };
        } catch (e) {
          console.warn(`Failed to get item ${match.name} from ${pack.metadata.label}:`, e);
        }
      }
    }
    
    return null;
  }

  /**
   * Main import function
   */
  async importNPC(npcData) {
    try {
      if (!npcData || !npcData.name) {
        throw new Error("Invalid NPC data: missing name");
      }

      ui.notifications.info(`Importing ${npcData.name}...`);

      // Create the actor with stats
      const actorData = this.convertToFoundryFormat(npcData);
      const actor = await Actor.create(actorData);

      // Import items (search compendiums first)
      await this.addItems(actor, npcData);

      ui.notifications.info(`Successfully imported ${npcData.name}`);
      return actor;
    } catch (error) {
      ui.notifications.error(`Failed to import NPC: ${error.message}`);
      console.error("NPC Import Error:", error);
      throw error;
    }
  }

  /**
   * Add items to actor, searching compendiums first
   */
  async addItems(actor, npcData) {
    const itemsToCreate = [];
    const importReport = [];

    // Process jutsu
    if (npcData.jutsu && Array.isArray(npcData.jutsu)) {
      for (const jutsu of npcData.jutsu) {
        const result = await this.findItemByName(jutsu.name, "spell");
        
        if (result) {
          // Found in compendium or world
          const itemData = result.item.toObject();
          delete itemData._id;
          itemsToCreate.push(itemData);
          importReport.push({
            name: jutsu.name,
            type: "jutsu",
            source: result.source,
            created: false
          });
        } else {
          // Create new spell item
          const newItem = this.convertJutsu(jutsu);
          itemsToCreate.push(newItem);
          importReport.push({
            name: jutsu.name,
            type: "jutsu",
            source: "created",
            created: true
          });
        }
      }
    }

    // Process weapons
    if (npcData.weapons && Array.isArray(npcData.weapons)) {
      for (const weapon of npcData.weapons) {
        const result = await this.findItemByName(weapon.name, "weapon");
        
        if (result) {
          // Found in compendium or world
          const itemData = result.item.toObject();
          delete itemData._id;
          itemsToCreate.push(itemData);
          importReport.push({
            name: weapon.name,
            type: "weapon",
            source: result.source,
            created: false
          });
        } else {
          // Create new weapon item
          const newItem = this.convertWeapon(weapon);
          itemsToCreate.push(newItem);
          importReport.push({
            name: weapon.name,
            type: "weapon",
            source: "created",
            created: true
          });
        }
      }
    }

    // Process abilities as features
    if (npcData.abilities && Array.isArray(npcData.abilities)) {
      for (const ability of npcData.abilities) {
        const abilityName = this.parseAbilityName(ability);
        const result = await this.findItemByName(abilityName, "feat");
        
        if (result) {
          // Found in compendium or world
          const itemData = result.item.toObject();
          delete itemData._id;
          itemsToCreate.push(itemData);
          importReport.push({
            name: abilityName,
            type: "feat",
            source: result.source,
            created: false
          });
        } else {
          // Create new feat item
          const newItem = this.convertAbility(ability);
          itemsToCreate.push(newItem);
          importReport.push({
            name: abilityName,
            type: "feat",
            source: "created",
            created: true
          });
        }
      }
    }

    // Create all items
    if (itemsToCreate.length > 0) {
      await actor.createEmbeddedDocuments("Item", itemsToCreate);
    }

    // Show detailed report
    console.groupCollapsed(`Imported ${npcData.name} with ${itemsToCreate.length} items`);
    console.table(importReport);
    console.groupEnd();

    // Show summary notification
    const created = importReport.filter(r => r.created).length;
    const found = importReport.filter(r => !r.created).length;
    if (found > 0) {
      ui.notifications.info(`Found ${found} items in compendiums, created ${created} new items`);
    }
  }

  /**
   * Convert NPC data to Foundry actor format
   */
  convertToFoundryFormat(npcData) {
    const actorData = {
      name: npcData.name,
      type: "npc",
      img: this.getDefaultImage(npcData.clan, npcData.rank),
      system: {
        // Ability scores - n5eb uses proficient values: 0.5, 1, 2
        abilities: {
          str: {
            value: npcData.stats.str,
            proficient: 0.5,
            max: null,
            bonuses: {
              check: "",
              save: ""
            }
          },
          dex: {
            value: npcData.stats.dex,
            proficient: 0.5,
            max: null,
            bonuses: {
              check: "",
              save: ""
            }
          },
          con: {
            value: npcData.stats.con,
            proficient: 0.5,
            max: null,
            bonuses: {
              check: "",
              save: ""
            }
          },
          int: {
            value: npcData.stats.int,
            proficient: 0.5,
            max: null,
            bonuses: {
              check: "",
              save: ""
            }
          },
          wis: {
            value: npcData.stats.wis,
            proficient: 0.5,
            max: null,
            bonuses: {
              check: "",
              save: ""
            }
          },
          cha: {
            value: npcData.stats.cha,
            proficient: 0.5,
            max: null,
            bonuses: {
              check: "",
              save: ""
            }
          }
        },

        // Attributes
        attributes: {
          hp: {
            value: npcData.hp,
            max: npcData.maxHp,
            temp: 0,
            tempmax: 0,
            bonuses: {},
            formula: ""
          },
          // IMPORTANT: n5eb uses "cp" (chakra points) not "chakra"
          cp: {
            value: npcData.chakra,
            max: npcData.maxChakra,
            temp: 0,
            tempmax: 0,
            bonuses: {},
            formula: ""
          },
          ac: {
            flat: npcData.ac,
            calc: "flat",
            prof: null
          },
          movement: {
            walk: npcData.speed,
            burrow: null,
            climb: null,
            fly: null,
            swim: null,
            units: null,
            hover: false
          },
          spellcasting: {
            ninjutsu: "int",
            genjutsu: "wis",
            taijutsu: "str"
          },
          senses: {
            darkvision: null,
            chakrasight: null,
            blindsight: null,
            tremorsense: null,
            truesight: null,
            units: null,
            special: ""
          },
          init: {
            ability: "",
            bonus: ""
          },
          exhaustion: 0,
          concentration: {
            ability: "",
            bonuses: {
              save: ""
            },
            limit: 2
          },
          death: {
            success: 0,
            failure: 0
          }
        },

        // Details
        details: {
          biography: {
            value: this.generateBiography(npcData),
            public: ""
          },
          type: {
            value: "custom",
            subtype: npcData.rank || "",
            swarm: "",
            custom: npcData.clan || ""
          },
          cr: npcData.cr || 0,
          spellLevel: 0,
          xp: {
            value: npcData.xp || 0
          },
          source: {
            custom: "Narutogen Import"
          },
          alignment: ""
        },

        // Traits
        traits: {
          size: "med",
          di: {
            value: [],
            custom: ""
          },
          dr: {
            value: [],
            custom: ""
          },
          dv: {
            value: [],
            custom: ""
          },
          ci: {
            value: [],
            custom: ""
          },
          languages: {
            value: [],
            custom: ""
          }
        },

        // Currency
        currency: {
          ryo: 0
        },

        // Skills and bonuses
        bonuses: {
          mwak: {
            attack: "",
            damage: ""
          },
          rwak: {
            attack: "",
            damage: ""
          },
          mnak: {
            attack: "",
            damage: ""
          },
          rnak: {
            attack: "",
            damage: ""
          },
          mgak: {
            attack: "",
            damage: ""
          },
          rgak: {
            attack: "",
            damage: ""
          },
          mtak: {
            attack: "",
            damage: ""
          },
          rtak: {
            attack: "",
            damage: ""
          },
          abilities: {
            check: "",
            save: "",
            skill: ""
          },
          ninjutsu: {
            dc: ""
          },
          genjutsu: {
            dc: ""
          },
          taijutsu: {
            dc: ""
          }
        },

        // Resources
        resources: {
          primary: {
            value: null,
            max: null,
            sr: false,
            lr: false,
            label: ""
          },
          secondary: {
            value: null,
            max: null,
            sr: false,
            lr: false,
            label: ""
          },
          tertiary: {
            value: null,
            max: null,
            sr: false,
            lr: false,
            label: ""
          }
        }
      },

      // Flags for custom data
      flags: {
        narutoImporter: {
          source: "narutogen",
          importDate: new Date().toISOString(),
          originalData: npcData
        },
        narutogen: {
          clan: npcData.clan,
          rank: npcData.rank,
          specialty: npcData.specialty,
          chakraNatures: npcData.chakraNatures || []
        }
      }
    };

    return actorData;
  }

  /**
   * Convert jutsu to Foundry item format
   */
  convertJutsu(jutsu) {
    // Determine activation type
    const activationType = jutsu.castingTime?.toLowerCase().includes("bonus") ? "bonus" : 
                          jutsu.castingTime?.toLowerCase().includes("reaction") ? "reaction" : "action";
    
    // Parse target information
    const targetInfo = this.parseTargetInfo(jutsu);
    
    // Parse damage parts from effects
    const damageParts = this.parseDamage(jutsu.effects);
    
    // Determine action type (save or attack)
    const actionType = this.determineActionType(jutsu);
    
    return {
      name: jutsu.name,
      type: "spell",
      img: this.getJutsuImage(jutsu),
      system: {
        description: {
          value: this.formatJutsuDescription(jutsu),
          chat: ""
        },
        source: {
          custom: jutsu.clan || ""
        },
        activation: {
          type: activationType,
          cost: 1,
          condition: ""
        },
        duration: {
          value: this.parseDuration(jutsu.duration),
          units: this.parseDurationUnits(jutsu.duration)
        },
        cover: null,
        crewed: false,
        target: {
          value: targetInfo.value,
          width: null,
          units: targetInfo.units,
          type: targetInfo.type,
          prompt: true
        },
        range: {
          value: this.parseRange(jutsu.range),
          long: null,
          units: "ft"
        },
        uses: {
          value: null,
          max: "",
          per: null,
          recovery: "",
          prompt: true
        },
        consume: {
          type: "",
          target: null,
          amount: null,
          scale: false
        },
        ability: this.determineAbility(jutsu),
        actionType: actionType,
        attack: {
          bonus: "",
          flat: false
        },
        chatFlavor: "",
        critical: {
          threshold: null,
          damage: ""
        },
        damage: {
          parts: damageParts,
          versatile: ""
        },
        enchantment: null,
        formula: "",
        save: {
          ability: this.determineSaveAbility(jutsu),
          dc: null,
          scaling: "spell"
        },
        level: this.rankToLevel(jutsu.rank),
        school: this.determineSchool(jutsu),
        properties: this.parseJutsuProperties(jutsu),
        materials: {
          value: "",
          consumed: false,
          cost: 0,
          supply: 0
        },
        preparation: {
          mode: "innate",
          prepared: true
        },
        scaling: {
          mode: "none",
          formula: ""
        },
        summons: null,
        // n5eb specific - chakra cost
        chakraCost: jutsu.chakraCost || 0,
        chakraScaling: {
          mode: "none",
          value: 0
        },
        versatileScaling: {
          formula: "",
          mode: "none"
        },
        recharge: {
          value: null,
          formula: "1d8",
          charged: false
        }
      },
      flags: {
        narutogen: {
          jutsu: {
            rank: jutsu.rank,
            keywords: jutsu.keywords,
            clan: jutsu.clan,
            nature: jutsu.nature,
            components: jutsu.components,
            originalData: jutsu
          }
        }
      }
    };
  }

  /**
   * Convert weapon to Foundry item format
   */
  convertWeapon(weapon) {
    const isRanged = weapon.properties.some(p => p.toLowerCase().includes("thrown") || p.toLowerCase().includes("range"));
    const ranges = this.parseWeaponRanges(weapon.properties);
    
    return {
      name: weapon.name,
      type: "weapon",
      img: this.getWeaponImage(weapon.type),
      system: {
        description: {
          value: weapon.description || "",
          chat: ""
        },
        source: {},
        quantity: 1,
        weight: {
          value: 0,
          units: "lb"
        },
        price: {
          value: 0,
          denomination: "ryo"
        },
        attunement: "",
        equipped: true,
        rarity: "",
        identified: true,
        activation: {
          type: "action",
          cost: 1,
          condition: ""
        },
        duration: {
          value: "",
          units: ""
        },
        cover: null,
        crewed: false,
        target: {
          value: 1,
          width: null,
          units: "",
          type: "creature",
          prompt: true
        },
        range: {
          value: ranges.normal,
          long: ranges.long,
          units: "ft"
        },
        uses: {
          value: null,
          max: "",
          per: null,
          recovery: "",
          prompt: true
        },
        consume: {
          type: "",
          target: null,
          amount: null,
          scale: false
        },
        ability: isRanged ? "dex" : "str",
        actionType: isRanged ? "rwak" : "mwak",
        attack: {
          bonus: "",
          flat: false
        },
        chatFlavor: "",
        critical: {
          threshold: null,
          damage: ""
        },
        damage: {
          parts: this.parseWeaponDamage(weapon),
          versatile: ""
        },
        formula: "",
        save: {
          ability: "",
          dc: null,
          scaling: "spell"
        },
        summons: null,
        armor: {
          value: null,
          dex: null,
          magicalBonus: null
        },
        hp: {
          value: null,
          max: null,
          dt: null,
          conditions: ""
        },
        type: {
          value: this.getWeaponType(weapon),
          baseItem: ""
        },
        magicalBonus: null,
        properties: this.parseWeaponPropertiesFlags(weapon.properties),
        proficient: 1,
        recharge: {
          value: null,
          formula: "1d8",
          charged: false
        }
      },
      flags: {
        narutogen: {
          weapon: {
            originalType: weapon.type,
            originalProperties: weapon.properties,
            traits: weapon.traits || []
          }
        }
      }
    };
  }

  /**
   * Convert ability to Foundry feature format
   */
  convertAbility(ability) {
    const abilityName = this.parseAbilityName(ability);
    const abilityDescription = this.parseAbilityDescription(ability);
    
    // Get icon based on ability name
    let icon = "systems/n5eb/icons/svg/items/feature.svg";
    if (typeof getFeatureIcon === 'function') {
      icon = getFeatureIcon(abilityName);
    } else if (window.NarutoIconConfig?.features) {
      const config = window.NarutoIconConfig.features;
      // Check patterns
      if (config.patterns) {
        for (const [pattern, patternIcon] of Object.entries(config.patterns)) {
          if (abilityName.includes(pattern)) {
            icon = patternIcon;
            break;
          }
        }
      }
      // Use default if still not found
      if (icon === "systems/n5eb/icons/svg/items/feature.svg" && config.default) {
        icon = config.default;
      }
    }
    
    return {
      name: abilityName,
      type: "feat",
      img: icon,
      system: {
        description: {
          value: `<p>${abilityDescription}</p>`,
          chat: ""
        },
        source: {},
        activation: {
          type: "",
          cost: null,
          condition: ""
        },
        duration: {
          value: "",
          units: ""
        },
        cover: null,
        crewed: false,
        target: {
          value: "",
          width: null,
          units: "",
          type: "",
          prompt: true
        },
        range: {
          value: null,
          long: null,
          units: ""
        },
        uses: {
          value: null,
          max: "",
          per: null,
          recovery: "",
          prompt: true
        },
        consume: {
          type: "",
          target: null,
          amount: null,
          scale: false
        },
        ability: null,
        actionType: null,
        attack: {
          bonus: "",
          flat: false
        },
        chatFlavor: "",
        critical: {
          threshold: null,
          damage: ""
        },
        damage: {
          parts: [],
          versatile: ""
        },
        enchantment: null,
        formula: "",
        save: {
          ability: "",
          dc: null,
          scaling: "spell"
        },
        summons: null,
        type: {
          value: "monster",
          subtype: "",
          nestedsubtype: ""
        },
        prerequisites: {
          level: null
        },
        properties: [],
        requirements: "",
        recharge: {
          value: null,
          formula: "1d8",
          charged: false
        }
      },
      flags: {
        narutogen: {
          ability: {
            originalText: ability
          }
        }
      }
    };
  }

  parseAbilityDescription(ability) {
    // Remove the name part (before first colon)
    const match = ability.match(/^[^:]+:\s*(.+)$/);
    return match ? match[1] : ability;
  }

  // Helper methods

  parseTargetInfo(jutsu) {
    const rangeStr = (jutsu.range || "").toLowerCase();
    const effectsStr = (jutsu.effects || []).join(" ").toLowerCase();
    
    // Check for area effects
    if (effectsStr.includes("cone")) {
      const match = effectsStr.match(/(\d+)-foot cone/);
      return {
        value: match ? parseInt(match[1]) : 15,
        units: "ft",
        type: "cone"
      };
    }
    
    if (effectsStr.includes("line")) {
      const match = effectsStr.match(/(\d+)-foot line/);
      return {
        value: match ? parseInt(match[1]) : 30,
        units: "ft",
        type: "line"
      };
    }
    
    if (effectsStr.includes("radius") || effectsStr.includes("sphere")) {
      const match = effectsStr.match(/(\d+)-foot (?:radius|sphere)/);
      return {
        value: match ? parseInt(match[1]) : 20,
        units: "ft",
        type: "radius"
      };
    }
    
    if (effectsStr.includes("cube")) {
      const match = effectsStr.match(/(\d+)-foot cube/);
      return {
        value: match ? parseInt(match[1]) : 10,
        units: "ft",
        type: "cube"
      };
    }
    
    // Default to single creature
    return {
      value: 1,
      units: "",
      type: "creature"
    };
  }

  parseDuration(duration) {
    if (!duration) return "";
    const match = duration.match(/(\d+)/);
    return match ? match[1] : "";
  }

  parseDurationUnits(duration) {
    if (!duration) return "";
    const dur = duration.toLowerCase();
    if (dur.includes("minute")) return "minute";
    if (dur.includes("hour")) return "hour";
    if (dur.includes("round")) return "round";
    if (dur.includes("turn")) return "turn";
    if (dur.includes("day")) return "day";
    return "inst";
  }

  determineActionType(jutsu) {
    const effectsStr = (jutsu.effects || []).join(" ").toLowerCase();
    const description = (jutsu.description || "").toLowerCase();
    const combined = effectsStr + " " + description;
    
    // Check for saving throw
    if (combined.includes("saving throw") || combined.includes("save")) {
      return "save";
    }
    
    // Check for attack roll
    if (combined.includes("attack") || combined.includes("spell attack")) {
      return "rsak"; // ranged spell attack
    }
    
    // Check for healing
    if (combined.includes("heal") || combined.includes("hit point") || combined.includes("hp")) {
      return "heal";
    }
    
    // Default to utility
    return "util";
  }

  determineAbility(jutsu) {
    const keywords = (jutsu.keywords || []).join(" ").toLowerCase();
    
    if (keywords.includes("taijutsu")) return "str";
    if (keywords.includes("genjutsu")) return "wis";
    // Default to ninjutsu
    return "int";
  }

  determineSchool(jutsu) {
    const nature = (jutsu.nature || "").toLowerCase();
    
    const schoolMap = {
      "fire": "evo",
      "water": "trs",
      "wind": "evo",
      "earth": "abj",
      "lightning": "evo"
    };
    
    return schoolMap[nature] || "evo";
  }

  parseJutsuProperties(jutsu) {
    const props = [];
    
    if (jutsu.components) {
      if (jutsu.components.includes("HS")) props.push("somatic");
      if (jutsu.components.includes("CM")) props.push("verbal");
    }
    
    if (jutsu.duration && jutsu.duration.includes("Concentration")) {
      props.push("concentration");
    }
    
    return props;
  }

  parseWeaponRanges(properties) {
    const throwProp = properties.find(p => p.toLowerCase().includes("thrown"));
    if (throwProp) {
      const ranges = throwProp.match(/\((\d+)\/(\d+)\)/);
      if (ranges) {
        return {
          normal: parseInt(ranges[1]),
          long: parseInt(ranges[2])
        };
      }
    }
    
    // Check for range property
    const rangeProp = properties.find(p => p.toLowerCase().includes("range"));
    if (rangeProp) {
      const ranges = rangeProp.match(/\((\d+)\/(\d+)\)/);
      if (ranges) {
        return {
          normal: parseInt(ranges[1]),
          long: parseInt(ranges[2])
        };
      }
    }
    
    // Default melee
    return { normal: 5, long: null };
  }

  parseWeaponDamage(weapon) {
    // Parse damage string like "1d8 + 0"
    const damageMatch = weapon.damage.match(/(\d+d\d+)\s*\+?\s*(\d*)/);
    if (damageMatch) {
      const dice = damageMatch[1];
      const bonus = damageMatch[2] || "0";
      
      // Determine damage type based on weapon
      let damageType = "";
      const weaponType = weapon.type.toLowerCase();
      
      if (weaponType.includes("shuriken") || weaponType.includes("kunai")) {
        damageType = "piercing";
      } else if (weaponType.includes("sword") || weaponType.includes("blade")) {
        damageType = "slashing";
      } else {
        damageType = "bludgeoning";
      }
      
      return [[dice, damageType]];
    }
    
    return [["1d4", "piercing"]];
  }

  parseWeaponPropertiesFlags(properties) {
    const flags = [];
    
    properties.forEach(prop => {
      const p = prop.toLowerCase();
      if (p.includes("thrown")) flags.push("thr");
      if (p.includes("light")) flags.push("lgt");
      if (p.includes("heavy")) flags.push("hvy");
      if (p.includes("finesse")) flags.push("fin");
      if (p.includes("versatile")) flags.push("ver");
      if (p.includes("two-handed")) flags.push("two");
      if (p.includes("reach")) flags.push("rch");
    });
    
    return flags;
  }

  getWeaponType(weapon) {
    const type = weapon.type.toLowerCase();
    
    if (type.includes("shuriken") || type.includes("kunai")) {
      return "simpleR";
    }
    
    if (type.includes("sword") || type.includes("blade")) {
      return "martialM";
    }
    
    return "simpleM";
  }

  formatJutsuDescription(jutsu) {
    let html = `<p><strong>${jutsu.name}</strong> - Rank ${jutsu.rank}</p>`;
    html += `<p>${jutsu.description}</p>`;
    html += `<p><strong>Chakra Cost:</strong> ${jutsu.chakraCost}</p>`;
    html += `<p><strong>Casting Time:</strong> ${jutsu.castingTime}</p>`;
    html += `<p><strong>Range:</strong> ${jutsu.range}</p>`;
    html += `<p><strong>Duration:</strong> ${jutsu.duration}</p>`;
    
    if (jutsu.components && jutsu.components.length > 0) {
      html += `<p><strong>Components:</strong> ${jutsu.components.join(", ")}</p>`;
    }
    
    if (jutsu.keywords && jutsu.keywords.length > 0) {
      html += `<p><strong>Keywords:</strong> ${jutsu.keywords.join(", ")}</p>`;
    }

    if (jutsu.nature) {
      html += `<p><strong>Nature:</strong> ${jutsu.nature}</p>`;
    }

    if (jutsu.clan) {
      html += `<p><strong>Clan:</strong> ${jutsu.clan}</p>`;
    }

    if (jutsu.effects && jutsu.effects.length > 0) {
      html += `<p><strong>Effects:</strong></p><ul>`;
      jutsu.effects.forEach(effect => {
        html += `<li>${effect}</li>`;
      });
      html += `</ul>`;
    }

    return html;
  }

  generateBiography(npcData) {
    let bio = `<h2>${npcData.name}</h2>`;
    bio += `<p><strong>Clan:</strong> ${npcData.clan}</p>`;
    bio += `<p><strong>Rank:</strong> ${npcData.rank}</p>`;
    bio += `<p><strong>Specialty:</strong> ${npcData.specialty}</p>`;
    
    if (npcData.chakraNatures && npcData.chakraNatures.length > 0) {
      bio += `<p><strong>Chakra Natures:</strong> ${npcData.chakraNatures.join(", ")}</p>`;
    }

    if (npcData.abilities && npcData.abilities.length > 0) {
      bio += `<h3>Special Abilities</h3><ul>`;
      npcData.abilities.forEach(ability => {
        bio += `<li>${ability}</li>`;
      });
      bio += `</ul>`;
    }

    return bio;
  }

  rankToLevel(rank) {
    const rankMap = {
      "E": 0,
      "D": 1,
      "C": 3,
      "B": 5,
      "A": 7,
      "S": 9
    };
    return rankMap[rank] || 1;
  }

  parseRange(rangeStr) {
    if (!rangeStr) return 0;
    if (rangeStr.toLowerCase().includes("self")) return 0;
    if (rangeStr.toLowerCase().includes("touch")) return 5;
    
    const match = rangeStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 30;
  }

  parseDamage(effects) {
    const damageParts = [];
    if (!effects) return damageParts;

    effects.forEach(effect => {
      const damageMatch = effect.match(/(\d+d\d+)(?:\s+(\w+)\s+damage)?/i);
      if (damageMatch) {
        const damageRoll = damageMatch[1];
        const damageType = damageMatch[2] ? damageMatch[2].toLowerCase() : "";
        damageParts.push([damageRoll, damageType]);
      }
    });

    return damageParts;
  }

  determineSaveAbility(jutsu) {
    const description = jutsu.description?.toLowerCase() || "";
    const effects = jutsu.effects?.join(" ").toLowerCase() || "";
    const text = description + effects;

    if (text.includes("dex save") || text.includes("dexterity save")) return "dex";
    if (text.includes("con save") || text.includes("constitution save")) return "con";
    if (text.includes("wis save") || text.includes("wisdom save")) return "wis";
    if (text.includes("str save") || text.includes("strength save")) return "str";
    if (text.includes("int save") || text.includes("intelligence save")) return "int";
    if (text.includes("cha save") || text.includes("charisma save")) return "cha";

    return "";
  }

  parseAbilityName(ability) {
    const match = ability.match(/^([^:]+):/);
    return match ? match[1].trim() : "Special Ability";
  }

  getDefaultImage(clan, rank = null) {
    // Use external config if available
    if (typeof getActorIcon === 'function') {
      return getActorIcon(clan, rank);
    }
    
    // Fallback to built-in logic
    const config = window.NarutoIconConfig?.actors;
    
    if (config) {
      // Check clan first
      if (clan && config.clan && config.clan[clan]) {
        return config.clan[clan];
      }
      
      // Check rank
      if (rank && config.rank && config.rank[rank]) {
        return config.rank[rank];
      }
      
      // Default
      if (config.default) {
        return config.default;
      }
    }
    
    // Final fallback
    return "icons/svg/mystery-man.svg";
  }

  getJutsuImage(jutsu) {
    // Use external config if available
    if (typeof getJutsuIcon === 'function') {
      return getJutsuIcon(jutsu);
    }
    
    // Fallback to built-in logic
    const config = window.NarutoIconConfig?.jutsu;
    
    if (config) {
      // Check nature FIRST (HIGHEST PRIORITY)
      if (jutsu.nature && config.nature && config.nature[jutsu.nature]) {
        return config.nature[jutsu.nature];
      }
      
      // Check keywords second
      if (jutsu.keywords && Array.isArray(jutsu.keywords) && config.keyword) {
        for (const keyword of jutsu.keywords) {
          if (config.keyword[keyword]) {
            return config.keyword[keyword];
          }
        }
      }
      
      // Check clan third
      if (jutsu.clan && config.clan && config.clan[jutsu.clan]) {
        return config.clan[jutsu.clan];
      }
      
      // Default
      if (config.default) {
        return config.default;
      }
    }
    
    // Built-in fallback for chakra natures (even if config not loaded)
    if (jutsu.nature) {
      const builtInNatures = {
        "Fire": "systems/n5eb/assets/Icons & Images/Icons/Fire.png",
        "Water": "systems/n5eb/assets/Icons & Images/Icons/Water.png",
        "Wind": "systems/n5eb/assets/Icons & Images/Icons/Wind.png",
        "Earth": "systems/n5eb/assets/Icons & Images/Icons/Earth.png",
        "Lightning": "systems/n5eb/assets/Icons & Images/Icons/Lightning.png",
        "Wood": "systems/n5eb/assets/Icons & Images/Icons/Wood.png",
        "Ice": "systems/n5eb/assets/Icons & Images/Icons/Lunar Slayer.webp",
        "Scorch": "systems/n5eb/assets/Icons & Images/Icons/Scorch.png",
        "Boil": "systems/n5eb/assets/Icons & Images/Icons/Boil Release.png",
        "Storm": "systems/n5eb/assets/Icons & Images/Icons/Swift.png",
        "Explosive": "systems/n5eb/assets/Icons & Images/Icons/Explosive Release.png",
        "Dark": "systems/n5eb/assets/Icons & Images/Icons/Dark Release.png"
      };
      
      if (builtInNatures[jutsu.nature]) {
        return builtInNatures[jutsu.nature];
      }
    }
    
    // Final fallback - use generic jutsu icon from system
    return "systems/n5eb/assets/Icons & Images/Icons/Jujutsu Sorcerer.webp";
  }

  getWeaponImage(weaponType) {
    // Use external config if available
    if (typeof getWeaponIcon === 'function') {
      return getWeaponIcon(weaponType);
    }
    
    // Fallback to built-in logic
    const config = window.NarutoIconConfig?.weapons;
    
    if (config && config[weaponType]) {
      return config[weaponType];
    }
    
    // Check partial match
    if (config) {
      const normalized = weaponType.toLowerCase();
      for (const [key, value] of Object.entries(config)) {
        if (key !== 'default' && (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase()))) {
          return value;
        }
      }
      
      if (config.default) {
        return config.default;
      }
    }
    
    // Final fallback
    return "icons/svg/sword.svg";
  }
}

// Initialize the importer
const narutoImporter = new NarutoNPCImporter();

// Add to global scope for easy access
window.NarutoNPCImporter = NarutoNPCImporter;
window.narutoImporter = narutoImporter;
