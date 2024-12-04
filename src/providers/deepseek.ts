import OpenAI from "openai";
import * as vscode from "vscode";
import {
  ICompletionModelConfig,
  ICompletionModelInvokeOptions,
  ICompletionModelProvider,
} from "../interfaces";
import { logger } from "../logger";
import { storage } from "../storage";

/**
 * Configuration interface for DeepSeek Completion Model.
 */
interface IDeepSeekCompletionModelConfig extends ICompletionModelConfig {
  apiKey: string;
  baseUrl: string;
  betaUrl: string;
}

/**
 * Default help prompt for DeepSeek configuration.
 */
const DEFAULT_HELP_PROMPT =
  "Click [here](https://docs.flexpilot.ai/model-providers/openai.html) for more information";

/**
 * Prompts the user to input their OpenAI API key.
 * @param {string} [apiKey] - The current API key, if any.
 * @returns {Promise<string>} A promise that resolves to the input API key.
 * @throws {Error} If the user cancels the input.
 */
const getApiKeyInput = async (apiKey?: string): Promise<string> => {
  logger.debug("Prompting user for OpenAI API key");
  const newApiKey = await vscode.window.showInputBox({
    title: "Flexpilot: Enter your DeepSeek API key",
    ignoreFocusOut: true,
    value: apiKey ?? "",
    validateInput: (value) =>
      !value?.trim() ? "API key cannot be empty" : undefined,
    valueSelection: [0, 0],
    placeHolder: "e.g., sk-proj-mFzPtn4QYHOSJ...", // cspell:disable-line
    prompt: DEFAULT_HELP_PROMPT,
  });
  if (newApiKey === undefined) {
    throw new Error("User cancelled DeepSeek API key input");
  }
  logger.debug("OpenAI API key input received");
  return newApiKey.trim();
};

/**
 * Prompts the user to input their OpenAI base URL.
 * @param {string} [baseUrl] - The current base URL, if any.
 * @returns {Promise<string>} A promise that resolves to the input base URL.
 * @throws {Error} If the user cancels the input.
 */
const getBaseUrlInput = async (baseUrl?: string): Promise<string> => {
  logger.debug("Prompting user for OpenAI base URL");
  const defaultBaseUrl = "https://api.deepseek.com/v1";
  const newBaseUrl = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    value: baseUrl ?? defaultBaseUrl,
    validateInput: (value) =>
      !value?.trim() ? "Base URL cannot be empty" : undefined,
    valueSelection: [0, 0],
    placeHolder: `e.g., ${defaultBaseUrl}`,
    prompt: DEFAULT_HELP_PROMPT,
    title: "Flexpilot: Enter your DeepSeek base URL",
  });
  if (newBaseUrl === undefined) {
    throw new Error("User cancelled DeepSeek base URL input");
  }
  logger.debug("OpenAI base URL input received");
  return newBaseUrl.trim();
};

/**
 * Prompts the user to input their OpenAI base URL.
 * @param {string} [baseUrl] - The current base URL, if any.
 * @returns {Promise<string>} A promise that resolves to the input base URL.
 * @throws {Error} If the user cancels the input.
 */
const getBetaUrlInput = async (baseUrl?: string): Promise<string> => {
  logger.debug("Prompting user for OpenAI base URL");
  const defaultBaseUrl = "https://api.deepseek.com/beta";
  const newBaseUrl = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    value: baseUrl ?? defaultBaseUrl,
    validateInput: (value) =>
      !value?.trim() ? "Base URL cannot be empty" : undefined,
    valueSelection: [0, 0],
    placeHolder: `e.g., ${defaultBaseUrl}`,
    prompt: DEFAULT_HELP_PROMPT,
    title: "Flexpilot: Enter your DeepSeek completion base URL",
  });
  if (newBaseUrl === undefined) {
    throw new Error("User cancelled DeepSeek base URL input");
  }
  logger.debug("OpenAI base URL input received");
  return newBaseUrl.trim();
};

/**
 * OpenAI Completion Model Provider class
 */
export class DeepSeekCompletionModelProvider extends ICompletionModelProvider {
  static readonly providerName = "DeepSeek";
  static readonly providerId = "deepseek-completion";
  static readonly providerType = "completion" as const;
  public readonly config: IDeepSeekCompletionModelConfig;

  public readonly encode = undefined;
  public readonly decode = undefined;

  /**
   * Constructor for DeepSeekCompletionModelProvider
   * @param {string} nickname - The nickname for the model configuration
   * @throws {Error} If the model configuration is not found
   */
  constructor(nickname: string) {
    super(nickname);
    logger.info(
      `Initializing DeepSeekCompletionModelProvider with nickname: ${nickname}`,
    );
    const config = storage.models.get<IDeepSeekCompletionModelConfig>(nickname);
    if (!config) {
      throw new Error(`Model configuration not found for ${nickname}`);
    }
    this.config = config;
    logger.debug(`DeepSeekCompletionModelProvider initialized for ${nickname}`);
  }

  /**
   * Initializes the OpenAI model provider.
   * @returns {Promise<void>} A promise that resolves when the provider is initialized.
   */
  async initialize(): Promise<void> {
    // No initialization required
  }

  /**
   * Configures a new DeepSeek model
   * @param {string} nickname - The nickname for the new model configuration
   * @returns {Promise<void>} A promise that resolves when the configuration is complete
   * @throws {Error} If the configuration process fails
   */
  static readonly configure = async (nickname: string): Promise<void> => {
    logger.info(`Configuring OpenAI model with nickname: ${nickname}`);

    // Load existing configuration
    const config = storage.models.get<IDeepSeekCompletionModelConfig>(nickname);

    // Prompt user for DeepSeek API key
    const apiKey = await getApiKeyInput(config?.apiKey);

    // Prompt user for DeepSeek base URL
    const baseUrl = await getBaseUrlInput(config?.baseUrl);

    // Prompt user for DeepSeek completion base URL
    const betaUrl = await getBetaUrlInput(config?.betaUrl);

    // Fetch available models from DeepSeek API
    const modelsList = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Flexpilot",
        cancellable: true,
      },
      async (progress) => {
        progress.report({ message: "Fetching available models" });
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: baseUrl,
        });
        logger.debug("Fetching models from OpenAI API");
        const models = await openai.models.list();
        logger.debug(`Fetched ${models.data.length} models`);
        return models.data;
      },
    );

    // Prepare model pick-up items
    const modelPickUpItems: vscode.QuickPickItem[] = [];
    for (const model of modelsList) {
      logger.debug(`Checking model configuration for: ${model.id}`);
      modelPickUpItems.push({ label: model.id });
    }

    // Check if models were found
    if (modelPickUpItems.length === 0) {
      throw new Error("No models found for the given configuration");
    }

    // Prompt user to select a model
    const model = await vscode.window.showQuickPick(modelPickUpItems, {
      placeHolder: "Select a completion model",
      ignoreFocusOut: true,
      canPickMany: false,
      title: "Flexpilot: Select the completion model",
    });
    if (!model) {
      throw new Error("User cancelled model selection");
    }

    // Test the connection credentials
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Flexpilot",
        cancellable: false,
      },
      async (progress) => {
        progress.report({
          message: "Testing connection credentials",
        });
        logger.debug("Testing connection credentials");
        const openai = new OpenAI({
          apiKey: apiKey,
          baseURL: betaUrl,
        });
        await openai.completions.create({
          model: model.label,
          max_tokens: 3,
          prompt: "How",
          suffix: "are you?",
        });
        logger.info("Connection credentials test successful");
      },
    );

    // Save the model configuration
    logger.info(`Saving model configuration for: ${nickname}`);
    await storage.models.set<IDeepSeekCompletionModelConfig>(nickname, {
      contextWindow: 64000, // https://api-docs.deepseek.com/zh-cn/quick_start/pricing
      baseUrl: baseUrl,
      betaUrl: betaUrl,
      apiKey: apiKey,
      model: model.label,
      nickname: nickname,
      providerId: DeepSeekCompletionModelProvider.providerId,
    });

    logger.info(`Successfully configured OpenAI model: ${nickname}`);
  };

  /**
   * Invokes the OpenAI model with the given options.
   * @param {ICompletionModelInvokeOptions} options - The options for invoking the model.
   * @returns {Promise<string>} A promise that resolves to the model's response.
   */
  async invoke(options: ICompletionModelInvokeOptions): Promise<string> {
    logger.info(`Invoking OpenAI model: ${this.config.model}`);
    logger.debug("Generating text with OpenAI model");
    const openai = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.betaUrl,
    });
    const response = await openai.completions.create(
      {
        prompt: options.messages.prefix,
        model: this.config.model,
        max_tokens: options.maxTokens,
        stop: options.stop,
        suffix: options.messages.suffix,
        temperature: options.temperature,
      },
      { signal: options.signal },
    );
    logger.debug(
      `Model output: ${response.choices[0].text.substring(0, 50)}...`,
    );
    return response.choices[0].text;
  }
}
