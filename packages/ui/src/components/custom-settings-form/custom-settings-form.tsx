import type {
  CustomSettingsSchema,
  CustomSettingsSchemaProperty,
  CustomSettingsSource,
  JsonSchema07DiscriminatedObjectItem,
  JsonSchema07ObjectItem,
  JsonSchema07ObjectItemProperty,
  JsonSchema07PrimitiveProperty,
} from '@lombokapp/types'
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
import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import React from 'react'

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
  if (!pattern) {
    return false
  }
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
  const items: unknown[] = Array.isArray(value) ? value : []

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
            value={String(item)}
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
function PrimitiveFieldInput({
  id,
  property,
  value,
  isSecret,
  onChange,
}: {
  id: string
  property: JsonSchema07PrimitiveProperty
  value: unknown
  isSecret: boolean
  onChange: (value: unknown) => void
}) {
  switch (property.type) {
    case 'string': {
      if (property.enum) {
        return (
          <Select
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            value={String(value ?? '')}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger id={id} className="w-full">
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
          id={id}
          type={isSecret ? 'password' : 'text'}
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
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
          id={id}
          type="number"
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
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
          id={id}
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked)}
        />
      )
    }
  }
}

/** Input for a property within an object item — handles both primitives and arrays. */
function ObjectItemPropertyInput({
  id,
  property,
  value,
  isSecret,
  onChange,
}: {
  id: string
  property: JsonSchema07ObjectItemProperty
  value: unknown
  isSecret: boolean
  onChange: (value: unknown) => void
}) {
  if (property.type === 'array') {
    return (
      <ArrayFieldInput
        fieldId={id}
        value={value}
        itemType={property.items.type}
        onChange={onChange}
      />
    )
  }
  return (
    <PrimitiveFieldInput
      id={id}
      property={property}
      value={value}
      isSecret={isSecret}
      onChange={onChange}
    />
  )
}

/** Build a default-valued item from an object item schema. */
function buildDefaultItem(
  propertyEntries: [string, JsonSchema07ObjectItemProperty][],
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const newItem: Record<string, unknown> = {}
  for (const [key, prop] of propertyEntries) {
    if (overrides && key in overrides) {
      newItem[key] = overrides[key]
    } else if (prop.default !== undefined) {
      newItem[key] = prop.default
    } else if (prop.type === 'array') {
      newItem[key] = []
    } else if (prop.type === 'number' || prop.type === 'integer') {
      newItem[key] = 0
    } else if (prop.type === 'boolean') {
      newItem[key] = false
    } else {
      newItem[key] = ''
    }
  }
  return newItem
}

/** Renders a single object item card with its property fields. */
function ObjectItemCard({
  fieldId,
  index,
  item,
  propertyEntries,
  requiredKeys,
  secretKeyPattern,
  discriminatorKey,
  label,
  onPropertyChange,
  onRemove,
}: {
  fieldId: string
  index: number
  item: Record<string, unknown>
  propertyEntries: [string, JsonSchema07ObjectItemProperty][]
  requiredKeys: Set<string>
  secretKeyPattern: string | null
  discriminatorKey?: string
  label?: string
  onPropertyChange: (propKey: string, propValue: unknown) => void
  onRemove: () => void
}) {
  return (
    <div className="relative rounded-md border bg-muted/30 p-3 pt-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label ?? `#${index + 1}`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        {propertyEntries.map(([propKey, propDef]) => {
          // Hide the discriminator field — it's shown in the card header
          if (propKey === discriminatorKey) {
            return null
          }
          return (
            <div key={propKey} className="space-y-1">
              <Label
                htmlFor={`${fieldId}-${index}-${propKey}`}
                className="text-xs"
              >
                {propKey}
                {requiredKeys.has(propKey) && (
                  <span className="ml-0.5 text-destructive">*</span>
                )}
              </Label>
              {propDef.description && (
                <p className="text-[10px] text-muted-foreground">
                  {propDef.description}
                </p>
              )}
              <ObjectItemPropertyInput
                id={`${fieldId}-${index}-${propKey}`}
                property={propDef}
                value={item[propKey]}
                isSecret={isSecretKey(propKey, secretKeyPattern)}
                onChange={(v) => onPropertyChange(propKey, v)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ObjectArrayFieldInput({
  fieldId,
  value,
  itemSchema,
  secretKeyPattern,
  onChange,
}: {
  fieldId: string
  value: unknown
  itemSchema: JsonSchema07ObjectItem
  secretKeyPattern: string | null
  onChange: (value: unknown) => void
}) {
  const items: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : []
  const requiredKeys = new Set(itemSchema.required ?? [])
  const propertyEntries = Object.entries(itemSchema.properties)
  const handleItemPropertyChange = (
    index: number,
    propKey: string,
    propValue: unknown,
  ) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [propKey]: propValue } : item,
    )
    onChange(updated)
  }

  const handleAdd = () => {
    onChange([...items, buildDefaultItem(propertyEntries)])
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <ObjectItemCard
          key={index}
          fieldId={fieldId}
          index={index}
          item={item}
          propertyEntries={propertyEntries}
          requiredKeys={requiredKeys}
          secretKeyPattern={secretKeyPattern}
          onPropertyChange={(k, v) => handleItemPropertyChange(index, k, v)}
          onRemove={() => handleRemove(index)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="gap-1"
      >
        <Plus className="size-3.5" />
        Add item
      </Button>
    </div>
  )
}

function DiscriminatedObjectArrayFieldInput({
  fieldId,
  value,
  itemSchema,
  secretKeyPattern,
  onChange,
}: {
  fieldId: string
  value: unknown
  itemSchema: JsonSchema07DiscriminatedObjectItem
  secretKeyPattern: string | null
  onChange: (value: unknown) => void
}) {
  const items: Record<string, unknown>[] = Array.isArray(value)
    ? (value as Record<string, unknown>[])
    : []
  const { discriminator, oneOf } = itemSchema

  // Build a map from discriminator value to its variant schema
  const variantMap = React.useMemo(() => {
    const map = new Map<string, JsonSchema07ObjectItem>()
    for (const variant of oneOf) {
      const discProp = variant.properties[discriminator]
      if (discProp?.type === 'string' && discProp.enum?.length) {
        for (const val of discProp.enum) {
          map.set(val, variant)
        }
      }
    }
    return map
  }, [discriminator, oneOf])

  const variantKeys = React.useMemo(() => [...variantMap.keys()], [variantMap])

  const getVariantForItem = (item: Record<string, unknown>) => {
    const discValue = (item[discriminator] as string | undefined) ?? ''
    return variantMap.get(discValue)
  }

  const handleItemPropertyChange = (
    index: number,
    propKey: string,
    propValue: unknown,
  ) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [propKey]: propValue } : item,
    )
    onChange(updated)
  }

  const handleAdd = (variantKey: string) => {
    const variant = variantMap.get(variantKey)
    if (!variant) {
      return
    }
    const entries = Object.entries(variant.properties)
    const newItem = buildDefaultItem(entries, { [discriminator]: variantKey })
    onChange([...items, newItem])
  }

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const [addMenuOpen, setAddMenuOpen] = React.useState(false)

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const variant = getVariantForItem(item)
        if (!variant) {
          return null
        }
        const propertyEntries = Object.entries(variant.properties)
        const requiredKeys = new Set(variant.required ?? [])
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const discValue = String(item[discriminator] ?? '')

        return (
          <ObjectItemCard
            key={index}
            fieldId={fieldId}
            index={index}
            item={item}
            propertyEntries={propertyEntries}
            requiredKeys={requiredKeys}
            secretKeyPattern={secretKeyPattern}
            discriminatorKey={discriminator}
            label={discValue}
            onPropertyChange={(k, v) => handleItemPropertyChange(index, k, v)}
            onRemove={() => handleRemove(index)}
          />
        )
      })}
      <div className="relative">
        {addMenuOpen ? (
          <div className="flex flex-wrap gap-1.5">
            {variantKeys.map((key) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleAdd(key)
                  setAddMenuOpen(false)
                }}
              >
                {key}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAddMenuOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // If only one variant, add it directly
              if (variantKeys.length === 1) {
                handleAdd(variantKeys[0] ?? '')
              } else {
                setAddMenuOpen(true)
              }
            }}
            className="gap-1"
          >
            <Plus className="size-3.5" />
            Add provider
          </Button>
        )}
      </div>
    </div>
  )
}

function FieldInput({
  fieldId,
  property,
  value,
  isSecret,
  secretKeyPattern,
  onChange,
}: {
  fieldId: string
  property: CustomSettingsSchemaProperty
  value: unknown
  isSecret: boolean
  secretKeyPattern: string | null
  onChange: (value: unknown) => void
}) {
  if (property.type !== 'array') {
    return (
      <PrimitiveFieldInput
        id={fieldId}
        property={property as JsonSchema07PrimitiveProperty}
        value={value}
        isSecret={isSecret}
        onChange={onChange}
      />
    )
  }

  if ('discriminator' in property.items) {
    return (
      <DiscriminatedObjectArrayFieldInput
        fieldId={fieldId}
        value={value}
        itemSchema={
          property.items as unknown as JsonSchema07DiscriminatedObjectItem
        }
        secretKeyPattern={secretKeyPattern}
        onChange={onChange}
      />
    )
  }

  if (property.items.type === 'object') {
    return (
      <ObjectArrayFieldInput
        fieldId={fieldId}
        value={value}
        itemSchema={property.items as JsonSchema07ObjectItem}
        secretKeyPattern={secretKeyPattern}
        onChange={onChange}
      />
    )
  }

  return (
    <ArrayFieldInput
      fieldId={fieldId}
      value={value}
      itemType={property.items.type}
      onChange={onChange}
    />
  )
}

function FieldRenderer({
  fieldKey,
  property,
  value,
  source,
  isSecret,
  isRequired,
  secretKeyPattern,
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
  secretKeyPattern: string | null
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
        secretKeyPattern={secretKeyPattern}
        onChange={onChange}
      />
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
              secretKeyPattern={secretKeyPattern}
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
