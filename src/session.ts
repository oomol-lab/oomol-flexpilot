import axios from "axios";
import * as vscode from "vscode";
import packageJson from "../package.json";
import InlineCompletionProvider from "./completion";
import InlineChatParticipant from "./inline-chat";
import { logger } from "./logger";
import PanelChatParticipant from "./panel-chat";
import { ModelProviderManager } from "./providers";
import { storage } from "./storage";
import { setContext } from "./utilities";

/**
 * SessionManager class to handle VSCode extension session management and related events.
 * This class follows the Singleton pattern to ensure only one instance exists.
 */
export class SessionManager extends vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private static instance: SessionManager;

  private constructor(
    private readonly extensionContext = storage.getContext(),
  ) {
    // Call the parent constructor
    super(() => {
      this.disposables.forEach((disposable) => disposable.dispose());
      this.disposeSessionFeatures();
      logger.info("Session manager disposed");
    });

    // Register the session manager
    extensionContext.subscriptions.push(this);

    // Initialize the session manager
    logger.info("Session manager initialized");
  }

  /**
   * Gets the singleton instance of SessionManager.
   */
  public static async register() {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
      SessionManager.instance.registerSessionFeatures();
      // SessionManager.instance.handleSessionChange();
      logger.debug("New SessionManager instance created");
    }
  }

  private async checkNewlyInstalled() {
    const globalStorageUri = this.extensionContext.globalStorageUri;
    const flagUri = vscode.Uri.joinPath(globalStorageUri, "installed_at");

    // Check if the globalStorageUri folder exists in storage
    try {
      await vscode.workspace.fs.stat(globalStorageUri);
    } catch (error) {
      logger.warn(`Folder not found at: ${globalStorageUri}`);
      logger.warn(String(error));
      vscode.workspace.fs.createDirectory(globalStorageUri);
    }

    // Check if the flag URI file exists in storage
    try {
      await vscode.workspace.fs.stat(flagUri);
      logger.debug(`Extension already installed, restoring state`);
    } catch (error) {
      logger.warn(String(error));
      logger.debug("Extension newly installed, clearing state");
      await this.clearGlobalState();
      await vscode.workspace.fs.writeFile(flagUri, new Uint8Array(0));
    }
  }

  /**
   * Handles changes in authentication sessions.
   */
  public async handleSessionChange(): Promise<void> {
    const session = await vscode.authentication.getSession("github", [
      "public_repo",
    ]);
    await this.checkNewlyInstalled();
    storage.session.set(session);
    setContext("isLoggedIn", !!session);
    if (session) {
      this.handleActiveSession();
    } else {
      this.handleNoSession();
    }
    logger.debug("Session change handled successfully");
  }

  /**
   * Handles the case when there's no active session.
   */
  private handleNoSession(): void {
    this.disposeSessionFeatures();
    this.clearGlobalState();
    this.showSignInPrompt();
    logger.info("No active session, extension deactivated");
  }

  /**
   * Handles the case when there's an active session.
   */
  private async handleActiveSession(): Promise<void> {
    logger.info("GitHub session established");
    if (await storage.get("github.support")) {
      this.starGitHubRepository();
    } else {
      this.showGithubSupportNotification();
    }
    this.registerSessionFeatures();
    await ModelProviderManager.getInstance().updateProviders();
  }

  /**
   * Clears the global state.
   */
  private async clearGlobalState(): Promise<void> {
    const keys = this.extensionContext.globalState.keys();
    for (const key of keys) {
      await this.extensionContext.globalState.update(key, undefined);
    }
    logger.debug("Global state cleared");
  }

  /**
   * Shows a sign-in prompt to the user.
   */
  private showSignInPrompt(): void {
    vscode.window
      .showInformationMessage(
        "Please sign in to your GitHub account to start using Flexpilot",
        "Sign in to Chat",
      )
      .then((selection) => {
        if (selection === "Sign in to Chat") {
          vscode.commands.executeCommand("flexpilot.github.signin");
        }
      });
  }

  /**
   * Displays a notification to support the project on GitHub.
   */
  private showGithubSupportNotification(): void {
    vscode.window
      .showInformationMessage(
        "Support our mission to make AI accessible - give us a GitHub star by just clicking `Yes` button!",
        "Yes (recommended)",
        "No, I don't like to support",
      )
      .then(async (support) => {
        if (support === "Yes (recommended)") {
          storage.set("github.support", true);
          this.starGitHubRepository().then(() => this.showSponsorPrompt());
        }
      });
  }

  /**
   * Shows a prompt to become a sponsor.
   */
  private showSponsorPrompt(): void {
    vscode.window
      .showInformationMessage(
        "Thanks for helping us make AI open and accessible to everyone!",
        "Become a Sponsor",
      )
      .then(async (sponsor) => {
        if (sponsor === "Become a Sponsor") {
          vscode.env.openExternal(vscode.Uri.parse(packageJson.repository.url));
        }
      });
  }

  /**
   * Stars the GitHub repository to support the project.
   */
  private async starGitHubRepository(): Promise<void> {
    try {
      const githubSession = storage.session.get();
      if (!githubSession) {
        return;
      }
      await axios.put(
        "https://api.github.com/user/starred/flexpilot-ai/vscode-extension",
        null,
        {
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            Authorization: `Bearer ${githubSession.accessToken}`,
          },
        },
      );
    } catch (error) {
      logger.warn(`Unable to star the GitHub repository: ${error}`);
    }
  }

  /**
   * Disposes of the current session features.
   */
  private disposeSessionFeatures(): void {
    PanelChatParticipant.dispose();
    InlineCompletionProvider.dispose();
    InlineChatParticipant.dispose();
    logger.debug("Session features disposed");
  }

  /**
   * Registers the features for the current session.
   */
  private registerSessionFeatures(): void {
    try {
      PanelChatParticipant.register();
      InlineCompletionProvider.register();
      InlineChatParticipant.register();
      logger.info("Session features registered");
    } catch (error) {
      logger.error(error as Error);
      logger.notifyError(`Failed to register session features: ${error}`);
    }
  }
}
