declare namespace chrome {
  interface ChromeEvent<T extends (...args: any[]) => void> {
    addListener(callback: T): void;
    removeListener(callback: T): void;
  }

  namespace runtime {
    const lastError: { message?: string } | undefined;
    function getURL(path: string): string;
    function sendMessage<T = unknown>(message: unknown): Promise<T>;
    const onInstalled: ChromeEvent<() => void>;
    const onMessage: ChromeEvent<(
      message: unknown,
      sender: { tab?: tabs.Tab },
      sendResponse: (response?: unknown) => void,
    ) => boolean | void>;
  }

  namespace storage {
    namespace local {
      function get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
      function set(items: Record<string, unknown>): Promise<void>;
      function remove(keys: string | string[]): Promise<void>;
    }
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      active?: boolean;
      currentWindow?: boolean;
    }

    function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function sendMessage<T = unknown>(tabId: number, message: unknown): Promise<T>;
  }

  namespace alarms {
    interface Alarm {
      name: string;
      scheduledTime: number;
    }

    function create(name: string, alarmInfo: { when?: number; delayInMinutes?: number; periodInMinutes?: number }): void;
    function clear(name: string): Promise<boolean>;
    const onAlarm: ChromeEvent<(alarm: Alarm) => void>;
  }
}
