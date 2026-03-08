import { Badge } from '@lombokapp/ui-toolkit/components/badge'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Input } from '@lombokapp/ui-toolkit/components/input'
import { Label } from '@lombokapp/ui-toolkit/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@lombokapp/ui-toolkit/components/select'
import { Switch } from '@lombokapp/ui-toolkit/components/switch'
import { RotateCcw } from 'lucide-react'
import React from 'react'

import type {
  CustomSettingsSchema,
  CustomSettingsSchemaProperty,
  CustomSettingsSource,
} from '@lombokapp/types'

const MASKED_VALUE = '********'

interface CustomSettingsFormProps {
  schema: CustomSettingsSchema
  values: Record<string, unknown>
  sources: Record<string, CustomSettingsSource>
  secretKeyPattern: string | null
  /** 'user' or 'folder' — affects source badge labels and reset behavior */
  level: 'user' | 'folder'
  isSaving: boolean
  onSave: (values: Record<string, unknown>) => void
  onReset: () => void
  /** For folder-level: callback to reset a single field to inherited value */
  onResetField?: (key: string) => void
}

function isSecretKey(key: string, pattern: string | null): boolean {
  if (!pattern) return false
  try {
    return new RegExp(pattern).test(key)
  } catch {
    return false
  }
}

function getSourceBadgeVariant(
  source: CustomSettingsSource,
): 'default' | 'secondary' | 'outline' {
  switch (source) {
    case 'folder':
      return 'default'
    case 'user':
      return 'secondary'
    case 'default':
      return 'outline'
  }
}

function SourceBadge({ source }: { source: CustomSettingsSource }) {
  return (
    <Badge variant={getSourceBadgeVariant(source)} className="text-[10px]">
      {source}
    </Badge>
  )
}

function FieldRenderer({
  fieldKey,
  property,
  value,
  source,
  isSecret,
  isRequired,
  onChange,
  level,
  onResetField,
}: {
  fieldKey: string
  property: CustomSettingsSchemaProperty
  value: unknown
  source: CustomSettingsSource
  isSecret: boolean
  isRequired: boolean
  onChange: (value: unknown) => void
  level: 'user' | 'folder'
  onResetField?: (key: string) => void
}) {
  const fieldId = `custom-setting-${fieldKey}`
  const canResetField =
    level === 'folder' && source === 'folder' && onResetField

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {fieldKey}
          {isRequired && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        <SourceBadge source={source} />
        {canResetField && (
          <button
            type="button"
            onClick={() => onResetField(fieldKey)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Reset to inherited value"
          >
            <RotateCcw className="size-3" />
            Reset
          </button>
        )}
      </div>
      {property.description && (
        <p className="text-xs text-muted-foreground">{property.description}</p>
      )}
      <FieldInput
        fieldId={fieldId}
        property={property}
        value={value}
        isSecret={isSecret}
        onChange={onChange}
      />
    </div>
  )
}

function FieldInput({
  fieldId,
  property,
  value,
  isSecret,
  onChange,
}: {
  fieldId: string
  property: CustomSettingsSchemaProperty
  value: unknown
  isSecret: boolean
  onChange: (value: unknown) => void
}) {
  switch (property.type) {
    case 'string': {
      if (property.enum) {
        return (
          <Select
            value={String(value ?? '')}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger id={fieldId} className="w-full">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {property.enum.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }
      return (
        <Input
          id={fieldId}
          type={isSecret ? 'password' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            property.default != null ? String(property.default) : undefined
          }
          minLength={property.minLength}
          maxLength={property.maxLength}
        />
      )
    }
    case 'number':
    case 'integer': {
      return (
        <Input
          id={fieldId}
          type="number"
          value={value != null ? String(value) : ''}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(null)
              return
            }
            const num =
              property.type === 'integer' ? parseInt(raw, 10) : parseFloat(raw)
            if (!isNaN(num)) {
              onChange(num)
            }
          }}
          placeholder={
            property.default != null ? String(property.default) : undefined
          }
          min={property.minimum}
          max={property.maximum}
          step={property.type === 'integer' ? 1 : undefined}
        />
      )
    }
    case 'boolean': {
      return (
        <Switch
          id={fieldId}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
        />
      )
    }
    case 'array': {
      return (
        <ArrayFieldInput
          fieldId={fieldId}
          value={value}
          itemType={property.items?.type ?? 'string'}
          onChange={onChange}
        />
      )
    }
    default:
      return (
        <Input
          id={fieldId}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

function ArrayFieldInput({
  fieldId,
  value,
  itemType,
  onChange,
}: {
  fieldId: string
  value: unknown
  itemType: string
  onChange: (value: unknown) => void
}) {
  const items = Array.isArray(value) ? value : []

  const handleItemChange = (index: number, newValue: string) => {
    const updated = [...items]
    if (itemType === 'number' || itemType === 'integer') {
      const num =
        itemType === 'integer' ? parseInt(newValue, 10) : parseFloat(newValue)
      updated[index] = isNaN(num) ? newValue : num
    } else if (itemType === 'boolean') {
      updated[index] = newValue === 'true'
    } else {
      updated[index] = newValue
    }
    onChange(updated)
  }

  const handleAdd = () => {
    const defaultValue =
      itemType === 'number' || itemType === 'integer'
        ? 0
        : itemType === 'boolean'
          ? false
          : ''
    onChange([...items, defaultValue])
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            id={`${fieldId}-${index}`}
            type={
              itemType === 'number' || itemType === 'integer'
                ? 'number'
                : 'text'
            }
            value={String(item ?? '')}
            onChange={(e) => handleItemChange(index, e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRemove(index)}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
        Add item
      </Button>
    </div>
  )
}

export function CustomSettingsForm({
  schema,
  values,
  sources,
  secretKeyPattern,
  level,
  isSaving,
  onSave,
  onReset,
  onResetField,
}: CustomSettingsFormProps) {
  // Track local edits — start from the server values
  const [localValues, setLocalValues] = React.useState<Record<string, unknown>>(
    () => ({ ...values }),
  )
  // Track which secret fields have been modified by the user
  const [modifiedSecrets, setModifiedSecrets] = React.useState<Set<string>>(
    () => new Set(),
  )

  // Re-sync local state when server values change (after save/reset)
  const prevValuesRef = React.useRef(values)
  React.useEffect(() => {
    if (prevValuesRef.current !== values) {
      setLocalValues({ ...values })
      setModifiedSecrets(new Set())
      prevValuesRef.current = values
    }
  }, [values])

  const propertyEntries = Object.entries(schema.properties)
  const requiredKeys = new Set(schema.required ?? [])

  const handleFieldChange = (key: string, value: unknown) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
    if (isSecretKey(key, secretKeyPattern)) {
      setModifiedSecrets((prev) => new Set(prev).add(key))
    }
  }

  const handleSave = () => {
    const submitValues: Record<string, unknown> = {}
    for (const [key] of propertyEntries) {
      const localVal = localValues[key]
      if (isSecretKey(key, secretKeyPattern) && !modifiedSecrets.has(key)) {
        // Secret not modified — send masked value to preserve existing
        submitValues[key] = MASKED_VALUE
      } else {
        submitValues[key] = localVal ?? null
      }
    }
    onSave(submitValues)
  }

  // Check if anything changed from server values
  const hasChanges = propertyEntries.some(([key]) => {
    const serverVal = values[key]
    const localVal = localValues[key]
    if (isSecretKey(key, secretKeyPattern)) {
      return modifiedSecrets.has(key)
    }
    return JSON.stringify(serverVal) !== JSON.stringify(localVal)
  })

  // Check if any values are explicitly set (not all defaults)
  const hasCustomValues = Object.values(sources).some((s) => s !== 'default')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Settings</CardTitle>
        <CardDescription>
          {level === 'user'
            ? 'Configure app-specific settings for your account.'
            : 'Override app settings for this folder. Unset values inherit from your user-level settings.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {propertyEntries.map(([key, property]) => (
            <FieldRenderer
              key={key}
              fieldKey={key}
              property={property}
              value={localValues[key]}
              source={sources[key] ?? 'default'}
              isSecret={isSecretKey(key, secretKeyPattern)}
              isRequired={requiredKeys.has(key)}
              onChange={(value) => handleFieldChange(key, value)}
              level={level}
              onResetField={onResetField}
            />
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {hasCustomValues && (
              <Button variant="outline" onClick={onReset} disabled={isSaving}>
                {level === 'user'
                  ? 'Reset to Defaults'
                  : 'Revert to User Settings'}
              </Button>
            )}
          </div>
          {hasCustomValues && (
            <p className="text-xs text-muted-foreground">
              {level === 'user'
                ? 'Using custom settings'
                : 'Has folder-level overrides'}
            </p>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
