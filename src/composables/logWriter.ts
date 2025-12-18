import { onBeforeUnmount, readonly, ref, watch, type Ref } from 'vue';
import { DateTime } from 'luxon';
import { FileHandle, open, remove } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

import { useSettings } from '@/composables/tauri/settings';

export function useLogWriter(): ILogWriter {
  const fileName = ref<string>();
  const logDir = useSettings<string>('logDir');

  let logFile: {
    path: string;
    handle: FileHandle;
    wrote: boolean;
  } | null = null;

  async function writeLine(columns: string[]): Promise<void> {
    await logFile?.handle.write(new TextEncoder().encode(`${columns.map(column => `"${column}"`).join(',')}\r\n`));
  }

  async function finalizeLog(): Promise<void> {
    if (logFile) {
      try {
        await logFile.handle.close();
        if (!logFile.wrote) {
          await remove(logFile.path);
        }
      } catch { }
      logFile = null;
    }
  }

  async function appendLog(uuid: string, item: ILogItem, result: 'SUCCESS' | 'FAILURE'): Promise<void> {
    if (!logFile) {
      return;
    }

    const now = DateTime.now().setZone('Asia/Shanghai').toFormat('yyyy-LL-dd HH:mm:ss');
    switch (item.action) {
      case 'BURN':
        await writeLine([now, uuid, item.action, item.lpk_md5, result]);
        break;
      case 'READINFO':
        await writeLine([now, uuid, item.action, '', result]);
        break;
    }
    logFile.wrote = true;
  }

  watch(logDir, async (logDir) => {
    if (logDir) {
      if (!fileName.value) {
        fileName.value = newFileName();
        const path = await join(logDir, fileName.value);
        logFile = {
          path,
          handle: await open(path, {
            append: true,
            create: true,
          }),
          wrote: false,
        };
        await writeLine(['TIME', 'UUID', 'ACTION', 'LPK_MD5', 'RESULT']);
      }
    } else {
      fileName.value = undefined;
      await finalizeLog();
    }
  }, { immediate: true });

  onBeforeUnmount(() => finalizeLog());

  return {
    logFileName: readonly(fileName),
    appendLog,
  };
}

export interface ILogWriter {
  logFileName: Readonly<Ref<string | undefined>>;
  appendLog(uuid: string, item: ILogItem, result: 'SUCCESS' | 'FAILURE'): Promise<void>;
}

export type ILogItem = {
  action: 'BURN';
  lpk_md5: string;
} | {
  action: 'READINFO';
};

function newFileName(): string {
  const now = DateTime.now().setZone('Asia/Shanghai');
  return `${now.toFormat('yyyy-LL-dd_HH-mm-ss')}.csv`;
}
