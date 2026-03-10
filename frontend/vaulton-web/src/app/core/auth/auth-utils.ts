import { zxcvbn as zxcvbnType } from '@zxcvbn-ts/core';

let zxcvbnInstance: typeof zxcvbnType | null = null;

export async function loadZxcvbn() {
  if (zxcvbnInstance) return zxcvbnInstance;

  const [
    { zxcvbn, zxcvbnOptions },
    { adjacencyGraphs, dictionary: commonDictionary },
    { translations: enTranslations, dictionary: enDictionary },
    { translations: plTranslations, dictionary: plDictionary },
  ] = await Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-en'),
    import('@zxcvbn-ts/language-pl'),
  ]);

  const options = {
    translations: { ...enTranslations, ...plTranslations },
    graphs: adjacencyGraphs,
    dictionary: { ...commonDictionary, ...enDictionary, ...plDictionary },
  };
  zxcvbnOptions.setOptions(options);

  zxcvbnInstance = zxcvbn;
  return zxcvbnInstance;
}

export async function validateNewPassword(
  newPassword: string,
  accountId: string,
  confirmPassword?: string,
  oldPassword?: string,
): Promise<string | null> {
  if (!newPassword) {
    return 'Password is required';
  }

  if (newPassword.toLowerCase().includes(accountId.toLowerCase())) {
    return 'Password cannot contain your Account ID';
  }

  const zxcvbn = await loadZxcvbn();
  const result = zxcvbn(newPassword);

  let score = 0;
  if (result.guessesLog10 < 7) score = 0;
  else if (result.guessesLog10 < 9) score = 1;
  else if (result.guessesLog10 < 11) score = 2;
  else if (result.guessesLog10 < 13) score = 3;
  else score = 4;

  if (score < 2) {
    return 'Password is too weak';
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return 'Passwords do not match';
  }

  if (oldPassword && newPassword === oldPassword) {
    return 'New password must be different from the old one';
  }

  return null;
}
