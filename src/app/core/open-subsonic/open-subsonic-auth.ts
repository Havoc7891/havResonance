import { md5 } from 'hash-wasm';

export interface SubsonicCredentials {
  readonly username: string;
  readonly password: string;
}

export async function createAuthenticationParameters(
  credentials: SubsonicCredentials,
): Promise<Record<string, string>> {
  const salt = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
  const token = await md5(credentials.password + salt);

  return {
    u: credentials.username,
    t: token,
    s: salt,
    v: '1.16.1',
    c: 'havResonance',
    f: 'json',
  };
}
