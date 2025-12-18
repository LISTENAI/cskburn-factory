import pMap from 'p-map';

import { HexFile, LocalFile, LpkFile, type IFileRef } from './file';

export type IFlashImage =
  ({
    format: 'bin';
  } & IPartition) |
  {
    format: 'lpk';
    file: LpkFile;
  } |
  {
    format: 'hex';
    file: HexFile;
  };

export interface IPartition {
  addr: number;
  file: IFileRef;
}

export async function readImages(paths: string[]): Promise<IFlashImage[]> {
  const files = paths.map((path) => ({
    path,
    ext: path.toLowerCase().split('.').pop(),
  }));

  const hexFile = files.find(({ ext }) => ext == 'hex');
  if (hexFile) {  // Only one hex file is allowed
    return [{
      format: 'hex',
      file: await HexFile.from(hexFile.path),
    }];
  }

  const lpkFile = files.find(({ ext }) => ext == 'lpk');
  if (lpkFile) {  // Only one lpk file is allowed
    return [{
      format: 'lpk',
      file: await LpkFile.from(lpkFile.path),
    }];
  }

  return await pMap(files, async ({ path }) => ({
    format: 'bin',
    addr: 0,
    file: await LocalFile.from(path),
  }));
}
