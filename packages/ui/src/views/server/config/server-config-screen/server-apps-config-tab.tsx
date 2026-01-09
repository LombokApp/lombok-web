import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Card } from '@lombokapp/ui-toolkit/components/card/card'
import { Icons } from '@lombokapp/ui-toolkit/components/icons/icons'
import { Input } from '@lombokapp/ui-toolkit/components/input/input'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import React from 'react'

import { $api } from '@/src/services/api'

export function ServerAppsConfigTab() {
  const [isInstalling, setIsInstalling] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const installAppFromZipMutation = $api.useMutation(
    'post',
    '/api/v1/server/apps/install',
    {
      onSuccess: () => {
        toast({
          title: 'App installed successfully',
          description: 'The app bundle has been installed.',
        })
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      },
      onError: (error) => {
        toast({
          title: 'Failed to install app',
          description:
            error instanceof Error
              ? error.message
              : 'An error occurred while installing the app bundle.',
          variant: 'destructive',
        })
      },
    },
  )

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null
      if (file) {
        // Validate file type
        if (
          file.type !== 'application/zip' &&
          file.type !== 'application/x-zip-compressed' &&
          !file.name.endsWith('.zip')
        ) {
          toast({
            title: 'Invalid file type',
            description: 'Please select a zip file.',
            variant: 'destructive',
          })
          return
        }
        setSelectedFile(file)
      }
    },
    [toast],
  )

  const handleInstallAppViaUpload = React.useCallback(() => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a zip file to upload.',
        variant: 'destructive',
      })
      return
    }

    setIsInstalling(true)
    const formData = new FormData()
    formData.append('file', selectedFile)

    void installAppFromZipMutation
      .mutateAsync({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        body: formData as any,
      })
      .finally(() => {
        setIsInstalling(false)
      })
  }, [selectedFile, installAppFromZipMutation, toast])

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Install App Bundle via Upload</CardTitle>
          <CardDescription>
            Upload a zip file containing an app bundle to install it. The zip
            file should contain a valid app configuration with config.json and
            .publicKey files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="app-zip-upload"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                App Bundle (ZIP file)
              </label>
              <Input
                id="app-zip-upload"
                ref={fileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleFileChange}
                disabled={isInstalling}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} (
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            onClick={handleInstallAppViaUpload}
            disabled={isInstalling || !selectedFile}
            className="flex items-center gap-2"
          >
            {isInstalling && <Icons.spinner className="size-4 animate-spin" />}
            {isInstalling ? 'Installing App...' : 'Install App Bundle'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
