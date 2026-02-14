"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Box,
  CloseButton,
  IconButton,
  Portal,
  Stack,
  Text,
  VStack,
  useToken,
} from "@chakra-ui/react"
import { IoMdClose, IoMdCloseCircleOutline } from "react-icons/io"
import { CrossIcon } from "react-select/dist/declarations/src/components/indicators"
import { BsChatSquareDots } from "react-icons/bs"

type ToastStatus = "success" | "error" | "warning" | "info"

export type ToastOptions = {
  id?: string
  title?: string
  description?: string
  status?: ToastStatus
  colorPalette?: string
  duration?: number
  isClosable?: boolean
}

type InternalToast = {
  id: string
  title: string
  description: string
  status: ToastStatus
  colorPalette?: string
  duration: number
  isClosable: boolean
  createdAt: number
}

type ToastListener = (options: ToastOptions) => void

const listeners = new Set<ToastListener>()

const DEFAULT_DURATION = 4000

const normalizeStatus = (status?: ToastStatus, colorPalette?: string): ToastStatus => {
  const value = status ?? (colorPalette as ToastStatus)
  if (value === "success" || value === "error" || value === "warning" || value === "info") {
    return value
  }
  return "info"
}

const createInternalToast = (options: ToastOptions): InternalToast => {
  return {
    id: options.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    title: options.title ?? "",
    description: options.description ?? "",
    status: normalizeStatus(options.status, options.colorPalette),
    colorPalette: options.colorPalette,
    duration: options.duration ?? DEFAULT_DURATION,
    isClosable: options.isClosable ?? true,
    createdAt: Date.now(),
  }
}

export const toaster = {
  create: (options: ToastOptions) => {
    listeners.forEach((listener) => listener(options))
  },
}

const statusStyles: Record<ToastStatus, { bg: string; border: string }> = {
  success: { bg: "green.600", border: "green.400" },
  error: { bg: "red.600", border: "red.400" },
  warning: { bg: "orange.600", border: "orange.400" },
  info: { bg: "blue.600", border: "blue.400" },
}

type ToastCardProps = {
  toast: InternalToast
  onClose: (id: string) => void
}

const ToastCard = ({ toast, onClose }: ToastCardProps) => {
  const palette = toast.colorPalette || toast.status 
  const [bgToken, borderToken] = useToken("colors", [`${palette}.600`, `${palette}.400`])
  const fallback = statusStyles[toast.status]
  const backgroundColor = bgToken ?? fallback.bg
  const borderColor = borderToken ?? fallback.border

  return (
    <Box
      backgroundColor={backgroundColor}
      borderLeftWidth="4px"
      borderColor={borderColor}
      borderRadius="md"
      padding="3"
      color="white"
      shadow="lg"
      minWidth="280px"
      maxWidth="360px"
    >
      <Stack direction="row" justifyContent="space-between" gap="3">
        <Stack gap="1">
          {toast.title && (
            <Text fontWeight="semibold">{toast.title}</Text>
          )}
          {toast.description && (
            <Text fontSize="sm">{toast.description}</Text>
          )}
        </Stack>
        {toast.isClosable && (
            <IconButton
              size="xs"
              onClick={() => onClose(toast.id)}
            >
              <IoMdClose />
            </IconButton>
        )}
      </Stack>
    </Box>
  )}

export const Toaster = () => {
  const [toasts, setToasts] = useState<InternalToast[]>([])

  useEffect(() => {
    const listener: ToastListener = (options) => {
      const toast = createInternalToast(options)
      setToasts((current) => [...current, toast])

      if (toast.duration !== Infinity) {
        window.setTimeout(() => {
          setToasts((current) => current.filter((t) => t.id !== toast.id))
        }, toast.duration)
      }
    }

    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  const sortedToasts = useMemo(
    () => [...toasts].sort((a, b) => a.createdAt - b.createdAt),
    [toasts],
  )

  return (
    <Portal>
      <VStack
        position="fixed"
        top="4"
        left="50%"
        transform="translateX(-50%)"
        alignItems="stretch"
        gap="3"
        zIndex="toast"
      >
        {sortedToasts.map((toast) => {
          return <ToastCard key={toast.id} toast={toast} onClose={removeToast} />
        })}
      </VStack>
    </Portal>
  )
}

