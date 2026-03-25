declare module "picomatch" {
  export interface PicomatchOptions {
    dot?: boolean;
  }

  export type Matcher = (input: string) => boolean;

  export default function picomatch(
    pattern: string | readonly string[],
    options?: PicomatchOptions
  ): Matcher;
}
