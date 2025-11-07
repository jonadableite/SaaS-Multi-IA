'use client'

import React, { useState } from 'react'
import { LabelAceternity } from '@/components/ui/label-aceternity'
import { InputAceternity } from '@/components/ui/input-aceternity'
import { cn } from '@/utils/cn'
import { IconBrandGoogle, IconArrowLeft } from '@tabler/icons-react'
import { api } from '@/igniter.client'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'
import { Button } from '@/components/ui/button'
import { LoaderIcon } from '@/components/ui/loader-icon'
import { Mail } from 'lucide-react'

interface SignupFormDemoProps {
  redirectUrl?: string
}

export function SignupFormDemo({ redirectUrl }: SignupFormDemoProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email')
  const [otpEmail, setOtpEmail] = useState<string | null>(emailParam)

  const signInWithProvider = api.auth.signInWithProvider.useMutation({
    onError: (error) => {
      console.error(error)
      toast.error('Erro ao fazer login')
    },
    onSuccess(data) {
      if (data?.redirect && data?.url) window.location.href = data.url
      toast.success('Login realizado com sucesso!')
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    if (!email) {
      toast.error('Por favor, insira um email válido')
      return
    }

    // Send OTP
    api.auth.sendOTPVerificationCode
      .mutate({
        body: {
          type: 'sign-in',
          email,
        },
      })
      .then(() => {
        toast.success(`Código de verificação enviado para ${email}`)
        setOtpEmail(email)
        router.push(`/auth?email=${encodeURIComponent(email)}${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`)
      })
      .catch(() => {
        toast.error('Erro ao enviar código de verificação')
      })
  }

  if (otpEmail) {
    return (
      <AuthValidateOTPCodeForm
        email={otpEmail}
        redirectUrl={redirectUrl}
        onBack={() => {
          setOtpEmail(null)
          router.push('/auth')
        }}
      />
    )
  }

  const handleGoogleLogin = () => {
    signInWithProvider.mutate({
      body: {
        provider: 'google',
        callbackURL: redirectUrl,
      },
    })
  }

  return (
    <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
        Bem-vindo ao {process.env.NEXT_PUBLIC_APP_NAME || 'SaaS Multi-IA'}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
        Faça login para acessar sua conta e começar a usar nossos serviços
      </p>

      <form className="my-8" onSubmit={handleSubmit}>
        <LabelInputContainer className="mb-4">
          <LabelAceternity htmlFor="email">Email Address</LabelAceternity>
          <InputAceternity
            id="email"
            name="email"
            placeholder="seu@email.com"
            type="email"
            required
          />
        </LabelInputContainer>

        <button
          className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset]"
          type="submit"
        >
          Enviar código de verificação &rarr;
          <BottomGradient />
        </button>

        <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />

        <div className="flex flex-col space-y-4">
          <button
            className="group/btn shadow-input relative flex h-10 w-full items-center justify-start space-x-2 rounded-md bg-gray-50 px-4 font-medium text-black dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
            type="button"
            onClick={handleGoogleLogin}
            disabled={signInWithProvider.loading}
          >
            <IconBrandGoogle className="h-4 w-4 text-neutral-800 dark:text-neutral-300" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Google
            </span>
            <BottomGradient />
          </button>
        </div>
      </form>
    </div>
  )
}

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  )
}

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className={cn('flex w-full flex-col space-y-2', className)}>
      {children}
    </div>
  )
}

function AuthValidateOTPCodeForm({
  email,
  onBack,
  redirectUrl,
}: {
  email: string
  onBack: () => void
  redirectUrl?: string
}) {
  const router = useRouter()
  const signIn = api.auth.signInWithOTP.useMutation()
  const resendOTPCode = api.auth.sendOTPVerificationCode.useMutation()

  const [code, setCode] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const result = await signIn.mutate({
      body: {
        email,
        otpCode: code,
      },
    })

    if (result.error) {
      toast.error('Código inválido. Por favor, tente novamente.')
      return
    }

    toast.success('Código verificado com sucesso!')
    router.push(redirectUrl || '/app')
  }

  const handleResendCode = () => {
    resendOTPCode.mutate({
      body: {
        type: 'sign-in',
        email,
      },
    })

    toast.success(`Novo código enviado para ${email}`)
  }

  return (
    <div className="shadow-input mx-auto w-full max-w-md rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
      <Button
        variant="ghost"
        size="sm"
        className="p-0 h-8 mb-4 hover:bg-transparent"
        onClick={onBack}
        type="button"
      >
        <IconArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
        Verifique seu email
      </h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
        Enviamos um código de verificação para{' '}
        <span className="font-medium">{email}</span>
      </p>

      <form className="my-8" onSubmit={handleSubmit}>
        <LabelInputContainer className="mb-4">
          <LabelAceternity htmlFor="code">Código de verificação</LabelAceternity>
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            className="justify-center"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator>-</InputOTPSeparator>
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </LabelInputContainer>

        <button
          className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset]"
          type="submit"
          disabled={signIn.loading || code.length !== 6}
        >
          {signIn.loading ? 'Verificando...' : 'Verificar código'} &rarr;
          <BottomGradient />
        </button>

        <p className="text-sm text-muted-foreground/80 mt-4 text-center">
          Não recebeu o código?{' '}
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendOTPCode.loading}
            className="text-primary underline hover:no-underline"
          >
            {resendOTPCode.loading ? 'Enviando...' : 'Clique para reenviar'}
          </button>
        </p>
      </form>
    </div>
  )
}

