import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import {
  useForm,
  UseFormReturn,
  type FieldValues,
  type UseFormProps,
} from 'react-hook-form'
import { z } from 'zod'

type HookFormParams<TFieldValues extends FieldValues, TContext> = UseFormProps<
  TFieldValues,
  TContext
>

type UseFormOptions<TSchema extends z.ZodObject<any>> = Omit<
  HookFormParams<z.infer<TSchema>, any>,
  'onSubmit'
> & {
  schema: TSchema
  defaultValues?: z.infer<TSchema>
  onSubmit?: (values: z.infer<TSchema>) => void
}

export type FormWithZodReturn<TSchema extends z.ZodObject<any>> = UseFormReturn<
  z.infer<TSchema>
> & {
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>
}

export function useFormWithZod<TSchema extends z.ZodObject<any>>({
  schema,
  defaultValues,
  onSubmit,
  mode,
  ...rest
}: UseFormOptions<TSchema>): FormWithZodReturn<TSchema> {
  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
    ...rest,
  })

  const prevDefaultValuesRef = useRef(defaultValues)

  useEffect(() => {
    if (mode === 'onChange') {
      let timeoutId: NodeJS.Timeout

      const subscription = form.watch(() => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          form.handleSubmit(onSubmit || (() => {}))()
        }, 2000)
      })

      return () => {
        subscription.unsubscribe()
        clearTimeout(timeoutId)
      }
    }
  }, [mode, form.watch, form.handleSubmit, onSubmit])

  useEffect(() => {
    const isDefaultValuesDifferent =
      JSON.stringify(prevDefaultValuesRef.current) !==
      JSON.stringify(defaultValues)

    if (defaultValues && isDefaultValuesDifferent) {
      prevDefaultValuesRef.current = defaultValues
      form.reset(defaultValues)
    }
  }, [defaultValues, form.reset])

  return {
    ...form,
    onSubmit: form.handleSubmit(onSubmit || (() => {})),
  }
}
