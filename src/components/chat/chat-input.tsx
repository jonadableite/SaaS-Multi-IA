'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import Image from 'next/image'
import {
  Send,
  Paperclip,
  Mic,
  Square,
  Loader2,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/utils/cn'
import { ToolsMenu } from './tools-menu'
import { ModelSelectorDialog } from './model-selector-dialog'

interface ChatInputProps {
  onSend: (content: string, attachments?: File[]) => void
  isLoading: boolean
  onStop: () => void
  isMobile: boolean
  disabled?: boolean
  selectedModel?: string
  onModelChange?: (modelId: string) => void
}

export function ChatInput({
  onSend,
  isLoading,
  onStop,
  isMobile,
  disabled = false,
  selectedModel = 'claude-4.5-sonnet-thinking',
  onModelChange,
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [showTools, setShowTools] = useState(false)
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const maxChars = 4000
  const isOverLimit = charCount > maxChars

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        isMobile ? 120 : 200,
      )}px`
    }
    setCharCount(input.length)
  }, [input, isMobile])

  useEffect(() => {
    if (!isMobile && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isMobile])

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
        setIsDragging(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer?.files || [])
      handleFiles(files)
    }

    const dropZone = dropZoneRef.current
    if (dropZone) {
      dropZone.addEventListener('dragover', handleDragOver)
      dropZone.addEventListener('dragleave', handleDragLeave)
      dropZone.addEventListener('drop', handleDrop)
    }

    return () => {
      if (dropZone) {
        dropZone.removeEventListener('dragover', handleDragOver)
        dropZone.removeEventListener('dragleave', handleDragLeave)
        dropZone.removeEventListener('drop', handleDrop)
      }
    }
  }, [])

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        alert(`${file.name} é muito grande. Máximo 10MB.`)
        return false
      }
      return true
    })

    setAttachments((prev) => [...prev, ...validFiles])
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = () => {
    if (
      (!input.trim() && attachments.length === 0) ||
      isLoading ||
      isOverLimit
    ) {
      return
    }

    onSend(input.trim(), attachments.length > 0 ? attachments : undefined)
    setInput('')
    setAttachments([])
    setShowTools(false)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const insertTemplate = (template: string) => {
    setInput(template)
    textareaRef.current?.focus()
    setShowTools(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-border bg-background">
      {showTools && (
        <ToolsMenu
          onSelect={insertTemplate}
          onClose={() => setShowTools(false)}
        />
      )}

      {attachments.length > 0 && (
        <div className="px-4 pt-4">
          <div className="flex space-x-2 pb-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative group flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden border-2 border-border bg-muted"
              >
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => removeAttachment(index)}
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  ✕
                </Button>
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground mb-2">
                      📎
                    </div>
                    <p className="text-xs font-medium text-foreground truncate w-full">
                      {file.name}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        ref={dropZoneRef}
        className={cn(
          'relative p-4 transition-all',
          isDragging && 'bg-primary/10',
        )}
      >
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-sm z-10 rounded-lg m-4 border-2 border-dashed border-primary">
            <div className="text-center">
              <Paperclip className="w-12 h-12 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-primary">
                Solte os arquivos aqui
              </p>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Model Selector Button */}
          <div className="mb-2 px-2">
            <ModelSelectorButton
              selectedModel={selectedModel}
              onOpenDialog={() => setModelSelectorOpen(true)}
            />
          </div>

          <div
            className={cn(
              'relative flex items-end space-x-2 bg-muted rounded-2xl p-2 transition-all',
              'border-2 border-transparent focus-within:border-primary focus-within:bg-background',
              isOverLimit &&
              'border-destructive focus-within:border-destructive',
            )}
          >
            <div className="flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem ou use um template para começar..."
                disabled={disabled || isLoading || isRecording}
                className={cn(
                  'min-h-[44px] max-h-[200px] resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-2',
                  isMobile && 'max-h-[120px]',
                  'placeholder:text-muted-foreground',
                )}
                rows={1}
              />

              {charCount > 0 && (
                <div className="flex items-center justify-between px-2 pb-1">
                  <span
                    className={cn(
                      'text-xs',
                      isOverLimit
                        ? 'text-destructive font-medium'
                        : charCount > maxChars * 0.8
                          ? 'text-yellow-600'
                          : 'text-muted-foreground',
                    )}
                  >
                    {charCount.toLocaleString()} / {maxChars.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1 flex-shrink-0 mb-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
              />

              {!isLoading && !isRecording && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTools(!showTools)}
                    disabled={disabled}
                    className="h-9 w-9"
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="h-9 w-9"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsRecording(true)}
                    disabled={disabled}
                    className="h-9 w-9"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </>
              )}

              {isLoading ? (
                <Button
                  type="button"
                  onClick={onStop}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Square className="w-4 h-4 fill-current" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSend}
                  disabled={
                    disabled ||
                    (!input.trim() && attachments.length === 0) ||
                    isOverLimit ||
                    isRecording
                  }
                  size="icon"
                  className={cn(
                    'h-9 w-9 transition-all',
                    !disabled &&
                      (input.trim() || attachments.length > 0) &&
                      !isOverLimit
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg scale-105'
                      : '',
                  )}
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 px-2">
            {isLoading && (
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Gerando resposta...</span>
              </div>
            )}
          </div>
        </div>

        {/* Model Selector Dialog */}
        <ModelSelectorDialog
          open={modelSelectorOpen}
          onOpenChange={setModelSelectorOpen}
          selectedModel={selectedModel}
          onSelectModel={(modelId) => {
            onModelChange?.(modelId)
            setModelSelectorOpen(false)
          }}
        />
      </div>
    </div>
  )
}

// Helper function to get icon path by provider
function getProviderIconPath(provider: string): string {
  const providerIcons: Record<string, string> = {
    OpenAI: '/gpt.png',
    Anthropic: '/claude.png',
    Google: '/gemini.png',
    Cohere: '/cohere.png',
    Meta: '/llama.png',
    DeepSeek: '/1bb72c07-4584-4e37-9cce-324f8b6a7d8d_deepseeklogo.png',
  }
  return providerIcons[provider] || '/icon.svg'
}

// Helper function to get model info by ID
function getModelInfo(modelId: string): {
  name: string
  provider: string
  iconPath: string
} {
  const modelMap: Record<string, { name: string; provider: string }> = {
    'claude-4.5-sonnet-thinking': {
      name: 'Claude 4.5 Sonnet Thinking',
      provider: 'Anthropic',
    },
    'gpt-4-turbo': {
      name: 'GPT-4 Turbo',
      provider: 'OpenAI',
    },
    'gpt-4': {
      name: 'GPT-4',
      provider: 'OpenAI',
    },
    'claude-3.5-sonnet': {
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
    },
    'gemini-1.5-pro': {
      name: 'Gemini 1.5 Pro',
      provider: 'Google',
    },
    'gpt-5-mini': {
      name: 'GPT-5 Mini',
      provider: 'OpenAI',
    },
    'gpt-4o-mini': {
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
    },
    'claude-4.5-haiku': {
      name: 'Claude 4.5 Haiku',
      provider: 'Anthropic',
    },
    'command-r': {
      name: 'Command R',
      provider: 'Cohere',
    },
    'llama-4-scout': {
      name: 'Llama 4 Scout',
      provider: 'Meta',
    },
    'deepseek-3.1': {
      name: 'Deepseek 3.1',
      provider: 'DeepSeek',
    },
    'gemini-2.5-flash': {
      name: 'Gemini 2.5 Flash',
      provider: 'Google',
    },
    'o1-preview': {
      name: 'O1 Preview',
      provider: 'OpenAI',
    },
    'o1-mini': {
      name: 'O1 Mini',
      provider: 'OpenAI',
    },
    'claude-3-opus': {
      name: 'Claude 3 Opus',
      provider: 'Anthropic',
    },
  }

  const model = modelMap[modelId] || {
    name: 'Selecione um modelo',
    provider: 'Unknown',
  }

  return {
    ...model,
    iconPath: getProviderIconPath(model.provider),
  }
}

// Model Selector Button Component
function ModelSelectorButton({
  selectedModel,
  onOpenDialog,
}: {
  selectedModel: string
  onOpenDialog: () => void
}) {
  const modelInfo = getModelInfo(selectedModel)

  return (
    <Button
      variant="outline"
      onClick={onOpenDialog}
      className="h-9 px-3 rounded-lg border-border hover:bg-muted/80 transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 flex items-center justify-center overflow-hidden rounded">
          <Image
            src={modelInfo.iconPath}
            alt={modelInfo.provider}
            width={20}
            height={20}
            className="object-contain"
          />
        </div>
        <span className="text-sm font-medium">{modelInfo.name}</span>
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>
    </Button>
  )
}
