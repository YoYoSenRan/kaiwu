"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { SetupForm } from "@/components/gateway/SetupForm"

export default function SetupPage() {
  const router = useRouter()

  const handleSuccess = useCallback(() => {
    router.push("/")
  }, [router])

  return <SetupForm onSuccess={handleSuccess} />
}
