import { UserRegistrationData } from '../services/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isAddressComplete = (address: { cidade?: string; estado?: string }) => (
  !!address.cidade?.trim() && !!address.estado?.trim()
);

export const validateRegistrationData = (
  data: UserRegistrationData,
  options: { requirePassword?: boolean } = {},
): string | null => {
  const requirePassword = options.requirePassword !== false;

  if (!data.nome_completo.trim()) return 'Informe o nome completo.';
  if (!data.data_nascimento) return 'Informe a data de nascimento.';
  if (!data.genero) return 'Selecione o gênero.';
  if (!data.language.trim()) return 'Selecione o idioma principal.';
  if (!EMAIL_PATTERN.test(data.email)) return 'Informe um endereço de e-mail válido.';
  if (requirePassword && data.password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!isAddressComplete(data.cidade_nascimento)) return 'Informe o estado e a cidade de nascimento.';
  if (!isAddressComplete(data.cidade_atual)) return 'Informe o estado e a cidade atual.';

  const incompleteHistory = data.historico_moradia.some(item => {
    const hasAnyValue = !!item?.periodo || !!item?.endereco?.estado || !!item?.endereco?.cidade;
    return hasAnyValue && (!item?.periodo || !isAddressComplete(item.endereco || {}));
  });
  if (incompleteHistory) return 'Complete ou remova os itens incompletos do histórico de moradia.';

  return null;
};

export const normalizeHousingHistory = (history: any[]): any[] => {
  return history.filter(item => item?.periodo || item?.endereco?.estado || item?.endereco?.cidade);
};

export const createGuestPassword = (): string => {
  const bytes = new Uint8Array(16);
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('O navegador não oferece geração segura de credenciais para visitante.');
  }
  globalThis.crypto.getRandomValues(bytes);
  const randomPart = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `Visitante-${randomPart}-Aa1!`;
};
