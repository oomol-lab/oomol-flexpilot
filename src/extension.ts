import * as vscode from "vscode";
import { I18nManager } from "./locales";
import { logger } from "./logger";
import { storage } from "./storage";

/**
 * Activates the extension.
 */
export async function activate(context: vscode.ExtensionContext) {
  // log system information
  logger.info("VS Code Version:", vscode.version);
  logger.info("Node Version:", process.version);
  logger.info("Platform:", process.platform);
  logger.info("CPU Architecture:", process.arch);
  logger.info("Extension ID:", context.extension.id);
  logger.info("Extension Version:", context.extension.packageJSON.version);
  logger.info("Extension Path:", context.extension.extensionPath);

  // log workspace information
  (vscode.workspace.workspaceFolders || []).forEach((folder) => {
    logger.info("Workspace Name:", folder.name);
    logger.info("Workspace URI:", folder.uri.toString());
  });
  logger.info("Environment Variables:", process.env);

  // Initialize the storage manager
  storage.setContext(context);

  await I18nManager.crate(vscode.env.language);
  logger.info("I18nManager initialized with locale:", vscode.env.language);

  // Register the logger with the context
  context.subscriptions.push(logger);

  // lazy load the extension
  await (await import("./lazy-load.js")).activate();
}
