/**
 * Dialog UI for Naruto NPC Importer
 */

class NarutoImporterDialog extends Application {
  constructor(options = {}) {
    super(options);
    this.npcData = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "naruto-npc-importer",
      title: "Naruto NPC Importer",
      template: "modules/naruto-npc-importer/templates/import-dialog.html",
      width: 600,
      height: "auto",
      classes: ["naruto-importer"],
      resizable: true
    });
  }

  getData() {
    return {
      npcData: this.npcData
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // File upload
    html.find("#npc-file-input").on("change", this._onFileSelect.bind(this));
    
    // JSON paste
    html.find("#import-from-json").on("click", this._onImportFromJSON.bind(this));
    
    // Import button
    html.find("#import-npc").on("click", this._onImportNPC.bind(this));
    
    // Cancel button
    html.find("#cancel-import").on("click", () => this.close());
  }

  async _onFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target.result);
        this.npcData = jsonData;
        this._displayPreview(jsonData);
        ui.notifications.info("NPC data loaded successfully");
      } catch (error) {
        ui.notifications.error("Invalid JSON file");
        console.error(error);
      }
    };
    reader.readAsText(file);
  }

  async _onImportFromJSON() {
    const jsonText = document.getElementById("json-input").value.trim();
    if (!jsonText) {
      ui.notifications.warn("Please paste JSON data");
      return;
    }

    try {
      const jsonData = JSON.parse(jsonText);
      this.npcData = jsonData;
      this._displayPreview(jsonData);
      ui.notifications.info("NPC data loaded successfully");
    } catch (error) {
      ui.notifications.error("Invalid JSON format");
      console.error(error);
    }
  }

  _displayPreview(data) {
    const preview = document.getElementById("npc-preview");
    if (!preview) return;

    preview.innerHTML = `
      <div class="npc-preview-content">
        <h3>${data.name}</h3>
        <div class="preview-details">
          <p><strong>Clan:</strong> ${data.clan}</p>
          <p><strong>Rank:</strong> ${data.rank}</p>
          <p><strong>CR:</strong> ${data.cr}</p>
          <p><strong>HP:</strong> ${data.hp}/${data.maxHp}</p>
          <p><strong>Chakra:</strong> ${data.chakra}/${data.maxChakra}</p>
          <p><strong>AC:</strong> ${data.ac}</p>
          <p><strong>Jutsu:</strong> ${data.jutsu?.length || 0}</p>
          <p><strong>Weapons:</strong> ${data.weapons?.length || 0}</p>
        </div>
      </div>
    `;

    // Enable import button
    document.getElementById("import-npc").disabled = false;
  }

  async _onImportNPC() {
    if (!this.npcData) {
      ui.notifications.warn("No NPC data loaded");
      return;
    }

    try {
      const actor = await window.narutoImporter.importNPC(this.npcData);
      ui.notifications.info(`Successfully imported ${this.npcData.name}`);
      this.close();
      
      // Open the actor sheet
      if (actor) {
        actor.sheet.render(true);
      }
    } catch (error) {
      ui.notifications.error(`Import failed: ${error.message}`);
      console.error(error);
    }
  }
}

// Create dialog function
function showNarutoImporterDialog() {
  new NarutoImporterDialog().render(true);
}

// Add to global scope
window.NarutoImporterDialog = NarutoImporterDialog;
window.showNarutoImporterDialog = showNarutoImporterDialog;

// Add macro for easy access
Hooks.once("ready", () => {
  console.log("Naruto NPC Importer | Ready");
  
  // Add to compendium sidebar button if possible
  if (game.user.isGM) {
    console.log("Naruto NPC Importer | Use 'showNarutoImporterDialog()' to open importer");
  }
});
