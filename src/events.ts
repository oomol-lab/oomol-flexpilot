import * as vscode from "vscode";
import { logger } from "./logger";
import { storage } from "./storage";

/**
 * IEventPayload represents the payload of an event.
 */
interface IEventPayload {
  name: "modelProvidersUpdated" | "inlineCompletionProviderUpdated";
  payload: Record<string, unknown>;
}

/**
 * EVENT_KEY_PREFIX is the prefix used for event keys in the storage.
 */
const EVENT_KEY_PREFIX = "window.events.";

/**
 * EventsSingleton is a singleton class that allows for the firing and listening of events.
 * For local events, consider using the built-in VS Code event system.
 * This class is used to fire events across multiple open VS Code windows.
 */
export class EventsSingleton {
  private static instance: EventsSingleton;
  private readonly eventEmitter = new vscode.EventEmitter<IEventPayload>();

  /**
   * Creates a new instance of EventsSingleton.
   */
  private constructor(
    private readonly extensionContext = storage.getContext(),
  ) {
    // Listen for changes in the secrets storage to fire events
    extensionContext.subscriptions.push(
      extensionContext.secrets.onDidChange(async (event) => {
        if (event.key.startsWith(EVENT_KEY_PREFIX)) {
          logger.debug(`Event received: ${event.key}`);
          const payload = await extensionContext.secrets.get(event.key);
          if (payload) {
            logger.debug(`Event payload: ${JSON.stringify(payload)}`);
            this.eventEmitter.fire(JSON.parse(payload));
          } else {
            logger.debug(`Event payload empty, skipped firing`);
          }
        }
      }),
    );
  }

  /**
   * Returns the singleton instance of EventsSingleton.
   * @returns {EventsSingleton} The singleton instance.
   */
  public static getInstance(): EventsSingleton {
    if (!EventsSingleton.instance) {
      EventsSingleton.instance = new EventsSingleton();
      logger.info("EventsSingleton instance created");
    }
    return EventsSingleton.instance;
  }

  /**
   * Fires an event with the given payload.
   * @param {IEventPayload} event - The event to fire.
   */
  public async fire(event: IEventPayload) {
    logger.debug(
      `Firing event: ${event.name} with payload: ${JSON.stringify(event.payload)}`,
    );
    await this.extensionContext.secrets.store(
      `${EVENT_KEY_PREFIX}${event.name}`,
      JSON.stringify(event),
    );
  }

  /**
   * Event that is fired when an event is emitted.
   */
  public onFire = this.eventEmitter.event;
}

// Export a singleton instance of the events
export const events = EventsSingleton.getInstance();
