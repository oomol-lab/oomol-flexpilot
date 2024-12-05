import * as vscode from "vscode";
import { events } from "../events";
import InlineChatParticipant from "../inline-chat";
import { logger } from "../logger";
import PanelChatParticipant from "../panel-chat";
import { storage } from "../storage";

export class ReloadCommand {
  static register() {
    storage.getContext().subscriptions.push(
      vscode.commands.registerCommand("oopilot.reload", () => {
        InlineChatParticipant.reload();
        PanelChatParticipant.reload();
        events.fire({
          name: "inlineCompletionProviderUpdated",
          payload: { updatedAt: Date.now() },
        });
        events.fire({
          name: "modelProvidersUpdated",
          payload: { updatedAt: Date.now() },
        });
      }),
    );
    logger.info("ReloadCommand registered");
  }
}
