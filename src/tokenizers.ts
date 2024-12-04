import { Tokenizer } from "@flexpilot-ai/tokenizers";
import assert from "assert";
import axios from "axios";
import { createHash } from "crypto";
import * as vscode from "vscode";
import { logger } from "./logger";
import { storage } from "./storage";
import { getCompletionModelMetadata } from "./utilities";

export class Tokenizers {
  /**
   * Get the tokenizer metadata for the given model.
   * @param {string} model - The name of the model.
   */
  private static async metadata(model: string) {
    // Get the configuration for the model
    const metadata = getCompletionModelMetadata(model);

    // Check if the model configuration exists
    if (!metadata) {
      throw new Error("No tokenizer URL found for model");
    }

    // Prepare the tokenizer file paths
    const globalStorageUri = storage.getContext().globalStorageUri;
    const fileId = createHash("sha512")
      .update(metadata.tokenizerUrl)
      .digest("hex");
    const tokenizerFolder = vscode.Uri.joinPath(globalStorageUri, "tokenizers");
    const tokenizerFileUri = vscode.Uri.joinPath(tokenizerFolder, fileId);

    // Check if the tokenizer folder exists in storage
    try {
      await vscode.workspace.fs.stat(tokenizerFolder);
    } catch (error) {
      logger.warn(`Folder not found at: ${tokenizerFolder}`);
      logger.error(error as Error);
      vscode.workspace.fs.createDirectory(tokenizerFolder);
    }

    // Return the metadata and the path to the tokenizer file
    return { metadata, tokenizerFileUri };
  }

  /**
   * Get the tokenizer for the given model.
   * @param {string} model - The name of the model.
   */
  public static async get(model: string): Promise<Tokenizer> {
    const { tokenizerFileUri } = await this.metadata(model);
    logger.debug(`Loading tokenizer from: ${tokenizerFileUri}`);
    return new Tokenizer(
      Array.from(await vscode.workspace.fs.readFile(tokenizerFileUri)),
    );
  }

  /**
   * Download the tokenizer for the given model.
   * @param {string} model - The name of the model.
   * @returns {Promise<Tokenizer>} The tokenizer object.
   */
  public static async download(model: string): Promise<Tokenizer> {
    const { metadata, tokenizerFileUri } = await this.metadata(model);
    const response = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Flexpilot",
        cancellable: false,
      },
      async (progress) => {
        progress.report({
          message: "Downloading tokenizer.json",
        });
        return await axios.get(metadata.tokenizerUrl, {
          responseType: "arraybuffer",
        });
      },
    );
    const byteArray = Array.from(new Uint8Array(response.data));
    const tokenizer = new Tokenizer(byteArray);
    assert(tokenizer.encode("test string", false).length > 0);
    await vscode.workspace.fs.writeFile(
      tokenizerFileUri,
      new Uint8Array(response.data),
    );
    return tokenizer;
  }
}
