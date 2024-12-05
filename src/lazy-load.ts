import { CommitMessageCommand } from "./commands/commit-message";
import { ConfigureModelCommand } from "./commands/configure-model";
import { ReloadCommand } from "./commands/reload";
import { StatusIconMenuCommand } from "./commands/status-icon-menu";
import { events } from "./events";
import { logger } from "./logger";
import { ProxyModelProvider } from "./models";
import { SessionManager } from "./session";
import { updateRuntimeArguments } from "./startup";
import { setContext } from "./utilities";
import { VariablesManager } from "./variables";

/**
 * Activates the extension.
 */
export const activate = async () => {
  // set initial values to context variables
  setContext("isLoaded", false);
  setContext("isError", false);
  setContext("isLoggedIn", false);
  try {
    // Update the runtime arguments
    await updateRuntimeArguments();

    // Register the variables manager
    VariablesManager.register();

    // Register the proxy model
    ProxyModelProvider.register();

    // Register the commands
    StatusIconMenuCommand.register();
    CommitMessageCommand.register();
    ConfigureModelCommand.register();
    ReloadCommand.register();

    // Handle the session change
    SessionManager.register();

    // Update the status bar icon
    events.fire({
      name: "inlineCompletionProviderUpdated",
      payload: { updatedAt: Date.now() },
    });

    // Set the loaded context
    setContext("isLoaded", true);
  } catch (error) {
    // Set the error context
    setContext("isError", true);

    // Log the error to the output channel
    logger.error(error as Error);
  }
};
