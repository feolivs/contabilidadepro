'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileImage, Loader2 } from 'lucide-react'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fill?: boolean
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  onLoad?: () => void
  onError?: () => void
  fallback?: React.ReactNode
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  priority = false,
  quality = 75,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  onLoad,
  onError,
  fallback
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  if (hasError) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-md",
        className
      )}>
        {fallback || (
          <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
            <FileImage className="h-8 w-8 mb-2" />
            <span className="text-sm">Imagem não encontrada</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          fill ? "object-cover" : ""
        )}
      />
    </div>
  )
}

// Componente específico para avatars
interface AvatarImageProps {
  src?: string
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  className?: string
}

export function AvatarImage({ 
  src, 
  alt, 
  size = 'md', 
  fallback,
  className 
}: AvatarImageProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const sizePx = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96
  }

  if (!src) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted rounded-full text-muted-foreground font-medium",
        sizeClasses[size],
        className
      )}>
        {fallback || alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={sizePx[size]}
      height={sizePx[size]}
      className={cn("rounded-full", sizeClasses[size], className)}
      quality={90}
      fallback={
        <div className="flex items-center justify-center bg-muted rounded-full text-muted-foreground font-medium w-full h-full">
          {fallback || alt.charAt(0).toUpperCase()}
        </div>
      }
    />
  )
}

// Componente para documentos/PDFs
interface DocumentImageProps {
  src: string
  alt: string
  className?: string
  aspectRatio?: 'square' | 'video' | 'document'
  showOverlay?: boolean
}

export function DocumentImage({ 
  src, 
  alt, 
  className,
  aspectRatio = 'document',
  showOverlay = true
}: DocumentImageProps) {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    document: 'aspect-[3/4]'
  }

  return (
    <div className={cn(
      "relative group overflow-hidden rounded-lg border bg-muted",
      aspectClasses[aspectRatio],
      className
    )}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        quality={85}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="transition-transform duration-300 group-hover:scale-105"
        fallback={
          <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
            <FileImage className="h-12 w-12 mb-2" />
            <span className="text-sm text-center">Prévia não disponível</span>
          </div>
        }
      />
      
      {showOverlay && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
      )}
    </div>
  )
}

// Componente para galeria de imagens
interface ImageGalleryProps {
  images: Array<{
    src: string
    alt: string
    caption?: string
  }>
  className?: string
  columns?: 2 | 3 | 4
}

export function ImageGallery({ 
  images, 
  className,
  columns = 3
}: ImageGalleryProps) {
  const gridClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn(
      "grid gap-4",
      gridClasses[columns],
      className
    )}>
      {images.map((image, index) => (
        <div key={index} className="space-y-2">
          <DocumentImage
            src={image.src}
            alt={image.alt}
            aspectRatio="square"
          />
          {image.caption && (
            <p className="text-sm text-muted-foreground text-center">
              {image.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// Hook para otimização de imagens
export function useImageOptimization() {
  const generateBlurDataURL = (width: number = 10, height: number = 10) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(0, 0, width, height)
    }
    
    return canvas.toDataURL()
  }

  const getOptimalSizes = (breakpoints: Record<string, number>) => {
    return Object.entries(breakpoints)
      .map(([key, value]) => `(max-width: ${key}px) ${value}vw`)
      .join(', ')
  }

  return {
    generateBlurDataURL,
    getOptimalSizes,
    defaultSizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  }
}
