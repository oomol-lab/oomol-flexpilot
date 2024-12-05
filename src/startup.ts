import * as vscode from "vscode";
import { logger } from "./logger";

/**
 * Show notification to restart VS Code to apply changes
 */
const triggerVscodeRestart = async () => {
  // Get the current value of the titleBarStyle setting
  const existingValue = vscode.workspace
    .getConfiguration("window")
    .get("titleBarStyle");

  // Toggle the value of the titleBarStyle setting
  await vscode.workspace
    .getConfiguration("window")
    .update(
      "titleBarStyle",
      existingValue === "native" ? "custom" : "native",
      vscode.ConfigurationTarget.Global,
    );

  // Sleep for few milliseconds
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Toggle the value back to the original value
  await vscode.workspace
    .getConfiguration("window")
    .update(
      "titleBarStyle",
      existingValue === "native" ? "native" : "custom",
      vscode.ConfigurationTarget.Global,
    );
};

/**
 * Checks if the proposed API is disabled in the current environment.
 */
const isProposedApiDisabled = async () => {
  try {
    await vscode.lm.fileIsIgnored(vscode.Uri.file("/"), {
      isCancellationRequested: false,
      onCancellationRequested: () => new vscode.EventEmitter(),
    });
    return false;
  } catch (error) {
    logger.error(error as Error);
    logger.error("Proposed API disabled for Flexpilot");
    return true;
  }
};

/**
 * Checks if GitHub Copilot is active in the current environment.
 */
const isGitHubCopilotActive = () => {
  // Get the extension by its identifier
  const extension = vscode.extensions.getExtension("GitHub.copilot");

  // Check if the extension is installed
  if (extension) {
    logger.info("GitHub Copilot is installed");
    return true;
  } else {
    logger.info("GitHub Copilot is not installed.");
    return false;
  }
};

/**
 * updates the runtime arguments configuration to enable proposed API, log level, etc ...
 */
export const updateRuntimeArguments = async () => {
  // Initialize the flag to require a restart
  let requireRestart = false;

  // Check if the proposed API is disabled
  if (await isProposedApiDisabled()) {
    logger.warn("Proposed API is disabled, restart required");
    requireRestart = true;
  }

  // Notify the user about the required restart
  if (requireRestart) {
    // Show a notification to restart VS Code
    vscode.window
      .showInformationMessage(
        "Flexpilot: Please restart VS Code to apply the latest updates",
        "Restart",
        "View Logs",
      )
      .then((selection) => {
        if (selection === "Restart") {
          triggerVscodeRestart();
        } else if (selection === "View Logs") {
          logger.showOutputChannel();
        }
      });

    // Throw an error to stop the execution
    throw new Error("Flexpilot: VS Code restart required");
  }

  // Check if GitHub Copilot is active
  if (isGitHubCopilotActive()) {
    logger.warn("GitHub Copilot is active");
    // Notify the user about GitHub Copilot compatibility
    vscode.window
      .showWarningMessage(
        "To ensure Flexpilot functions correctly, kindly disable GitHub Copilot and reload the window",
        "Reload Window",
        "View Logs",
      )
      .then((selection) => {
        if (selection === "Reload Window") {
          vscode.commands.executeCommand("workbench.action.reloadWindow");
        } else if (selection === "View Logs") {
          logger.showOutputChannel();
        }
      });

    // Throw an error to stop the execution
    throw new Error(
      "Flexpilot: GitHub Copilot is active and needs to be disabled",
    );
  }

  // Log the successful activation
  logger.info("Successfully updated runtime arguments");
};
