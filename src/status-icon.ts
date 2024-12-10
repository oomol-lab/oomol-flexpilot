import * as vscode from "vscode";
import { events } from "./events";
import { logger } from "./logger";
import { ModelProviderManager } from "./providers";
import { storage } from "./storage";

/**
 * Status icon manager to handle the status icon and state.
 * Created as a singleton to ensure a single instance across the application.
 */
class StatusIconManager {
  private static instance: StatusIconManager;
  private readonly statusBarItem: vscode.StatusBarItem;
  public state: "enabled" | "disabled" = "enabled";

  private constructor(extensionContext = storage.getContext()) {
    // Create the status bar item
    logger.info("StatusIconManager instance created");
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
    );

    extensionContext.subscriptions.push(this.statusBarItem);

    // Update the status bar icon when the inline completion provider is updated
    extensionContext.subscriptions.push(
      events.onFire((event) => {
        if (event.name === "inlineCompletionProviderUpdated") {
          this.updateStatusBarIcon();
        }
      }),
    );

    // Initialize the status bar item
    this.initializeStatusBar();
    this.updateStatusBarIcon();

    // Update the status bar icon when the active text editor changes
    vscode.window.onDidChangeActiveTextEditor(() => this.updateStatusBarIcon());
  }

  /**
   * Get the singleton instance of StatusIconManager.
   * @returns {StatusIconManager} The singleton instance.
   */
  public static getInstance(): StatusIconManager {
    if (!StatusIconManager.instance) {
      // Create a new instance if not already created
      StatusIconManager.instance = new StatusIconManager();
      logger.debug("New StatusIconManager instance created");
    }
    return StatusIconManager.instance;
  }

  /**
   * Initialize the status bar item with default properties.
   */
  private initializeStatusBar(): void {
    logger.debug("Initializing status bar");
    this.statusBarItem.accessibilityInformation = {
      label: "OOMOL Status",
    };
    this.statusBarItem.tooltip = "OOMOL Status";
    this.statusBarItem.name = "OOMOL Status";
    this.statusBarItem.command = "flexpilot.status.icon.menu";
    this.statusBarItem.show();
    logger.debug("Status bar initialized");
  }

  /**
   * Update the status bar icon based on the current state.
   */
  private updateStatusBarIcon(): void {
    let isCompletionsEnabled = true;

    // Check if the completions are enabled
    logger.debug("Updating status bar icon");
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      logger.debug("No active editor, setting status to disabled");
      isCompletionsEnabled = false;
    }

    // Check if the inline completion provider is available
    const provider =
      ModelProviderManager.getInstance().getProvider("Inline Completion");
    if (!provider) {
      logger.debug("No provider found, setting status to disabled");
      isCompletionsEnabled = false;
    }

    // Check if the language is disabled
    const config = storage.get("completions.disabled.languages") || [];
    if (editor && config.includes(editor.document.languageId)) {
      logger.debug("Language disabled, setting status to disabled");
      isCompletionsEnabled = false;
    }
    logger.debug("Setting status to enabled");

    // Update the status bar icon
    if (isCompletionsEnabled) {
      this.state = "enabled";
      this.statusBarItem.text = "$(flexpilot-default)";
    } else {
      this.state = "disabled";
      this.statusBarItem.text = "$(flexpilot-disabled)";
    }
  }

  /**
   * Reset the status bar item to default state.
   */
  public reset(): void {
    logger.debug("Resetting status bar");
    if (this.state === "disabled") {
      this.statusBarItem.text = "$(flexpilot-disabled)";
    } else {
      this.statusBarItem.text = "$(flexpilot-default)";
    }
  }

  /**
   * Set the status bar item to loading state.
   */
  public setLoading(): void {
    logger.debug("Setting status bar to loading");
    this.statusBarItem.text = "$(loading~spin)";
  }
}

// Export the StatusIconManager instance
export const statusIcon = StatusIconManager.getInstance();
