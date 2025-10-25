// Naruto NPC Importer - Quick Import Macro
// Use this macro to quickly open the NPC importer dialog

// Check if the importer is loaded
if (typeof showNarutoImporterDialog === 'undefined') {
  ui.notifications.error("Naruto NPC Importer module is not enabled. Please enable it in your module settings.");
} else {
  // Open the importer dialog
  showNarutoImporterDialog();
}
