# Naruto 5e NPC Importer for Foundry VTT

Import NPCs from [narutogen.netlify.app](https://narutogen.netlify.app/) directly into your Foundry VTT game using the Naruto 5e system.

## Features

- ✅ Import complete NPC data including stats, abilities, jutsu, and weapons
- ✅ Automatic conversion to Foundry VTT actor format
- ✅ User-friendly dialog interface
- ✅ Support for JSON file upload or paste
- ✅ Preview before importing
- ✅ Preserves all NPC data including:
  - Ability scores and modifiers
  - HP and Chakra pools
  - AC and movement speed
  - Clan and rank information
  - Jutsu with proper chakra costs and effects
  - Weapons with damage and properties
  - Special abilities

## Installation

### Method 1: Manual Installation

1. Download the latest release
2. Extract the zip file
3. Place the `naruto-npc-importer` folder in your Foundry `Data/modules` directory
4. Restart Foundry VTT
5. Enable the module in your world's module settings

### Method 2: Foundry Module Browser

1. Open Foundry VTT
2. Go to "Add-on Modules"
3. Click "Install Module"
4. Search for "Naruto NPC Importer"
5. Click "Install"

## Usage

### Step 1: Generate NPC Data

1. Go to [narutogen.netlify.app](https://narutogen.netlify.app/)
2. Generate your desired NPC
3. Export the NPC data (should give you JSON format)
4. Copy the JSON or save it as a `.json` file

### Step 2: Import into Foundry

#### Option A: Create a Macro

1. Create a new Script Macro in Foundry
2. Paste this code:
```javascript
showNarutoImporterDialog();
```
3. Save and run the macro whenever you want to import NPCs

#### Option B: Using the Dialog (Recommended)

1. Open your Foundry VTT game
2. Open the macro directory or run this command in the console:
   ```javascript
   showNarutoImporterDialog()
   ```
3. Choose your import method:
   - **Upload JSON File**: Click "Choose File" and select your exported JSON
   - **Paste JSON**: Copy the JSON text and paste it into the text area, then click "Load JSON"
4. Review the preview to ensure data loaded correctly
5. Click "Import NPC"
6. The NPC will be created and its character sheet will open automatically

#### Option C: Using Console

```javascript
// Paste your NPC JSON data
const npcData = {
  "name": "Aburame Genin",
  "clan": "Aburame",
  // ... rest of your JSON data
};

// Import the NPC
await narutoImporter.importNPC(npcData);
```

## Sample Import

Here's what gets imported from the example data:

```json
{
  "name": "Aburame Genin",
  "clan": "Aburame",
  "rank": "Genin",
  "cr": 3,
  "hp": 31,
  "chakra": 30,
  "ac": 18,
  "jutsu": [
    {
      "name": "Human Cocoon",
      "rank": "D",
      "chakraCost": 3
    },
    // ... more jutsu
  ],
  "weapons": [
    {
      "name": "Fuma-Shuriken",
      "damage": "1d8"
    }
  ]
}
```

This creates a complete actor with:
- ✅ All ability scores (STR, DEX, CON, INT, WIS, CHA)
- ✅ HP and Chakra tracking
- ✅ Armor Class
- ✅ Movement speed
- ✅ All jutsu as spell items with proper chakra costs
- ✅ All weapons as weapon items
- ✅ Special abilities as features
- ✅ Biographical information

## Customization

### Adjusting System Compatibility

If your Naruto 5e system uses different property names, edit `naruto-npc-importer.js`:

```javascript
// Change the system ID if needed
this.systemId = "your-system-id";
```

### Custom Images

Update the image paths in the `getDefaultImage()`, `getJutsuImage()`, and `getWeaponImage()` methods:

```javascript
getDefaultImage(clan) {
  const clanImages = {
    "Aburame": "path/to/your/aburame/image.png",
    "Uchiha": "path/to/your/uchiha/image.png",
    // Add more clans
  };
  return clanImages[clan] || "icons/svg/mystery-man.svg";
}
```

### Custom Item Types

If your system uses different item types (e.g., "jutsu" instead of "spell"), modify:

```javascript
convertJutsu(jutsu) {
  return {
    name: jutsu.name,
    type: "jutsu", // Change this to match your system
    // ... rest of conversion
  };
}
```

## Troubleshooting

### Import Button is Disabled
- Make sure you've loaded valid JSON data first
- Check the browser console for any errors

### NPC Appears but Data is Missing
- Verify your JSON has all required fields
- Check if your Naruto 5e system uses different property names
- Open the actor and manually verify the imported data

### Jutsu Not Showing Correctly
- The module assumes spell-type items
- If your system uses a custom "jutsu" type, update the `convertJutsu()` method

### Console Errors
- Check that the Naruto 5e system is installed and active
- Ensure you're using a compatible Foundry version (v11+)
- Verify the JSON format matches the expected structure

## Development

### Project Structure
```
naruto-npc-importer/
├── module.json              # Module manifest
├── naruto-npc-importer.js   # Core import logic
├── naruto-importer-dialog.js # UI dialog
├── templates/
│   └── import-dialog.html   # Dialog HTML template
├── lang/
│   └── en.json             # Localization
└── README.md               # This file
```


## Credits

- Based on NPCs from [narutogen.netlify.app](https://narutogen.netlify.app/)
- Built for the Naruto 5e system on Foundry VTT


**Note**: This module is not affiliated with or endorsed by narutogen.netlify.app or the Naruto 5e system creators. It's a community tool to help GMs quickly import NPCs into their games.
