'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Prompt, CreatePromptDTO } from '../../prompt.interface'
import {
  CreatePromptSchema,
  PromptCategory,
  PromptScope,
} from '../../prompt.interface'
import { ALL_CATEGORIES } from '../utils/prompt-helpers'

interface PromptFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Prompt | null
  mode?: 'create' | 'edit'
  onSubmit: (data: CreatePromptDTO) => void | Promise<void>
}

export function PromptFormModal({
  open,
  onOpenChange,
  initialData,
  mode = 'create',
  onSubmit,
}: PromptFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreatePromptDTO>({
    resolver: zodResolver(CreatePromptSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      content: initialData?.content ?? '',
      category: (initialData?.category as PromptCategory) ?? PromptCategory.CODIGO,
      tags: initialData?.tags ?? [],
      isPublic: initialData?.isPublic ?? false,
      scope: initialData?.scope ?? PromptScope.USER,
    },
  })

  useEffect(() => {
    // Keep form in sync when a different prompt is selected for edit
    reset({
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      content: initialData?.content ?? '',
      category: (initialData?.category as PromptCategory) ?? PromptCategory.CODIGO,
      tags: initialData?.tags ?? [],
      isPublic: initialData?.isPublic ?? false,
      scope: initialData?.scope ?? PromptScope.USER,
    })
  }, [initialData, reset])

  const onSubmitInternal = async (data: CreatePromptDTO) => {
    await onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Prompt' : 'Criar Novo Prompt'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Atualize os detalhes do seu prompt.'
              : 'Preencha os campos para criar um novo prompt.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitInternal)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input placeholder="Título do prompt" {...register('title')} />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              placeholder="Descrição breve (opcional)"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Conteúdo</label>
            <Textarea
              placeholder="Conteúdo do prompt"
              rows={6}
              {...register('content')}
            />
            {errors.content && (
              <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                {...register('category')}
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-500 mt-1">{errors.category.message as string}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Escopo</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                {...register('scope')}
              >
                <option value={PromptScope.USER}>Somente eu</option>
                <option value={PromptScope.ORGANIZATION}>Organização</option>
                <option value={PromptScope.GLOBAL}>Global</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tags</label>
              <Input
                placeholder="Separar por vírgula (ex: marketing,cópia)"
                value={(watch('tags') || []).join(', ')}
                onChange={(e) => {
                  const parsed = e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                  setValue('tags', parsed, { shouldValidate: true, shouldDirty: true })
                }}
              />
              {errors.tags && (
                <p className="text-xs text-red-500 mt-1">{'Verifique as tags informadas.'}</p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="isPublic" {...register('isPublic')} />
              <label htmlFor="isPublic" className="text-sm">
                Tornar público
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {mode === 'edit' ? 'Salvar alterações' : 'Criar Prompt'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}