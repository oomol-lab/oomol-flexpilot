import * as vscode from "vscode";
import packageJson from "../package.json";
import { ILocationName, IModelConfig, IUsagePreference } from "./interfaces";
import { logger } from "./logger";

/**
 * IKeyValueStore interface to define the structure of permanent key-value store.
 */
interface IKeyValueStore {
  "github.support": boolean;
  "completions.disabled.languages": string[];
  "argv.path": string;
}

/**
 * IWorkspaceConfigKeys type to define the keys of workspace configuration.
 */
type IWorkspaceConfigKeys =
  keyof (typeof packageJson)["contributes"]["configuration"]["properties"];

/**
 * StorageManager class provides a centralized state management mechanism for the extension.
 * It implements the Singleton pattern to ensure a single instance of the state across the application.
 */
class StorageManager {
  private githubSession: vscode.AuthenticationSession | undefined;
  private context: vscode.ExtensionContext | undefined;

  /**
   * Creates a new instance of StorageManager.
   * @param {vscode.ExtensionContext} extensionContext - The extension context provided by VS Code
   */
  constructor() {
    logger.info("StorageManager instance created");
  }

  /**
   * Sets the extension context for the storage manager.
   * @param {vscode.ExtensionContext} extensionContext - The extension context provided by VS Code
   */
  public setContext(extensionContext: vscode.ExtensionContext) {
    this.context = extensionContext;
  }

  /**
   * Retrieves the extension context
   * @returns {vscode.ExtensionContext} The extension context provided by VS Code or undefined
   */
  public getContext(): vscode.ExtensionContext {
    if (!this.context) {
      throw new Error("Storage manager not initialized");
    }
    return this.context;
  }

  /**
   * Retrieves a value from permanent storage.
   */
  public get = <T1 extends keyof IKeyValueStore>(
    key: T1,
  ): IKeyValueStore[T1] | undefined => {
    if (!this.context) {
      throw new Error("Storage manager not initialized");
    }
    logger.debug(`Getting global state for key: ${key}`);
    return this.context.globalState.get(key);
  };

  /**
   * Sets a value in permanent storage.
   */
  public set = async <T1 extends keyof IKeyValueStore>(
    key: T1,
    value: IKeyValueStore[T1] | undefined,
  ): Promise<void> => {
    if (!this.context) {
      throw new Error("Storage manager not initialized");
    }
    logger.debug(`Setting global state for key: ${key}`);
    return this.context.globalState.update(key, value);
  };

  public session = {
    /**
     * Retrieves the GitHub session from the storage.
     */
    get: (): vscode.AuthenticationSession => {
      if (!this.githubSession) {
        throw new Error("GitHub session not found");
      }
      return this.githubSession;
    },

    /**
     * Sets the GitHub session.
     */
    set: (session: vscode.AuthenticationSession | undefined) => {
      this.githubSession = session;
    },
  };

  /**
   * Custom session info instead of GitHub.
   */
  public customSession = {
    get: (): vscode.AuthenticationSession | undefined => {
      if (!this.context) {
        throw new Error("Storage manager not initialized");
      }
      return this.context.globalState.get("customSession");
    },
    icon: (): vscode.Uri | undefined => {
      if (!this.context) {
        throw new Error("Storage manager not initialized");
      }
      const url = this.context.globalState.get("customIcon");
      if (url) {
        return vscode.Uri.parse(url as string);
      }
    },
  };

  public models = {
    /**
     * Retrieves a value from model providers.
     */
    get: <T extends IModelConfig>(key: string): T | undefined => {
      if (!this.context) {
        throw new Error("Storage manager not initialized");
      }
      const storageKey = `model.providers.${key}`;
      logger.debug(`Getting model config for key: ${storageKey}`);
      return this.context.globalState.get<T>(storageKey);
    },

    /**
     * Sets a value in model providers.
     */
    set: async <T extends IModelConfig>(key: string, value?: T) => {
      if (!this.context) {
        throw new Error("Storage manager not initialized");
      }
      const storageKey = `model.providers.${key}`;
      logger.debug(`Setting model config for key: ${storageKey}`);
      return this.context.globalState.update(storageKey, value);
    },

    /**
     * Lists all the model providers.
     */
    list: (): string[] => {
      if (!this.context) {
        throw new Error("Storage manager not initialized");
      }
      logger.debug(`Listing global state for key: model.providers`);
      return this.context.globalState
        .keys()
        .filter((item) => item.startsWith("model.providers."))
        .map((item) => item.replace("model.providers.", ""));
    },
  };

  public usage = {
    /**
     * Retrieves a value from usage preferences.
     */
    get: (key: ILocationName): IUsagePreference | undefined => {
      if (!this.context) {
        throw new Error("Storage manager not initialized");
      }
      const storageKey = `usage.preferences.${key}`;
      logger.debug(`Getting usage preference for key: ${storageKey}`);
      return this.context.globalState.get<IUsagePreference>(storageKey);
    },

    /**
     * Sets a value in usage preferences.
     */
    set: async <T extends IUsagePreference>(
      key: ILocationName,
      value: T | undefined,
    ) => {
      if (!this.context) {
        throw new Error("Storage manager not initialized");
      }
      const storageKey = `usage.preferences.${key}`;
      logger.debug(`Setting usage preference for key: ${storageKey}`);
      return this.context.globalState.update(storageKey, value);
    },
  };

  public workspace = {
    /**
     * Retrieves a value from workspace configuration.
     */
    get: <T>(key: IWorkspaceConfigKeys): T => {
      logger.debug(`Getting workspace config for key: flexpilot.${key}`);
      return vscode.workspace.getConfiguration().get<T>(key) as T;
    },

    /**
     * Sets a value in workspace configuration.
     */
    set: async <T>(key: IWorkspaceConfigKeys, value: T): Promise<void> => {
      logger.debug(`Setting workspace config for key: flexpilot.${key}`);
      return vscode.workspace
        .getConfiguration()
        .update(key, value, vscode.ConfigurationTarget.Global);
    },
  };
}

// Export the storage manager instance
export const storage = new StorageManager();
