import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import { adjacencyGraphs, dictionary as commonDictionary } from '@zxcvbn-ts/language-common';
import { translations as enTranslations, dictionary as enDictionary } from '@zxcvbn-ts/language-en';
import { translations as plTranslations, dictionary as plDictionary } from '@zxcvbn-ts/language-pl';

const options = {
  translations: {
    ...enTranslations,
    ...plTranslations,
  },
  graphs: adjacencyGraphs,
  dictionary: {
    ...commonDictionary,
    ...enDictionary,
    ...plDictionary,
  },
};
zxcvbnOptions.setOptions(options);

export function validateNewPassword(
  newPassword: string,
  accountId: string,
  confirmPassword?: string,
  oldPassword?: string,
): string | null {
  if (!newPassword) {
    return 'Password is required';
  }

  if (newPassword.toLowerCase().includes(accountId.toLowerCase())) {
    return 'Password cannot contain your Account ID';
  }

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
