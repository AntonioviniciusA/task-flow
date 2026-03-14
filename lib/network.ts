import ipRangeCheck from 'ip-range-check';

/**
 * Detecta o IP do usuário a partir dos headers da requisição.
 * Útil para ambientes como Vercel ou por trás de proxies.
 */
export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp;
  }
  return '127.0.0.1'; // Fallback para local
}

/**
 * Verifica se um IP pertence a um range CIDR ou é igual a um IP específico.
 */
export function isIpInRange(ip: string, range: string): boolean {
  try {
    return ipRangeCheck(ip, range);
  } catch (error) {
    console.error('[Network] Erro ao validar IP range:', error);
    return false;
  }
}
