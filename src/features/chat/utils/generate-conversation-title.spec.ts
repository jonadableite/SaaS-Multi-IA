import { describe, it, expect } from 'vitest'
import { generateConversationTitle } from './generate-conversation-title'

describe('generateConversationTitle', () => {
  it('deve gerar título limpo removendo palavras vazias e URL', () => {
    const input = 'qual e o Tom de voz da marca https://pareto.io/ ?'
    const expected = 'Tom de voz da marca Pareto.io'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve remover "qual é o" do início', () => {
    const input = 'qual é o significado da vida?'
    const expected = 'Significado da vida'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve remover pontuação no final', () => {
    const input = 'Como funciona a IA???'
    const expected = 'Como funciona a IA'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve capitalizar primeira letra', () => {
    const input = 'me explique sobre machine learning'
    const expected = 'Sobre machine learning'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve extrair domínio de URLs', () => {
    const input = 'Analise o site https://www.google.com/search?q=test'
    const expected = 'Analise o site Google.com'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve truncar mensagens muito longas', () => {
    const input = 'Esta é uma mensagem extremamente longa que deveria ser truncada porque excede o limite máximo de caracteres permitidos para um título'
    const result = generateConversationTitle(input, 50)
    
    expect(result.length).toBeLessThanOrEqual(53) // 50 + "..."
    expect(result).toContain('...')
  })

  it('deve retornar "Nova conversa" para mensagens vazias', () => {
    expect(generateConversationTitle('')).toBe('Nova conversa')
    expect(generateConversationTitle('   ')).toBe('Nova conversa')
  })

  it('deve remover espaços múltiplos', () => {
    const input = 'Texto    com     muitos      espaços'
    const result = generateConversationTitle(input)
    
    expect(result).not.toContain('  ')
    expect(result).toBe('Texto com muitos espaços')
  })

  it('deve funcionar com mensagens curtas', () => {
    const input = 'Olá'
    const expected = 'Olá'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve remover "o que é"', () => {
    const input = 'o que é inteligência artificial?'
    const expected = 'Inteligência artificial'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve processar URLs sem www', () => {
    const input = 'Pesquise sobre https://github.com/microsoft/vscode'
    const expected = 'Pesquise sobre Github.com'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve preservar acentuação', () => {
    const input = 'Qual é a história da Índia e do Japão?'
    const expected = 'História da Índia e do Japão'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })

  it('deve remover múltiplas interrogações/exclamações', () => {
    const input = 'Isso é incrível!!!'
    const expected = 'Isso é incrível'
    
    expect(generateConversationTitle(input)).toBe(expected)
  })
})

