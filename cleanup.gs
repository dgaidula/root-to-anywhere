function deleteCLaudeTrashFiles() {
  var files = DriveApp.searchFiles(
    "title contains 'z_claude_trash_' and trashed = false"
  );
  
  while (files.hasNext()) {
    var file = files.next();
    var parents = file.getParents();
    
    // Only delete if file is at root (parent is root folder)
    if (parents.hasNext() && parents.next().getId() === DriveApp.getRootFolder().getId()) {
      file.setTrashed(true);
      Logger.log("Trashed: " + file.getName());
    }
  }
}
