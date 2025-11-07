import { Suspense } from 'react'
import { SignupFormDemo } from '@/components/auth/signup-form-demo'
import { AppConfig } from '@/config/boilerplate.config.client'

export const metadata = {
  title: `Login | ${AppConfig.name}`,
}

export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const revalidate = false
export const fetchCache = 'auto'

export default async function Page(props: {
  searchParams: Promise<{ redirect?: string; email?: string }>
}) {
  const searchParams = await props.searchParams

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div className="text-center">Carregando...</div>}>
        <SignupFormDemo redirectUrl={searchParams.redirect} />
      </Suspense>
    </div>
  )
}
