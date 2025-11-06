import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CircleCheck,
  CircleX,
  HelpCircle,
  Timer,
} from 'lucide-react'

export const labels = [
  {
    value: 'bug',
    label: 'Bug',
  },
  {
    value: 'feature',
    label: 'Feature',
  },
  {
    value: 'documentation',
    label: 'Documentation',
  },
]

export const statuses = [
  {
    value: 'waiting',
    label: 'Waiting',
    icon: HelpCircle,
  },
  {
    value: 'pending',
    label: 'In Progress',
    icon: Timer,
  },
  {
    value: 'complete',
    label: 'Complete',
    icon: CircleCheck,
  },
  {
    value: 'failed',
    label: 'Failed',
    icon: CircleX,
  },
]

export const priorities = [
  {
    label: 'Low',
    value: 'low',
    icon: ArrowDown,
  },
  {
    label: 'Medium',
    value: 'medium',
    icon: ArrowRight,
  },
  {
    label: 'High',
    value: 'high',
    icon: ArrowUp,
  },
]
