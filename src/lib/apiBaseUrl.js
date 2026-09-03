const getDynamicApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_DB_API_URL;

    // Se a variável de ambiente estiver definida e não for o DNS interno do Docker
    if (envUrl && !envUrl.includes('jogos-convencao_backend')) {
        // Remove barra no final para evitar barras duplas no path
        return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    }

    // Fallback dinâmico inteligente baseado no acesso do browser
    if (typeof window !== 'undefined' && window.location) {
        const { hostname, protocol } = window.location;

        // Se acessado localmente por localhost ou 127.0.0.1
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `${protocol}//${hostname}:4000`;
        }

        // Verifica se é um IP de rede local (LAN) - 192.168.*, 10.*, ou 172.16.* até 172.31.*
        const isLanIp = /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
                        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
                        /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);
        
        if (isLanIp) {
            return `${protocol}//${hostname}:4000`;
        }

        // Se acessado por qualquer host em produção (seja IP público ou domínio)
        // Redireciona sempre para o subdomínio público HTTPS do backend no Easypanel
        return import.meta.env.VITE_PRODUCTION_API_URL || `https://api.omnivarejo2026.com.br/`;
    }

    return "http://localhost:4000";
};

export const API_BASE_URL = getDynamicApiUrl();

export function resolveApiUrl(path = "") {
    if (!path) return API_BASE_URL;
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:") || path.startsWith("blob:")) {
        return path;
    }

    // Se for asset estático da pasta public (ex: /images/...)
    if (path.startsWith("/images/") || path.startsWith("images/")) {
        return path.startsWith("/") ? path : `/${path}`;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
}
