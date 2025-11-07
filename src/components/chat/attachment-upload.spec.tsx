/**
 * @file attachment-upload.spec.ts
 * @description Unit tests for AttachmentUpload component
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttachmentUpload } from '../components/chat/attachment-upload'

// Mock fetch
global.fetch = vi.fn()

describe('AttachmentUpload', () => {
  const mockOnUploadComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render upload button', () => {
    render(<AttachmentUpload onUploadComplete={mockOnUploadComplete} />)
    expect(screen.getByText('Adicionar arquivo')).toBeInTheDocument()
  })

  it('should validate file size', async () => {
    const user = userEvent.setup()
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    })

    render(<AttachmentUpload onUploadComplete={mockOnUploadComplete} maxSizeMB={10} />)

    const input = screen.getByLabelText(/adicionar arquivo/i) as HTMLInputElement
    await user.upload(input, largeFile)

    // Should show error or not upload
    expect(mockOnUploadComplete).not.toHaveBeenCalled()
  })

  it('should upload valid file', async () => {
    const user = userEvent.setup()
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: 'https://storage.example.com/test.jpg' }),
    })

    render(<AttachmentUpload onUploadComplete={mockOnUploadComplete} />)

    const input = screen.getByLabelText(/adicionar arquivo/i) as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/storage'),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })
  })

  it('should handle upload errors', async () => {
    const user = userEvent.setup()
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

    ;(global.fetch as any).mockRejectedValueOnce(new Error('Upload failed'))

    render(<AttachmentUpload onUploadComplete={mockOnUploadComplete} />)

    const input = screen.getByLabelText(/adicionar arquivo/i) as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/erro/i)).toBeInTheDocument()
    })
  })

  it('should limit number of files', async () => {
    const user = userEvent.setup()
    const files = Array.from({ length: 6 }, (_, i) =>
      new File(['content'], `test${i}.jpg`, { type: 'image/jpeg' }),
    )

    render(<AttachmentUpload onUploadComplete={mockOnUploadComplete} maxFiles={5} />)

    const input = screen.getByLabelText(/adicionar arquivo/i) as HTMLInputElement
    await user.upload(input, files)

    // Should only accept 5 files
    expect(mockOnUploadComplete).toHaveBeenCalledTimes(1)
    const uploadedFiles = mockOnUploadComplete.mock.calls[0][0]
    expect(uploadedFiles.length).toBeLessThanOrEqual(5)
  })
})

