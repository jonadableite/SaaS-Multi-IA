'use client'

import { useState, useRef } from 'react'
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/utils/cn'

interface UploadedFile {
  id: string
  file: File
  url: string
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

interface AttachmentUploadProps {
  onUploadComplete: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
}

export function AttachmentUpload({
  onUploadComplete,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ['image/*', 'video/*', '.pdf', '.doc', '.docx', '.txt'],
}: AttachmentUploadProps) {
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => {
      const maxSize = maxSizeMB * 1024 * 1024
      if (file.size > maxSize) {
        alert(`${file.name} é muito grande. Máximo ${maxSizeMB}MB.`)
        return false
      }
      return true
    }).slice(0, maxFiles - uploads.length)

    for (const file of validFiles) {
      const uploadId = `upload_${Date.now()}_${Math.random()}`
      const upload: UploadedFile = {
        id: uploadId,
        file,
        url: '',
        progress: 0,
        status: 'uploading',
      }

      setUploads(prev => [...prev, upload])

      try {
        // Upload file to storage
        const formData = new FormData()
        formData.append('file', file)
        formData.append('context', 'user')
        // identifier will be set by backend based on session

        const response = await fetch('/api/storage', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        const result = await response.json()

        setUploads(prev =>
          prev.map(u =>
            u.id === uploadId
              ? {
                  ...u,
                  url: result.url,
                  progress: 100,
                  status: 'success',
                }
              : u
          )
        )

        onUploadComplete([...uploads, {
          ...upload,
          url: result.url,
          progress: 100,
          status: 'success',
        }])
      } catch (error) {
        setUploads(prev =>
          prev.map(u =>
            u.id === uploadId
              ? {
                  ...u,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : u
          )
        )
      }
    }
  }

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id))
    onUploadComplete(uploads.filter(u => u.id !== id))
  }

  return (
    <div
      ref={dropZoneRef}
      className={cn(
        'border-2 border-dashed rounded-lg p-4 transition-all',
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          : 'border-gray-300 dark:border-gray-700'
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files)
        handleFiles(files)
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={acceptedTypes.join(',')}
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          handleFiles(files)
          e.target.value = ''
        }}
      />

      <div className="space-y-2">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            className="flex items-center space-x-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {upload.file.name}
                </p>
                {upload.status === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                {upload.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                )}
              </div>
              {upload.status === 'uploading' && (
                <Progress value={upload.progress} className="h-1" />
              )}
              {upload.status === 'error' && upload.error && (
                <p className="text-xs text-red-500">{upload.error}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeUpload(upload.id)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {uploads.length < maxFiles && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Adicionar arquivo
          </Button>
        )}
      </div>
    </div>
  )
}

