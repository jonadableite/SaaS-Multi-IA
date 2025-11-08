/**
 * @file generate-conversation-title.ts
 * @description Gera títulos inteligentes para conversas baseados na primeira mensagem do usuário
 */

/**
 * Gera um título limpo e conciso para a conversa baseado na mensagem do usuário
 * Similar ao comportamento da WhatLead IA
 * 
 * @example
 * Input: "qual e o Tom de voz da marca https://pareto.io/ ?"
 * Output: "Tom de voz da Pareto.io"
 * 
 * @param userMessage - Primeira mensagem do usuário
 * @param maxLength - Tamanho máximo do título (padrão: 50)
 * @returns Título gerado e formatado
 */
export function generateConversationTitle(
  userMessage: string,
  maxLength: number = 50,
): string {
  if (!userMessage || !userMessage.trim()) {
    return 'Nova conversa'
  }

  let title = userMessage.trim()

  // 1. Extrair domínio de URLs e substituir por nome legível
  title = title.replace(
    /https?:\/\/(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)(\/[^\s]*)?/gi,
    (match, www, domain) => {
      // Extrair apenas o nome principal (ex: pareto.io -> Pareto.io)
      const mainDomain = domain.split('/')[0]
      const domainName = mainDomain.split('.')[0]
      return domainName.charAt(0).toUpperCase() + domainName.slice(1) + '.' + mainDomain.split('.').slice(1).join('.')
    },
  )

  // 2. Remover pontuação excessiva no final
  title = title.replace(/[?!.。]+$/, '')

  // 3. Remover palavras vazias no início (perguntas comuns)
  const fillerWords = [
    'qual é o',
    'qual é a',
    'qual e o',
    'qual e a',
    'como é o',
    'como é a',
    'como e o',
    'como e a',
    'o que é',
    'o que e',
    'me fale sobre',
    'me diga sobre',
    'me explique',
    'explique',
    'mostre',
    'quero saber',
    'gostaria de saber',
    'pode me dizer',
    'você pode',
    'vc pode',
  ]

  const lowerTitle = title.toLowerCase()
  for (const filler of fillerWords) {
    if (lowerTitle.startsWith(filler)) {
      title = title.substring(filler.length).trim()
      break
    }
  }

  // 4. Capitalizar primeira letra
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1)
  }

  // 5. Remover espaços múltiplos
  title = title.replace(/\s+/g, ' ').trim()

  // 6. Limitar ao tamanho máximo
  if (title.length > maxLength) {
    // Cortar no último espaço antes do limite para não cortar palavras
    const cutPoint = title.lastIndexOf(' ', maxLength)
    if (cutPoint > maxLength / 2) {
      title = title.substring(0, cutPoint) + '...'
    } else {
      title = title.substring(0, maxLength) + '...'
    }
  }

  // 7. Se ficou muito curto ou vazio, retornar a mensagem original truncada
  if (title.length < 3) {
    title = userMessage.substring(0, maxLength)
    if (userMessage.length > maxLength) {
      title += '...'
    }
  }

  return title
}

/**
 * Gera título usando IA (opcional, para casos que precisam de mais contexto)
 * Pode ser implementado posteriormente se necessário
 */
export async function generateConversationTitleWithAI(
  userMessage: string,
  aiResponse?: string,
): Promise<string> {
  // TODO: Implementar geração com IA se necessário
  // Por enquanto, usa a função básica
  return generateConversationTitle(userMessage)
}

