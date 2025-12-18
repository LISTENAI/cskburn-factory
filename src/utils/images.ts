import { HexFile, LpkFile, type IFileRef } from './file';

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

  const lpkFile = files.find(({ ext }) => ext == 'lpk');
  if (lpkFile) {  // Only one lpk file is allowed
    return [{
      format: 'lpk',
      file: await LpkFile.from(lpkFile.path),
    }];
  }

  throw new Error('Only LPK is supported.');
}
