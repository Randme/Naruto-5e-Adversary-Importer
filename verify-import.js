/**
 * Verification Script for Naruto NPC Importer
 * Run this in Foundry console after importing to verify data structure
 */

async function verifyImport(actorName = "Aburame Genin") {
  console.log("=".repeat(60));
  console.log("NARUTO NPC IMPORTER - VERIFICATION SCRIPT");
  console.log("=".repeat(60));
  
  // Find the actor
  const actor = game.actors.getName(actorName);
  
  if (!actor) {
    console.error(`❌ Actor "${actorName}" not found!`);
    console.log("Available NPCs:", game.actors.filter(a => a.type === "npc").map(a => a.name));
    return;
  }
  
  console.log(`✅ Found actor: ${actor.name}`);
  console.log("");
  
  // Check basic attributes
  console.log("📊 ATTRIBUTES:");
  console.log("---");
  
  const hp = actor.system.attributes.hp;
  console.log(`HP: ${hp.value}/${hp.max}`, hp.max > 0 ? "✅" : "❌");
  
  const cp = actor.system.attributes.cp;
  console.log(`CP (Chakra): ${cp.value}/${cp.max}`, cp.max > 0 ? "✅" : "❌");
  
  const ac = actor.system.attributes.ac;
  console.log(`AC: ${ac.flat} (calc: ${ac.calc})`, ac.flat > 0 ? "✅" : "❌");
  
  const movement = actor.system.attributes.movement;
  console.log(`Speed: ${movement.walk} ft`, movement.walk > 0 ? "✅" : "❌");
  
  console.log("");
  
  // Check abilities
  console.log("💪 ABILITY SCORES:");
  console.log("---");
  
  const abilities = actor.system.abilities;
  Object.entries(abilities).forEach(([key, ability]) => {
    console.log(`${key.toUpperCase()}: ${ability.value} (prof: ${ability.proficient})`, ability.value > 0 ? "✅" : "❌");
  });
  
  console.log("");
  
  // Check items
  console.log("🎒 ITEMS:");
  console.log("---");
  
  const spells = actor.items.filter(i => i.type === "spell");
  console.log(`Spells/Jutsu: ${spells.length}`);
  
  spells.forEach(spell => {
    const chakraCost = spell.system.chakraCost || 0;
    console.log(`  - ${spell.name} (Cost: ${chakraCost} CP)`, chakraCost > 0 ? "✅" : "⚠️");
  });
  
  const weapons = actor.items.filter(i => i.type === "weapon");
  console.log(`Weapons: ${weapons.length}`);
  
  weapons.forEach(weapon => {
    const damage = weapon.system.damage.parts[0];
    console.log(`  - ${weapon.name} (${damage ? damage[0] + " " + damage[1] : "no damage"})`, damage ? "✅" : "❌");
  });
  
  const feats = actor.items.filter(i => i.type === "feat");
  console.log(`Features/Abilities: ${feats.length}`);
  
  feats.forEach(feat => {
    console.log(`  - ${feat.name} ✅`);
  });
  
  console.log("");
  
  // Check flags
  console.log("🏴 FLAGS (Preserved Data):");
  console.log("---");
  
  const narutoFlags = actor.flags.narutogen;
  if (narutoFlags) {
    console.log(`Clan: ${narutoFlags.clan} ✅`);
    console.log(`Rank: ${narutoFlags.rank} ✅`);
    console.log(`Specialty: ${narutoFlags.specialty} ✅`);
    console.log(`Chakra Natures: ${narutoFlags.chakraNatures?.join(", ") || "none"} ✅`);
  } else {
    console.log("❌ No narutogen flags found!");
  }
  
  console.log("");
  
  // Summary
  console.log("=".repeat(60));
  console.log("SUMMARY:");
  console.log("---");
  
  const checks = {
    hp: hp.max > 0,
    cp: cp.max > 0,
    ac: ac.flat > 0,
    speed: movement.walk > 0,
    abilities: Object.values(abilities).every(a => a.value > 0),
    hasItems: actor.items.size > 0,
    hasFlags: !!narutoFlags
  };
  
  const passedChecks = Object.values(checks).filter(v => v).length;
  const totalChecks = Object.keys(checks).length;
  
  console.log(`Passed: ${passedChecks}/${totalChecks} checks`);
  
  if (passedChecks === totalChecks) {
    console.log("✅ ALL CHECKS PASSED! Import successful!");
  } else {
    console.log("⚠️ Some checks failed. Review the output above.");
  }
  
  console.log("=".repeat(60));
  
  // Return the actor for further inspection
  return actor;
}

// Run verification
console.log("To verify an imported NPC, run:");
console.log('verifyImport("NPC Name Here")');
console.log("");
console.log("Or verify the default:");
console.log("verifyImport()");
