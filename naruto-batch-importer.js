/**
 * Naruto NPC Batch Importer
 * Import multiple NPCs at once
 */

class NarutoBatchImporter {
  constructor() {
    this.importer = window.narutoImporter;
  }

  /**
   * Import multiple NPCs from an array
   * @param {Array} npcArray - Array of NPC data objects
   * @param {Object} options - Import options
   * @returns {Promise<Array>} - Array of created actors
   */
  async importBatch(npcArray, options = {}) {
    const {
      createFolder = true,
      folderName = "Imported NPCs",
      skipExisting = true,
      onProgress = null
    } = options;

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // Create folder if requested
    let folder = null;
    if (createFolder) {
      folder = await this._getOrCreateFolder(folderName);
    }

    // Import each NPC
    for (let i = 0; i < npcArray.length; i++) {
      const npcData = npcArray[i];
      
      // Progress callback
      if (onProgress) {
        onProgress(i + 1, npcArray.length, npcData.name);
      }

      try {
        // Check if NPC already exists
        if (skipExisting) {
          const existing = game.actors.find(a => a.name === npcData.name && a.type === "npc");
          if (existing) {
            results.skipped.push(npcData.name);
            continue;
          }
        }

        // Import the NPC
        const actor = await this.importer.importNPC(npcData);
        
        // Add to folder if created
        if (folder && actor) {
          await actor.update({ folder: folder.id });
        }

        results.success.push(actor);
      } catch (error) {
        console.error(`Failed to import ${npcData.name}:`, error);
        results.failed.push({
          name: npcData.name,
          error: error.message
        });
      }
    }

    // Show summary
    this._showSummary(results);

    return results;
  }

  /**
   * Import NPCs from a JSON file containing an array
   * @param {File} file - File object
   * @returns {Promise<Array>} - Array of created actors
   */
  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const npcArray = Array.isArray(data) ? data : [data];
          const results = await this.importBatch(npcArray, {
            onProgress: (current, total, name) => {
              ui.notifications.info(`Importing ${current}/${total}: ${name}`);
            }
          });
          resolve(results);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  }

  /**
   * Get or create a folder
   */
  async _getOrCreateFolder(folderName) {
    let folder = game.folders.find(f => f.name === folderName && f.type === "Actor");
    
    if (!folder) {
      folder = await Folder.create({
        name: folderName,
        type: "Actor",
        parent: null
      });
    }

    return folder;
  }

  /**
   * Show import summary dialog
   */
  _showSummary(results) {
    const total = results.success.length + results.failed.length + results.skipped.length;
    
    let content = `<div style="padding: 10px;">`;
    content += `<h3>Import Complete</h3>`;
    content += `<p><strong>Total:</strong> ${total}</p>`;
    content += `<p style="color: green;"><strong>Success:</strong> ${results.success.length}</p>`;
    
    if (results.skipped.length > 0) {
      content += `<p style="color: orange;"><strong>Skipped:</strong> ${results.skipped.length}</p>`;
      content += `<ul style="max-height: 150px; overflow-y: auto;">`;
      results.skipped.forEach(name => {
        content += `<li>${name} (already exists)</li>`;
      });
      content += `</ul>`;
    }
    
    if (results.failed.length > 0) {
      content += `<p style="color: red;"><strong>Failed:</strong> ${results.failed.length}</p>`;
      content += `<ul style="max-height: 150px; overflow-y: auto;">`;
      results.failed.forEach(failure => {
        content += `<li>${failure.name}: ${failure.error}</li>`;
      });
      content += `</ul>`;
    }
    
    content += `</div>`;

    new Dialog({
      title: "Batch Import Summary",
      content: content,
      buttons: {
        ok: {
          icon: '<i class="fas fa-check"></i>',
          label: "OK"
        }
      }
    }).render(true);
  }
}

// Batch Import Dialog
class NarutoBatchImporterDialog extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "naruto-batch-importer",
      title: "Naruto Batch NPC Importer",
      template: "modules/naruto-npc-importer/templates/batch-import-dialog.html",
      width: 500,
      height: "auto",
      classes: ["naruto-batch-importer"]
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#batch-file-input").on("change", this._onFileSelect.bind(this));
    html.find("#start-batch-import").on("click", this._onStartImport.bind(this));
    html.find("#cancel-batch").on("click", () => this.close());
  }

  async _onFileSelect(event) {
    this.file = event.target.files[0];
    
    if (this.file) {
      document.getElementById("start-batch-import").disabled = false;
      ui.notifications.info(`File selected: ${this.file.name}`);
    }
  }

  async _onStartImport() {
    if (!this.file) {
      ui.notifications.warn("Please select a file first");
      return;
    }

    const batchImporter = new NarutoBatchImporter();
    
    try {
      const folderName = document.getElementById("folder-name").value || "Imported NPCs";
      const skipExisting = document.getElementById("skip-existing").checked;
      const createFolder = document.getElementById("create-folder").checked;

      await batchImporter.importFromFile(this.file);
      this.close();
    } catch (error) {
      ui.notifications.error(`Batch import failed: ${error.message}`);
      console.error(error);
    }
  }
}

// Create global instances
window.NarutoBatchImporter = NarutoBatchImporter;
window.NarutoBatchImporterDialog = NarutoBatchImporterDialog;
window.narutoBatchImporter = new NarutoBatchImporter();

// Helper function
window.showNarutoBatchImporter = function() {
  new NarutoBatchImporterDialog().render(true);
};

// Example usage macro:
/*
// Import single array of NPCs
const npcs = [
  { name: "NPC 1", ... },
  { name: "NPC 2", ... }
];
await narutoBatchImporter.importBatch(npcs);

// Or use the dialog
showNarutoBatchImporter();
*/
