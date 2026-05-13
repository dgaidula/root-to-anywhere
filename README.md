# root-to-anywhere

**A workaround for Claude's Google Drive API subfolder write restriction — with automated cleanup via Google Apps Script.**

---

## What Works and What Doesn't

| Capability | Status |
|---|---|
| Read files anywhere | ✅ Works |
| Write files to root | ✅ Works |
| Create folders at root | ✅ Works |
| Create subfolders inside folders | ✅ Works |
| Copy files from root into any subfolder | ✅ Works (this is the workaround) |
| Write files directly into a subfolder | ❌ Blocked |

Folder creation at any level works fine — the restriction applies specifically to writing new files directly into subfolders. The workaround exploits the fact that `copy_file` is not subject to the same restriction as `create_file`.

---

## The Problem

When Claude (via the Google Drive MCP connector) attempts to write a file directly into a subfolder, it fails with:

```
User cannot add children to the specified folder.
```

This happens consistently across all subfolders, regardless of permissions, OAuth scope, folder ownership, or Workspace admin settings. Writing to Drive root works fine — just not into any child folder.

After extensive troubleshooting (OAuth scopes, Workspace admin policies, folder permissions, trusted app status, Chrome vs desktop app), the restriction appears to be a deliberate API-level security boundary — likely to prevent AI agents from silently writing files into arbitrary locations without a visible audit trail.

---

## The Discovery

The key insight came from testing the `copy_file` tool after direct writes failed. Copying a file *from* root *into* a subfolder works perfectly. So the workaround is:

1. Write the file to Drive root with a `z_claude_trash_` prefix
2. Copy it to the target folder with the intended filename
3. Automate cleanup of the prefixed root files

The `z_` prefix is intentional — it pushes temporary files to the bottom of root alphabetically, keeping your Drive visually clean while the cleanup runs.

---

## The Solution

### Two-Step Write Workflow

```
Step 1: Write to root      →   z_claude_trash_my_document.txt  (at root)
Step 2: Copy to folder     →   my_document.txt  (in target subfolder)
Step 3: Auto-cleanup       →   z_claude_trash_ files deleted by Apps Script
```

### Google Apps Script (Cleanup Automation)

Paste this into [script.google.com](https://script.google.com), set a nightly time trigger, and it will automatically trash any `z_claude_trash_` files at root:

```javascript
function deleteClaudeTrashFiles() {
  var files = DriveApp.searchFiles(
    "title contains 'z_claude_trash_' and trashed = false"
  );

  while (files.hasNext()) {
    var file = files.next();
    var parents = file.getParents();

    // Only delete if file is at root
    if (parents.hasNext() && parents.next().getId() === DriveApp.getRootFolder().getId()) {
      file.setTrashed(true);
      Logger.log("Trashed: " + file.getName());
    }
  }
}
```

**Setup steps:**
1. Go to [script.google.com](https://script.google.com) → New Project
2. Paste the script, replacing the default `myFunction`
3. Save and name the project (e.g. "Claude Trash Cleanup")
4. Click **Run** once to test and approve permissions
5. Go to **Triggers** (clock icon) → **Add Trigger**
   - Function: `deleteClaudeTrashFiles`
   - Event source: Time-driven
   - Type: Day timer → recommended 2–3 AM
6. Save

Files are moved to Trash (not permanently deleted), giving you a 30-day recovery window.

---

## Recommended File Formats for Drive Saves

A secondary discovery: saving `.docx` files via the Drive connector causes errors and slowdowns because Word documents must be base64 encoded, and the connector is unreliable with large strings — they can get truncated mid-write. 

Use these formats instead:

| Format | MIME Type | Use For |
|---|---|---|
| Google Doc | `application/vnd.google-apps.document` | Long-form documents — resumes, cover letters, research notes, playbooks |
| `.md` | `text/plain` | Discussion documents, synthesis notes, anything viewed in a Markdown reader. Mac recommendation: [MacDown](https://macdown.uranusjr.com) — free, beautiful, perfect for this use case |
| `.txt` | `text/plain` | Simple cut/paste items — statements, short copy, reference snippets. Mac recommendation: [BBEdit](https://www.barebones.com/products/bbedit/) — the gold standard plain text editor, free to use |
| `.docx` | via `present_files` + manual upload | Final documents only, handled outside the connector |

The key insight: **Google Docs are a first-class Drive format** and write cleanly via the API. Reserve `.docx` for final delivery only, generated locally by Claude and downloaded via `present_files`, then manually uploaded to Drive.

---

## Why This Works

Google's Drive API enforces different rules at the root level vs. child folders for third-party app access. Root writes are permitted; subfolder writes are blocked. The `copy_file` operation bypasses this restriction because it's treated as a copy action rather than a new file creation — and it carries the appropriate permissions from the source file.

---

## Organizing Apps Script Files in Drive

Google Apps Script projects appear as shortcut files in your Drive root (`.gscript` extension) and can't be moved into subfolders — they're managed separately at [script.google.com](https://script.google.com). 

To keep them tidy in your locally synced Drive folder, prefix them with `zScript_` so they sort to the bottom alphabetically and group together:

```
zScript_Claude Trash Cleanup.gscript
zScript_Another Script.gscript
```

Rename directly in Drive and it syncs automatically.

---

## Teaching Claude the Workflow

For Claude to follow this workflow automatically, you need to add it in **two places** — memory alone isn't enough, especially inside Projects.

### 1. Global Custom Instructions
Go to **Settings → General → Custom Instructions** and add:

> "When writing files to Google Drive, always use the two-step workflow: (1) write the file to root prefixed with 'z_claude_trash_', (2) copy it to the target folder with the clean filename. Direct subfolder writes are blocked; root-then-copy is the only working method."

This covers all regular conversations outside of Projects.

### 2. Project Instructions
If you use Claude Projects, paste the same instruction into each project's **Project Instructions** field. Project instructions take precedence over global settings, so Claude inside a project won't see your global custom instructions unless you add it there too.

### 3. Global Memory (optional but useful)
You can also tell Claude directly in any conversation and ask it to remember it. To verify it was saved, start a new conversation and ask:

> "What do you remember about writing files to Google Drive?"

Claude should recite the workflow back to you.

**Note:** Claude has two memory systems — **chat memory** (auto-generated from your conversations, visible under **Capabilities → Memory**) and **memory edits** (explicit instructions added during a conversation, stored separately and not currently visible in the UI). Both carry forward into future conversations, but Custom Instructions and Project Instructions are the most reliable way to ensure consistent behavior.

---

## Connector Settings (Claude.ai)

For a seamless experience with no auth prompts, set the Google Drive connector in Claude.ai to:

- **Read**: Always allow
- **Write (root)**: Always allow
- **Copy**: Always allow

---

## What This Enables

With this workaround in place, Claude can effectively read and write files anywhere in your Google Drive — making it practical for real workflows like saving documents, reports, drafts, or any generated content directly into organized folder structures.

---

## Discovered By

This solution was found through collaborative troubleshooting between **Dan** ([@dgaidula](https://github.com/dgaidula)) and Claude (Anthropic), working through the Google Drive MCP connector limitations systematically until a clean workaround emerged.

The `z_` prefix convention came out of thinking about the human experience of the workaround — not just making it functional, but making it livable day-to-day.

---

## License

MIT
